## 역할 : 클라이언트로 부터 요청이 오면 요청을 받고 응답해 주는 역할..

import json  # 잘못된 JSON을 읽을 때 발생하는 오류를 구분합니다.
import re  # 저장된 파일명이 안전한 식별자인지 확인합니다.
import shutil  # 업로드된 파일의 내용을 저장할 파일로 복사합니다.
from pathlib import Path  # 운영체제에 맞게 파일 및 디렉토리 경로를 만듭니다.
from uuid import uuid4  # 파일 이름이 겹치지 않도록 임의의 식별자를 생성합니다.

from fastapi import FastAPI, HTTPException, Request  # 앱 생성, HTTP 오류 응답, 요청 읽기
from fastapi.exceptions import RequestValidationError  # 요청 데이터 검증 실패를 422 응답으로 전달
from fastapi.responses import FileResponse  # 저장된 파일을 HTTP 응답으로 전송
from service import data, rag_google_v1  # 메뉴 저장 서비스와 AI 채팅 서비스
from fastapi.middleware.cors import CORSMiddleware  # 다른 출처의 프런트엔드 요청을 허용
from pydantic import BaseModel, ValidationError  # 데이터 모델과 모델 검증 오류
from starlette.concurrency import run_in_threadpool  # 동기 파일 저장 작업을 별도 스레드에서 실행
from starlette.datastructures import UploadFile  # multipart 요청에 포함된 업로드 파일 타입
# from pydantic import Field

a = FastAPI()


# CORS정책...
# 파이썬 서버가.. 서버를 서비스 할 때 누구나 제공하겠다 하면  * 로 허용
# 서비스를 서비스 할 때.. 허용한 사람에게만 하겠다.. origins 등으로 설정
# 기준은 서비스를 허용할 범위...
a.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  #오리진과 내 서버의 주소가 달라도 즉 출저가 달라도 허용할께
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 로비로 들어오는 서비스를 하나 제공하자.
@a.get("/")     # 첫 화면
def home():
    print("클라이언트가 /를 요청하였습니다.")
    return {
        "message":"환영합니다."
    }

@a.get("/짜장면")
def makeZzang():
    print("짜장면을 만드는 중입니다.")
    return {
        "message" : "짜장면 여기 있어요",
        "cnt" : 2
    }

@a.get("/menus")  #서비스 이름(요청): /menus   방법 get (조회 의도가 있다.)
def menus():
    return data.get_all()  
    # data객체의 get_all함수에게 자료를 조회해 달라고 요청
    # 그 요청에 대한 응답을 받아서 클라이언트에 응답을 함.
    # 응답 타입이 리스트이다.. 그리고 그 리스트에는 딕셔너리 타입  > json으로 응답

@a.get("/menus/search")
def menus_search(word:str =""):
    print('menus_search 진입함')
    return data.search_Word(word)


## 클라이언트가 보낸 객체를 파이썬은 객체 구조를 이해 못한다.
## BaseModel은  Menu 객체의 변수에 값을 저장할 때. 타입이 맞는지 검사하는 도구
## id변수에는 정수, name 문자열 ...
class Menu(BaseModel):
    id:int
    name:str
    calories : int
    description : str

# class Menu(BaseModel):
#     id: int
#     name: str = Field(min_length=6, max_length=20)
#     calories: int = Field(ge=0)
#     description: str


# main_file.py가 있는 backend 디렉토리 아래에 업로드 파일을 저장합니다.
UPLOAD_DIR = Path(__file__).resolve().parent / "storage" / "uploads"
#해당 딕셔너리에서 키값으로 확장자를 확인하여 미리보기용 media_type을 결정합니다.
IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
}


def save_menu(menu, file):
    # 첨부파일은 선택 사항이므로 파일이 없으면 메뉴 정보만 저장합니다.
    attachment = None
    upload_path = None
    if file is not None:
        # 업로드 디렉토리를 필요할 때 만들고, 원본 파일명 대신 임의의 이름을 사용합니다.
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_filename = uuid4().hex
        upload_path = UPLOAD_DIR / stored_filename
        # xb는 새 파일만 생성하므로 같은 이름의 파일을 덮어쓰지 않습니다.
        destination = upload_path.open("xb")
        try:
            with destination:
                shutil.copyfileobj(file.file, destination)
        except Exception:
            # 복사 도중 실패하면 불완전한 파일을 지우고 오류를 다시 전달합니다.
            upload_path.unlink(missing_ok=True)
            raise
        # 예: 사진.jpg를 UUID 이름으로 저장해도 원본 이름을 잊지 않도록 둘 다 기록합니다.
        # filename은 사용자가 올린 이름(확장자 포함), stored_filename은 서버의 실제 파일명입니다.
        attachment = {"filename": file.filename, "stored_filename": stored_filename}

    try:
        data.add_menu(menu, attachment)
    except Exception:
        # 메뉴 저장에 실패했을 때 이미 복사한 첨부파일도 정리합니다.
        if upload_path is not None:
            upload_path.unlink(missing_ok=True)
        raise


def validate_menu(values):
    try:
        # JSON 또는 폼 필드를 동일한 Menu 모델로 검증하고 타입을 변환합니다.
        return Menu.model_validate(values)
    except ValidationError as exc:
        # FastAPI가 요청 검증 오류를 422 응답으로 처리하도록 전달합니다.
        raise RequestValidationError(exc.errors(include_url=False, include_context=False)) from exc


