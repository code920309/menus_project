# 메뉴 관리 앱: Redux Toolkit

`frontend/nextjs`의 메뉴 관리·검색·추천·채팅 화면을 기반으로 한
Next.js App Router 프로젝트입니다. 원본 프로젝트는 변경하지 않습니다.

## 실행

백엔드를 저장소리 루트의 README 안내에 따라 실행합니다. 기본 예시 주소는
`http://127.0.0.1:8000`입니다. 이 폴더에 `.env.local` 파일을 만들고
백엔드 주소를 설정한 후 개발 서버를 실행합니다.

```text
NEXT_PUBLIC_API_SERVER=http://127.0.0.1:8000
```

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 환경 변수를 변경했다면
개발 서버를 다시 시작해야 합니다. 채팅은 백엔드의 채팅 기능 설정도 필요합니다.

## Redux 구성

- `app/StoreProvider.js`: 클라이언트 Provider에서 앱 인스턴스별 Store를 생성합니다.
- `store/store.mjs`: `configureStore`로 메뉴 reducer를 등록합니다.
- `store/menuSlice.mjs`: `createSlice`와 `createAsyncThunk`로 목록·단건 조회,
  등록·수정·삭제·추천 액션을 정의합니다. 동시에 들어온 조회 응답은
  마지막 요청만 Store에 반영합니다.
- 메뉴 페이지는 `useSelector`로 목록이나 단건을 읽고, `useDispatch`로
  비동기 액션을 실행합니다. 액션 실패는 `unwrap()`으로 호출 화면에 전달합니다.
- 검색어, 입력 폼, 채팅 및 홈의 무작위 추천은 기존처럼 컴포넌트 로컬 상태입니다.
  등록·수정 후 목록으로 이동하면 목록을 다시 조회하고, 삭제·추천 후에는
  현재 검색 조건으로 목록을 새로고침합니다.

## 검증

```bash
npm test
npm run lint
npm run build
```
