"""초보자를 위한 메뉴 및 첨부파일 서버. 실행: uvicorn main_file_eazy:a --reload"""

import re  # 서버에 저장된 파일명의 형식을 확인합니다.
import shutil  # 업로드 파일을 서버에 복사합니다.
from pathlib import Path  # 파일과 폴더의 경로를 만듭니다.
from uuid import uuid4  # 파일명이 겹치지 않도록 새 이름을 만듭니다.

from fastapi import FastAPI, File, Form, HTTPException, UploadFile  # 앱, 폼, 파일, HTTP 오류
from fastapi.middleware.cors import CORSMiddleware  # 다른 주소의 프런트엔드 요청을 허용합니다.
from fastapi.responses import FileResponse  # 파일 내용과 정보를 클라이언트에 보냅니다.
from pydantic import BaseModel  # 메뉴와 채팅 데이터의 타입을 검사합니다.

from service import data, rag_google_v1  # 메뉴 저장과 AI 채팅을 담당합니다.


a = FastAPI()
a.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 메뉴 데이터를 검사할 때 사용하는 모델입니다.
class Menu(BaseModel):
    id: int
    name: str
    calories: int
    description: str


class ChatRequest(BaseModel):
    question: str


# 저장되는 파일에는 확장자가 없고 원래 파일명은 메뉴 JSON에 기록됩니다.
UPLOAD_DIR = Path(__file__).resolve().parent / "storage" / "uploads"

# 확장자로 이미지의 종류를 찾아 미리보기에 사용합니다.
IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
}


@a.get("/")
def home():
    return {"message": "환영합니다."}


@a.get("/짜장면")
def make_zzang():
    return {"message": "짜장면 여기 있어요", "cnt": 2}


@a.get("/menus")
def menus():
    return data.get_all()


@a.get("/menus/search")
def menus_search(word: str = ""):
    return data.search_Word(word)


def save_menu(menu, file):
    # 1. 파일이 없다면 첨부파일 정보 없이 메뉴만 저장합니다.
    attachment = None
    upload_path = None

    if file is not None:
        # 폴더가 없다면 만들고 임의의 서버 저장 이름을 정합니다.
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_filename = uuid4().hex
        upload_path = UPLOAD_DIR / stored_filename

        # xb는 새 파일을 만들며, 같은 이름의 파일을 덮어쓰지 않습니다.
        destination = upload_path.open("xb")
        try:
            with destination:
                shutil.copyfileobj(file.file, destination)
        except Exception:
            # 복사하다 실패하면 불완전한 파일을 지운 뒤 오류를 다시 전달합니다.
            upload_path.unlink(missing_ok=True)
            raise

        # 원래 이름은 다운로드할 때, 저장 이름은 서버에서 파일을 찾을 때 사용합니다.
        attachment = {
            "filename": file.filename,
            "stored_filename": stored_filename,
        }

    # 2. 메뉴와 첨부파일 정보를 JSON에 기록합니다.
    try:
        data.add_menu(menu, attachment)
    except Exception:
        # 메뉴 저장이 실패하면 먼저 저장한 첨부파일도 지웁니다.
        if upload_path is not None:
            upload_path.unlink(missing_ok=True)
        raise


@a.post("/menus")
def add_menus(
    id: int = Form(...),
    name: str = Form(...),
    calories: int = Form(...),
    description: str = Form(""),
    file: UploadFile | None = File(None),
):
    # Form은 폼 값을, File은 첨부파일을 받습니다. ...은 필수라는 뜻입니다.
    # FastAPI가 id와 calories를 정수로 검사하고 잘못된 값에는 422를 응답합니다.
    # description과 file은 선택 사항이며, 필드명은 클라이언트와 같아야 합니다.
    # 일반 def 엔드포인트는 FastAPI가 스레드에서 실행하므로 파일 저장 중에도
    # 다른 비동기 요청을 처리할 수 있습니다.
    menu = Menu(id=id, name=name, calories=calories, description=description)
    save_menu(menu, file)
    return {"message": "ok"}


@a.get("/menus/{menu_id}/attachment")
def get_menu_attachment(menu_id: int, preview: bool = False):
    # 메뉴에서 원본 파일명과 서버 저장 파일명을 꺼냅니다.
    menu = data.get_one(menu_id)
    attachment = menu.get("attachment") if menu else None
    if not isinstance(attachment, dict):
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다.")

    filename = attachment.get("filename")
    stored_filename = attachment.get("stored_filename")
    if not isinstance(filename, str) or not isinstance(stored_filename, str):
        raise HTTPException(status_code=404, detail="첨부파일 정보를 찾을 수 없습니다.")

    # 서버에서 만든 UUID 이름만 허용하여 다른 경로의 파일을 읽지 못하게 합니다.
    if not re.fullmatch(r"[0-9a-f]{32}", stored_filename):
        raise HTTPException(status_code=404, detail="첨부파일 정보를 찾을 수 없습니다.")

    upload_path = UPLOAD_DIR / stored_filename
    if not upload_path.is_file():
        raise HTTPException(status_code=404, detail="저장된 첨부파일을 찾을 수 없습니다.")

    # 기본은 파일 다운로드입니다.
    media_type = "application/octet-stream"
    disposition = "attachment"

    if preview:
        # 예: 사진.PNG -> .png -> image/png. 목록에 없는 확장자는 None입니다.
        extension = Path(filename).suffix.lower()
        media_type = IMAGE_TYPES.get(extension)
        if media_type is None:
            raise HTTPException(status_code=415, detail="미리보기를 지원하지 않는 파일입니다.")
        disposition = "inline"

    # upload_path는 실제 파일 위치입니다.
    # filename은 브라우저에 알려 줄 원본 이름이므로 확장자도 함께 전달됩니다.
    return FileResponse(
        upload_path,
        media_type=media_type,
        filename=filename,
        content_disposition_type=disposition,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@a.delete("/menus/{menu_id}")
def delete_menu(menu_id: int):
    result = data.delete_menu(menu_id)
    if result is None:
        return {"message": "삭제된거 없어요"}
    return {"message": "삭제했습니다."}


@a.get("/menus/{id}")
def get_one_menu(id: int):
    result = data.get_one(id)
    if result is None:
        return {"message": "no"}
    return result


@a.put("/menus")
def update_menu(menu: Menu):
    data.update_one(menu)
    return {"message": "ok"}


@a.post("/menus/recommend/{id}")
def update_recommend(id: int):
    data.update_recommend(id)
    return {"message": "ok"}


@a.post("/chat")
def chatting(request: ChatRequest):
    answer = rag_google_v1.service_chat(request.question)
    return {"answer": answer}
