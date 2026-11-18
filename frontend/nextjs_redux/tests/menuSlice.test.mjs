import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

process.env.NEXT_PUBLIC_API_SERVER = "http://example.test";

const { makeStore } = await import("../store/store.mjs");
const { createMenu, fetchMenu, fetchMenus, removeMenu, saveMenu, voteMenu } =
  await import("../store/menuSlice.mjs");
const originalFetch = globalThis.fetch;
const originalError = console.error;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalError;
});

test("menu requests update the store and use the search endpoint", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => [{ id: 1, name: "메뉴" }] };
  };
  const store = makeStore();

  await store.dispatch(fetchMenus("")).unwrap();
  assert.deepEqual(store.getState().menus.items, [{ id: 1, name: "메뉴" }]);
  await store.dispatch(fetchMenus("김치 찌개")).unwrap();
  assert.equal(calls[0], "http://example.test/menus");
  assert.equal(calls[1], "http://example.test/menus/search?word=%EA%B9%80%EC%B9%98+%EC%B0%8C%EA%B0%9C");
});

test("a slower older list or detail response does not overwrite the latest result", () => {
  const store = makeStore();
  store.dispatch(fetchMenus.pending("old", ""));
  store.dispatch(fetchMenus.pending("new", "새"));
  store.dispatch(fetchMenus.fulfilled([{ id: 2 }], "new", "새"));
  store.dispatch(fetchMenus.fulfilled([{ id: 1 }], "old", ""));
  assert.deepEqual(store.getState().menus.items, [{ id: 2 }]);

  store.dispatch(fetchMenu.pending("old-detail", 1));
  store.dispatch(fetchMenu.pending("new-detail", 2));
  store.dispatch(fetchMenu.fulfilled({ id: 2 }, "new-detail", 2));
  store.dispatch(fetchMenu.fulfilled({ id: 1 }, "old-detail", 1));
  assert.deepEqual(store.getState().menus.selected, { id: 2 });
});

test("mutations dispatch the original API methods and propagate failures", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "DELETE") return { ok: true, status: 204 };
    return { ok: true, json: async () => ({ id: 1 }) };
  };
  const store = makeStore();
  const menu = { id: 1, name: "메뉴", calories: 100, description: "" };

  await store.dispatch(createMenu(menu)).unwrap();
  await store.dispatch(saveMenu(menu)).unwrap();
  await store.dispatch(removeMenu(1)).unwrap();
  await store.dispatch(voteMenu(1)).unwrap();
  assert.deepEqual(calls.map(({ options }) => options.method), ["POST", "PUT", "DELETE", "POST"]);
  assert.deepEqual(calls.map(({ url }) => url), [
    "http://example.test/menus",
    "http://example.test/menus",
    "http://example.test/menus/1",
    "http://example.test/menus/recommend/1",
  ]);
  assert.deepEqual(JSON.parse(calls[0].options.body), menu);

  globalThis.fetch = async () => ({ ok: false, status: 500 });
  console.error = () => {};
  await assert.rejects(
    store.dispatch(fetchMenus("")).unwrap(),
    (error) => error.message === "메뉴 조회 실패: 500"
  );
  assert.equal(store.getState().menus.listRequestId, null);
});
