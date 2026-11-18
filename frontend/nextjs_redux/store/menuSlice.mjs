import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  addMenu,
  deleteMenu,
  getAllMenus,
  getMenuOne,
  recommendMenu,
  searchMenus,
  updateMenu,
} from "../services-not_used/api.js"; // 실제 서버(fetch) 호출을 담당하는 기존 API 모듈입니다. slice가 이 함수들을 thunk로 감쌉니다.

/*
 * createAsyncThunk("타입접두사", 비동기함수)
 * dispatch(thunk(인자)) 하면 다음 순서로 동작합니다.
 *   1) "접두사/pending" 액션 자동 dispatch  (요청 시작)
 *   2) 비동기함수(인자) 실행 -> 서버 API 호출
 *   3) 성공: "접두사/fulfilled" (action.payload = 반환값) / 실패: "접두사/rejected" (action.error)
 * dispatch의 반환 Promise에 .unwrap()을 붙이면 성공 시 payload를 돌려주고,
 * 실패 시 예외를 throw 하므로 컴포넌트에서 try/catch + alert로 에러를 처리할 수 있습니다.
 */

// 검색어가 있으면 검색 API, 없으면 전체 목록 API를 호출합니다. (기존 page.js의 분기 로직을 옮긴 것)
export const fetchMenus = createAsyncThunk("menus/fetchAll", async (keyword = "") =>
  keyword.trim() ? searchMenus(keyword) : getAllMenus()
);

// 아래 thunk들은 API 함수를 그대로 감쌉니다. 인자(id 또는 menu 객체)가 API 함수로 전달됩니다.
export const fetchMenu = createAsyncThunk("menus/fetchOne", getMenuOne);
export const createMenu = createAsyncThunk("menus/create", addMenu);
export const saveMenu = createAsyncThunk("menus/save", updateMenu);
// 삭제/추천은 state를 직접 바꾸지 않습니다(reducer 없음).
// 서버만 변경하고, 호출한 컴포넌트가 이어서 fetchMenus로 목록을 다시 받아 state를 갱신합니다.
export const removeMenu = createAsyncThunk("menus/remove", deleteMenu);
export const voteMenu = createAsyncThunk("menus/recommend", recommendMenu);



const menuSlice = createSlice({
  name: "menus",
  // Store에 저장되는 초기 state입니다.
  initialState: {
    items: [], // /menus 목록 (MenusPage가 useSelector로 읽음)
    selected: null, // 상세 페이지용 메뉴 1건
    listRequestId: null, // "가장 최근 목록 요청"의 id (오래된 응답 무시용)
    detailRequestId: null, // "가장 최근 상세 요청"의 id
  },
  reducers: {}, // 동기 액션은 없고, 모든 변경은 아래 thunk 결과로만 일어납니다.
  extraReducers: (builder) => {
    /*
     * 경쟁 상태(race condition) 방지:
     * 검색을 빠르게 연달아 하면 요청 A, B가 나가고 A의 응답이 B보다 늦게 도착할 수 있습니다.
     * pending 때 "내 요청 id"를 기록해 두고, 응답이 왔을 때 기록된 id와 같은 경우(= 가장 마지막 요청)에만
     * state에 반영하여, 늦게 도착한 옛 응답이 최신 결과를 덮어쓰지 못하게 합니다.
     * (action.meta.requestId는 thunk 호출마다 자동 생성되는 고유 id입니다.)
     */
    builder
      .addCase(fetchMenus.pending, (state, action) => {
        // 요청 시작: 최신 요청 id 기록 (Immer 덕분에 state를 직접 수정하는 문법이 안전합니다)
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchMenus.fulfilled, (state, action) => {
        // 내가 최신 요청일 때만 목록을 교체 -> useSelector를 쓰는 컴포넌트가 자동 리렌더링됩니다.
        if (state.listRequestId === action.meta.requestId) {
          state.items = action.payload;
          state.listRequestId = null;
        }
      })
      .addCase(fetchMenus.rejected, (state, action) => {
        if (state.listRequestId === action.meta.requestId) {
          state.listRequestId = null;
        }
      })
      .addCase(fetchMenu.pending, (state, action) => {
        // 상세 요청 시작: 이전 메뉴가 잠깐 보이지 않도록 비우고, 최신 요청 id를 기록합니다.
        state.selected = null;
        state.detailRequestId = action.meta.requestId;
      })
      .addCase(fetchMenu.fulfilled, (state, action) => {
        if (state.detailRequestId === action.meta.requestId) {
          state.selected = action.payload;
          state.detailRequestId = null;
        }
      })
      .addCase(fetchMenu.rejected, (state, action) => {
        if (state.detailRequestId === action.meta.requestId) {
          state.detailRequestId = null;
        }
      });
  },
});

export default menuSlice.reducer;
