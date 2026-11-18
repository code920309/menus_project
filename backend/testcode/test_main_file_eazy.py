from unittest.mock import patch

from testcode import test_main_file_upload

import main_file_eazy
from service import data


class EasyMenuUploadTests(test_main_file_upload.MenuUploadTests):
    async def asyncSetUp(self):
        # Run the same compatibility tests against the beginner-friendly server.
        server_patch = patch.object(test_main_file_upload, "main_file", main_file_eazy)
        server_patch.start()
        self.addCleanup(server_patch.stop)
        await super().asyncSetUp()

    async def test_optional_file_and_existing_json_requests(self):
        fields = {"id": "0", "name": "menu", "calories": "123", "description": ""}
        response = await self.client.post(
            "/menus", files={key: (None, value) for key, value in fields.items()}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(data.menus[0]["description"], "")
        self.assertNotIn("attachment", data.menus[0])

        response = await self.client.post("/menus", json=fields)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(data.menus), 1)

        response = await self.client.post(
            "/menus", data=fields, files={"file": (None, "not a file")}
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(data.menus), 1)

    async def test_other_menu_routes_and_chat(self):
        menu = {"id": 0, "name": "menu", "calories": 100, "description": "test"}
        form = {key: (None, str(value)) for key, value in menu.items()}
        self.assertEqual((await self.client.post("/menus", files=form)).status_code, 200)
        self.assertEqual(len((await self.client.get("/menus/search?word=menu")).json()), 1)

        menu.update(id=1, name="updated")
        self.assertEqual((await self.client.put("/menus", json=menu)).json(), {"message": "ok"})
        self.assertEqual((await self.client.get("/menus/1")).json()["name"], "updated")
        self.assertEqual((await self.client.post("/menus/recommend/1")).status_code, 200)
        self.assertEqual((await self.client.get("/menus/1")).json()["recommendation"], 1)
        self.assertEqual((await self.client.delete("/menus/1")).json(), {"message": "삭제했습니다."})
        self.assertEqual((await self.client.get("/menus/1")).json(), {"message": "no"})

        with patch.object(main_file_eazy.rag_google_v1, "service_chat", return_value="answer", create=True):
            response = await self.client.post("/chat", json={"question": "hello"})
        self.assertEqual(response.json(), {"answer": "answer"})
