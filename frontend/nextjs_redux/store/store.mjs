import { configureStore } from "@reduxjs/toolkit";
import menuReducer from "./menuSlice.mjs";

/*
 * Redux Store를 "만드는 함수"입니다. (Store 객체 자체를 export하지 않습니다.)
 * 동작: configureStore가 reducer 맵을 받아 state 트리를 만듭니다.
 *   state = { menus: menuSlice의 state }  -> 컴포넌트에서 state.menus.items 로 접근합니다.
 * 함수로 만드는 이유: Next.js는 서버에서도 코드를 실행하므로, 모듈 전역에 Store를 하나만 두면
 * 요청/사용자 간에 state가 공유될 수 있습니다. StoreProvider가 이 함수를 호출해 Store를 새로 만듭니다.
 */
export function makeStore() {
  return configureStore({
    reducer: { menus: menuReducer },
  });
}
