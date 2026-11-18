"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store.mjs";

/*
 * 하위 모든 컴포넌트가 useSelector/useDispatch로 Store를 쓰도록 Context로 공급합니다.
 * layout.js는 서버 컴포넌트이고 Provider는 클라이언트 전용이라, "use client"인 이 래퍼를 거칩니다.
 *
 * useState(makeStore): 초기값으로 "함수"를 넘기면 React가 첫 렌더링에서 딱 한 번만 호출합니다.
 * 그래서 리렌더링이 되어도 Store가 다시 만들어지지 않고(state 유지), 요청마다 독립된 Store가 생깁니다.
 */
export default function StoreProvider({ children }) {
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}