@a.post("/menus")
async def add_menus(request: Request):
    # Content-Type의 boundary 등 부가 정보는 제외하고 요청 본문의 종류를 구분합니다.
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type == "application/json":
        # 기존 클라이언트의 JSON 등록 요청도 계속 지원합니다.
        try:
            values = await request.json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise HTTPException(status_code=400, detail="Invalid JSON")
        # 파일과 JSON 저장은 동기 작업이므로 이벤트 루프를 막지 않도록 스레드에서 실행합니다.
        await run_in_threadpool(save_menu, validate_menu(values), None)
    elif content_type == "multipart/form-data":
        # 폼을 사용하는 동안 파일을 읽고, 처리가 끝나면 업로드 자원을 닫습니다.
        async with request.form() as form:
            values = {key: form.get(key) for key in ("id", "name", "calories", "description")}
            file = form.get("file")
            # file 필드가 있다면 일반 문자열이 아닌 업로드 파일이어야 합니다.
            if file is not None and not isinstance(file, UploadFile):
                raise HTTPException(status_code=422, detail="file must be an uploaded file")
            await run_in_threadpool(save_menu, validate_menu(values), file)
    else:
        raise HTTPException(status_code=415, detail="Expected JSON or multipart/form-data")

    return {"message": "ok"}


@a.get("/menus/{menu_id}/attachment")
def get_menu_attachment(menu_id: int, preview: bool = False):
    menu = data.get_one(menu_id)
    attachment = menu.get("attachment") if menu else None
    if not isinstance(attachment, dict):
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다.")

    # filename은 다운로드할 때 제안할 원본 이름, stored_filename은 서버에서 파일을 찾을 이름입니다.
    filename = attachment.get("filename")
    stored_filename = attachment.get("stored_filename")
    if not isinstance(filename, str) or not isinstance(stored_filename, str):
        raise HTTPException(status_code=404, detail="첨부파일 정보를 찾을 수 없습니다.")
    if not re.fullmatch(r"[0-9a-f]{32}", stored_filename):
        raise HTTPException(status_code=404, detail="첨부파일 정보를 찾을 수 없습니다.")

    # 확장자가 없는 서버 저장 이름으로 실제 파일의 위치를 찾습니다.
    upload_path = UPLOAD_DIR / stored_filename
    if not upload_path.is_file():
        raise HTTPException(status_code=404, detail="저장된 첨부파일을 찾을 수 없습니다.")

    media_type = "application/octet-stream"
    if preview:
        #해당 딕셔너리에서 키값으로 확장자를 확인하여 미리보기용 media_type을 결정합니다.
        media_type = IMAGE_TYPES.get(Path(filename).suffix.lower())
        if media_type is None:
            raise HTTPException(status_code=415, detail="미리보기를 지원하지 않는 파일입니다.")

    # FileResponse는 upload_path의 내용을 읽어 보내면서 filename으로 응답 헤더를 만듭니다.
    # 다운로드라면 Content-Disposition: attachment; filename="photo.jpg"처럼 전달하므로
    # 브라우저는 서버의 UUID 이름이 아니라 원본 이름과 확장자로 저장하도록 제안합니다.
    # 한글 등은 filename*에 UTF-8로 인코딩됩니다. 서버에 저장된 파일명은 바뀌지 않습니다.
    return FileResponse(
        upload_path,
        media_type=media_type, # 미리보기용 media_type 또는 기본값 application/octet-stream
        filename=filename,  # 업로드 당시 원본 파일명
        content_disposition_type="inline" if preview else "attachment",  # 미리보기 또는 다운로드
        headers={"X-Content-Type-Options": "nosniff"},
    )


# 클라이언트가 보낸 방식 http://127.0.0.1:8000/menus/${menuId}   #클라이언트가 보낸  data가 ${menuId}
# 클라이어트가 /요청/데이터  이런 형식으로 보내서 다음과 같이 작성해야 한다.
@a.delete("/menus/{menu_id}")
def delete_menu(menu_id : int):
    #data.py 파일에게 삭제해 달라고 요청
    result = data.delete_menu(menu_id)
    if(result is None):
         return{
                "message":"삭제된거 없어요"
         }
    
    return{
           "message":"삭제했습니다."
    }

# 글 수정 요청이 아니라.. id로 글 정보 조회..
@a.get("/menus/{id}")
def getOne_menu(id : int):
    print(id, '메뉴의 데이터를 요청함')  #로그 남긴다. 디버깅이나 역추적
    result = data.get_one(id)
    if(result is None):
        return {
            "message":"no"
        }
    return result

# 데이터 글 갱신

@a.put("/menus")
def update_menu(menudata:Menu):
    # 로그남기기 팁 실제 현업에는 print남기지 않아요.. 자원이슈로..
    print(menudata.id, ' 데이터 글 수정을 요청함')
    data.update_one(menudata)
    return {
        "message":"ok"
    }

@a.post("/menus/recommend/{id}")
def update_recommend(id:int):
    
    data.update_recommend(id)
    return{
        "message":"ok"
    }
    
class ChatRequest(BaseModel):
    question: str 
    
@a.post("/chat")
def chatting(chatRequest:ChatRequest):
    print(chatRequest.question, '질문함')
    message = rag_google_v1.service_chat(chatRequest.question)
    print(message, '응답')
    return {
        "answer":message
    }