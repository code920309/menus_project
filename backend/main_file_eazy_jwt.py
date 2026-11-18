"""회원가입과 JWT 인증을 추가한 메뉴 서버. 실행: uvicorn main_file_eazy_jwt:a --reload"""

import hashlib
import hmac
import json
import os
import re  # 서버에 저장된 파일명의 형식을 확인합니다.
import secrets
import shutil  # 업로드 파일을 서버에 복사합니다.
import tempfile
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path  # 파일과 폴더의 경로를 만듭니다.
from threading import Lock
from uuid import uuid4  # 파일명이 겹치지 않도록 새 이름을 만듭니다.

import jwt
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile  # 앱, 폼, 파일, HTTP 오류
from fastapi.middleware.cors import CORSMiddleware  # 다른 주소의 프런트엔드 요청을 허용합니다.
from fastapi.responses import FileResponse  # 파일 내용과 정보를 클라이언트에 보냅니다.
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator  # 요청 데이터의 타입을 검사합니다.

from service import data, rag_google_v1  # 메뉴 저장과 AI 채팅을 담당합니다.


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 설정이 빠진 서버를 불완전한 상태로 실행하지 않습니다.
    jwt_secret()
    yield


# a는 라우트와 미들웨어를 등록하는 FastAPI 애플리케이션입니다.
a = FastAPI(lifespan=lifespan)
a.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 메뉴 데이터를 검사할 때 사용하는 모델입니다.
class Menu(BaseModel):
    # 폼을 검증한 뒤 메뉴 저장 함수에 전달할 필드입니다.
    id: int
    name: str
    calories: int
    description: str


class ChatRequest(BaseModel):
    # 채팅 API가 JSON에서 받아야 할 질문입니다.
    question: str


# 회원 JSON은 수업용 저장소이고 Lock은 한 프로세스 안의 동시 가입을 직렬화합니다.
USER_PATH = Path(__file__).resolve().parent / "storage" / "user.json"
USER_LOCK = Lock()
# Authorization 헤더를 읽되 누락 시 직접 일관된 401 응답을 만듭니다.
bearer = HTTPBearer(auto_error=False)
# 비밀번호 해시 계산을 반복해 무작위 대입 비용을 높입니다.
PASSWORD_ITERATIONS = 600_000


class LoginRequest(BaseModel):
    # 로그인 입력의 길이를 제한해 서버에 전달되는 값을 검사합니다.
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        # 대소문자와 앞뒤 공백 차이로 같은 계정이 중복되지 않게 합니다.
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("올바른 이메일을 입력하세요.")
        return value


class SignupRequest(LoginRequest):
    # 가입은 로그인 입력 외에 연락처가 추가로 필요합니다.
    phone: str = Field(min_length=1, max_length=30)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        # 공백만 입력한 값이나 허용하지 않은 문자를 걸러냅니다.
        value = value.strip()
        if not re.fullmatch(r"[0-9+() \-]{7,30}", value):
            raise ValueError("올바른 연락처를 입력하세요.")
        return value


def jwt_secret():
    # 서명 키는 소스나 JSON에 넣지 않고 서버 환경변수로 전달합니다.
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET 환경변수에 32바이트 이상의 임의 문자열을 설정하세요.")
    return secret


def read_users():
    if not USER_PATH.exists():
        return []
    # file은 JSON을 읽는 열린 파일 객체이며 with 종료 시 닫힙니다.
    with USER_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def write_users(users):
    # 임시 파일을 완성한 다음 교체해 쓰기 중 기존 JSON이 손상되지 않게 합니다.
    USER_PATH.parent.mkdir(parents=True, exist_ok=True)
    # 생성에 실패한 경우에도 정리 여부를 판단할 수 있도록 처음에는 경로가 없습니다.
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=USER_PATH.parent,
            prefix=".user-", suffix=".tmp", delete=False,
        ) as file:
            # 임시 파일 경로는 교체와 실패 시 정리에 모두 사용합니다.
            temporary_path = Path(file.name)
            json.dump(users, file, ensure_ascii=False, indent=2)
        os.replace(temporary_path, USER_PATH)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def password_hash(password, salt):
    # salt는 계정마다 다르게 만들고 PBKDF2를 반복해 원문 복원을 어렵게 합니다.
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS
    ).hex()


def public_user(user):
    # 비밀번호 해시와 연락처는 로그인 화면에 보내지 않습니다.
    return {"email": user["email"], "name": user["email"].split("@", 1)[0]}


