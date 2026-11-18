import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from urllib.parse import quote
from unittest.mock import patch

import httpx

# The chat service initializes an external model; upload tests do not need it.
sys.modules.setdefault("service.rag_google_v1", types.ModuleType("service.rag_google_v1"))

import main_file
from service import data


class MenuUploadTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.patches = [
            patch.object(data, "JSON_PATH", str(self.root / "menus.json")),
            patch.object(data, "menus", []),
            patch.object(data, "next_id", 1),
            patch.object(main_file, "UPLOAD_DIR", self.root / "uploads"),
        ]
        for item in self.patches:
            item.start()
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=main_file.a, raise_app_exceptions=False),
            base_url="http://test",
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        for item in reversed(self.patches):
            item.stop()
        self.temp_dir.cleanup()

    async def test_multipart_upload_persists_file_and_menu(self):
        fields = {"id": "0", "name": "메뉴", "calories": "123", "description": ""}
        for content in (b"first", b"second"):
            response = await self.client.post(
                "/menus", data=fields, files={"file": ("menu.txt", content, "text/plain")}
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), {"message": "ok"})

        saved = json.loads((self.root / "menus.json").read_text(encoding="utf-8"))
        self.assertEqual([menu["id"] for menu in saved], [1, 2])
        names = [menu["attachment"]["stored_filename"] for menu in saved]
        self.assertNotEqual(names[0], names[1])
        for menu, name, content in zip(saved, names, (b"first", b"second")):
            self.assertEqual(menu["attachment"]["filename"], "menu.txt")
            self.assertEqual((self.root / "uploads" / name).read_bytes(), content)
            self.assertEqual(menu["calories"], 123)
            self.assertEqual(menu["description"], "")
        self.assertEqual((await self.client.get("/menus/1")).json(), saved[0])

    async def test_optional_file_and_existing_json_requests(self):
        fields = {"id": "0", "name": "menu", "calories": "123", "description": ""}
        response = await self.client.post("/menus", data=fields, files={"file": (None, "")})
        self.assertEqual(response.status_code, 422)
        response = await self.client.post(
            "/menus", files={key: (None, value) for key, value in fields.items()}
        )
        self.assertEqual(response.status_code, 200, response.text)
        response = await self.client.post("/menus", json=fields)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(all("attachment" not in menu for menu in data.menus))
        self.assertFalse((self.root / "uploads").exists())

    async def test_invalid_fields_do_not_save_file_or_menu(self):
        response = await self.client.post(
            "/menus",
            data={"id": "0", "name": "menu", "calories": "bad", "description": ""},
            files={"file": ("menu.txt", b"content")},
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(data.menus, [])
        self.assertFalse((self.root / "uploads").exists())

    async def test_file_is_removed_if_menu_save_fails(self):
        with patch.object(data, "save_menus", side_effect=OSError("save failed")):
            response = await self.client.post(
                "/menus",
                data={"id": "0", "name": "menu", "calories": "123", "description": ""},
                files={"file": ("menu.txt", b"content")},
            )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(data.menus, [])
        self.assertEqual(data.next_id, 1)
        self.assertEqual(list((self.root / "uploads").iterdir()), [])

    async def test_uploaded_image_can_be_downloaded_and_previewed(self):
        image = b"\x89PNG\r\n\x1a\nexample"
        response = await self.client.post(
            "/menus",
            data={"id": "0", "name": "menu", "calories": "123", "description": ""},
            files={"file": ("사진.PNG", image, "image/png")},
        )
        self.assertEqual(response.status_code, 200, response.text)

        download = await self.client.get("/menus/1/attachment")
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.content, image)
        self.assertEqual(download.headers["content-type"], "application/octet-stream")
        self.assertIn("attachment;", download.headers["content-disposition"])
        self.assertIn(quote("사진.PNG"), download.headers["content-disposition"])

        preview = await self.client.get("/menus/1/attachment?preview=true")
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.content, image)
        self.assertEqual(preview.headers["content-type"], "image/png")
        self.assertIn("inline;", preview.headers["content-disposition"])
        self.assertEqual(preview.headers["x-content-type-options"], "nosniff")

    async def test_non_image_download_and_unavailable_attachments(self):
        response = await self.client.post(
            "/menus",
            data={"id": "0", "name": "menu", "calories": "123", "description": ""},
            files={"file": ("menu.txt", b"content", "text/plain")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual((await self.client.get("/menus/1/attachment")).content, b"content")
        self.assertEqual(
            (await self.client.get("/menus/1/attachment?preview=true")).status_code, 415
        )
        self.assertEqual((await self.client.get("/menus/99/attachment")).status_code, 404)

        data.menus.append({"id": 2, "attachment": {"filename": "x.png", "stored_filename": "../x"}})
        data.menus.append({"id": 3})
        self.assertEqual((await self.client.get("/menus/2/attachment")).status_code, 404)
        self.assertEqual((await self.client.get("/menus/3/attachment")).status_code, 404)
        (self.root / "uploads" / data.menus[0]["attachment"]["stored_filename"]).unlink()
        self.assertEqual((await self.client.get("/menus/1/attachment")).status_code, 404)
