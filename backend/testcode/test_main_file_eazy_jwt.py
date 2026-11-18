import json
import os
import sys
import tempfile
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import httpx
import jwt

# AI 모델을 불러오지 않고 인증과 메뉴 API만 검증합니다.
sys.modules.setdefault("service.rag_google_v1", types.ModuleType("service.rag_google_v1"))
import main_file_eazy_jwt as server
from service import data


class JwtTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # 실제 회원과 메뉴 파일을 건드리지 않도록 테스트 전용 폴더와 키를 준비합니다.
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.secret = "test-secret-" * 4
        # 서버의 파일 경로와 메모리 상태를 테스트용 값으로 임시 교체합니다.
        self.patches = [
            patch.dict(os.environ, {"JWT_SECRET": self.secret}),
            patch.object(server, "USER_PATH", root / "user.json"),
            patch.object(data, "JSON_PATH", str(root / "menus.json")),
            patch.object(data, "menus", []),
            patch.object(data, "next_id", 1),
            patch.object(server, "UPLOAD_DIR", root / "uploads"),
        ]
        for item in self.patches:
            item.start()
        # 네트워크 서버를 띄우지 않고 FastAPI 앱에 HTTP 요청을 보냅니다.
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=server.a, raise_app_exceptions=False),
            base_url="http://test",
        )
        # 여러 테스트에서 재사용할 가입 정보와 메뉴 폼입니다.
        self.account = {"email": "Student@example.com", "password": "password123", "phone": "010-1234-5678"}
        self.form = {"id": "0", "name": "menu", "calories": "100", "description": ""}

    async def asyncTearDown(self):
        await self.client.aclose()
        for item in reversed(self.patches):
            item.stop()
        self.temp.cleanup()

    async def signup_login(self):
        # 가입과 로그인 응답을 검증하고 보호된 요청에 쓸 토큰을 반환합니다.
        response = await self.client.post("/auth/signup", json=self.account)
        self.assertEqual(response.status_code, 201, response.text)
        response = await self.client.post("/auth/login", json={
            "email": self.account["email"], "password": self.account["password"],
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    async def test_signup_login_and_authorized_menu(self):
        # 토큰과 저장된 JSON을 이용해 가입 및 로그인 결과를 확인합니다.
        token = await self.signup_login()
        saved = json.loads(server.USER_PATH.read_text(encoding="utf-8"))
        self.assertEqual(saved[0]["email"], "student@example.com")
        self.assertNotIn(self.account["password"], server.USER_PATH.read_text(encoding="utf-8"))
        self.assertEqual(saved[0]["phone"], self.account["phone"])
        # 중복 이메일과 틀린 비밀번호가 각각 거부되는지 확인합니다.
        duplicate = await self.client.post("/auth/signup", json={**self.account, "email": "student@example.com"})
        self.assertEqual(duplicate.status_code, 409)
        wrong = await self.client.post("/auth/login", json={"email": self.account["email"], "password": "wrongpass"})
        self.assertEqual(wrong.status_code, 401)
        # 로그인 토큰을 Bearer 헤더에 넣어 사용자 확인과 메뉴 등록을 요청합니다.
        headers = {"Authorization": f"Bearer {token}"}
        self.assertEqual((await self.client.get("/auth/me", headers=headers)).json(),
                         {"email": "student@example.com", "name": "student"})
        response = await self.client.post("/menus", data=self.form, headers=headers,
                                          files={"file": ("menu.txt", b"test")})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(data.menus), 1)
        self.assertEqual((await self.client.get("/menus/1/attachment")).content, b"test")

    async def test_missing_forged_expired_and_unknown_user_tokens(self):
        # 정상 토큰을 기준으로 변조, 만료, 존재하지 않는 회원을 각각 시험합니다.
        token = await self.signup_login()
        expired = jwt.encode({"sub": "student@example.com", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
                             self.secret, algorithm="HS256")
        unknown = jwt.encode({"sub": "unknown@example.com", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                             self.secret, algorithm="HS256")
        for invalid in (None, token + "tampered", expired, unknown):
            # 토큰이 없는 경우와 잘못된 토큰이 있는 경우의 헤더를 구분합니다.
            headers = {} if invalid is None else {"Authorization": f"Bearer {invalid}"}
            # 인증 실패 시 메뉴가 저장되지 않아야 합니다.
            response = await self.client.post("/menus", data=self.form, headers=headers)
            self.assertEqual(response.status_code, 401, response.text)
            self.assertEqual((await self.client.get("/auth/me", headers=headers)).status_code, 401)
        self.assertEqual(data.menus, [])

    async def test_validation_and_missing_secret(self):
        # 각각 이메일, 비밀번호, 연락처가 잘못된 가입 요청을 검사합니다.
        for account in (
            {**self.account, "email": "invalid"},
            {**self.account, "password": "short"},
            {**self.account, "phone": "   "},
        ):
            self.assertEqual((await self.client.post("/auth/signup", json=account)).status_code, 422)
        self.assertFalse(server.USER_PATH.exists())
        with patch.dict(os.environ, {"JWT_SECRET": ""}):
            with self.assertRaises(RuntimeError):
                server.jwt_secret()