@a.post("/auth/signup", status_code=201)
def signup(request: SignupRequest):
    with USER_LOCK:
        # 같은 잠금 안에서 현재 목록을 읽고 중복 검사와 저장까지 수행합니다.
        users = read_users()
        if any(user["email"] == request.email for user in users):
            raise HTTPException(status_code=409, detail="이미 가입한 이메일입니다.")
        # 계정별 무작위 salt로 같은 비밀번호라도 해시가 달라지게 합니다.
        salt = secrets.token_hex(16)
        users.append({
            "email": request.email,
            "phone": request.phone,
            "salt": salt,
            "password_hash": password_hash(request.password, salt),
        })
        write_users(users)
    return {"message": "회원가입이 완료되었습니다."}


@a.post("/auth/login")
def login(request: LoginRequest):
    with USER_LOCK:
        # 이메일에 해당하는 계정을 찾고 없으면 None으로 인증 실패를 처리합니다.
        user = next((item for item in read_users() if item["email"] == request.email), None)
    if user is None or not hmac.compare_digest(
        password_hash(request.password, user["salt"]), user["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    # JWT의 payload는 암호화되지 않습니다. 비밀 정보 대신 식별자와 만료 시각만 넣습니다.
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    # 서버의 비밀 키로 payload에 서명한 문자열을 클라이언트에 전달합니다.
    token = jwt.encode({"sub": user["email"], "exp": expires}, jwt_secret(), algorithm="HS256")
    return {"access_token": token, "token_type": "bearer", "user": public_user(user)}


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    # 토큰이 없거나 유효하지 않은 경우 동일한 인증 오류를 반환합니다.
    unauthorized = HTTPException(
        status_code=401, detail="로그인이 필요하거나 만료되었습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        # 알고리즘을 고정하고 서명과 만료 시각을 검증해야 payload를 신뢰할 수 있습니다.
        payload = jwt.decode(
            credentials.credentials, jwt_secret(), algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
    except jwt.InvalidTokenError:
        raise unauthorized
    with USER_LOCK:
        # 서명된 이메일이 현재 회원 목록에도 있는지 확인합니다.
        user = next((item for item in read_users() if item["email"] == payload["sub"]), None)
    if user is None:
        raise unauthorized
    return user


@a.get("/auth/me")
def me(user: dict = Depends(current_user)):
    return public_user(user)


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
    # 파일이 없으면 첨부 정보와 정리할 서버 경로가 모두 없습니다.
    attachment = None
    upload_path = None

    if file is not None:
        # 폴더가 없다면 만들고 임의의 서버 저장 이름을 정합니다.
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_filename = uuid4().hex
        # 저장 경로를 보관해 파일 복사와 실패 시 정리에 재사용합니다.
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
    user: dict = Depends(current_user),
):
    # 화면을 우회한 직접 요청도 서버에서 JWT를 검사합니다.
    # Form은 폼 값을, File은 첨부파일을 받습니다. ...은 필수라는 뜻입니다.
    # FastAPI가 id와 calories를 정수로 검사하고 잘못된 값에는 422를 응답합니다.
    # description과 file은 선택 사항이며, 필드명은 클라이언트와 같아야 합니다.
    # 일반 def 엔드포인트는 FastAPI가 스레드에서 실행하므로 파일 저장 중에도
    # 다른 비동기 요청을 처리할 수 있습니다.
    # 검증된 폼 필드를 저장 함수가 사용하는 Menu 객체로 묶습니다.
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

    # filename은 사용자에게 보여 줄 이름, stored_filename은 서버에서 찾을 이름입니다.
    filename = attachment.get("filename")
    stored_filename = attachment.get("stored_filename")
    if not isinstance(filename, str) or not isinstance(stored_filename, str):
        raise HTTPException(status_code=404, detail="첨부파일 정보를 찾을 수 없습니다.")

    # 서버에서 만든 UUID 이름만 허용하여 다른 경로의 파일을 읽지 못하게 합니다.
    if not re.fullmatch(r"[0-9a-f]{32}", stored_filename):
        raise HTTPException(status_code=404, detail="첨부파일 정보를 찾을 수 없습니다.")

    # 검증된 저장 이름으로 실제 첨부파일 경로를 만듭니다.
    upload_path = UPLOAD_DIR / stored_filename
    if not upload_path.is_file():
        raise HTTPException(status_code=404, detail="저장된 첨부파일을 찾을 수 없습니다.")

    # 기본 MIME 타입과 처리 방식은 파일 다운로드입니다.
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
    # 삭제 결과가 없으면 그 사실을 클라이언트에 알립니다.
    result = data.delete_menu(menu_id)
    if result is None:
        return {"message": "삭제된거 없어요"}
    return {"message": "삭제했습니다."}


@a.get("/menus/{id}")
def get_one_menu(id: int):
    # 조회 결과가 있는지에 따라 메뉴 또는 기존의 "no" 응답을 반환합니다.
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
    # AI 서비스의 답변을 JSON 응답에 담습니다.
    answer = rag_google_v1.service_chat(request.question)
    return {"answer": answer}
