/*
 * 이 파일은 Axios를 사용해 백엔드 API를 호출하는 함수들을 모아 둡니다.
 * api.js의 fetch 방식과 비교해 Axios의 응답 처리 및 요청 메서드 사용을 학습할 수 있습니다.
 */

// axios 패키지에서 HTTP 요청 기능을 가져옵니다.
import axios from "axios";

// API 주소를 환경 변수에서 읽어 Axios 인스턴스의 공통 기본 주소로 설정합니다.
const API_SERVER = process.env.NEXT_PUBLIC_API_SERVER;
const apiClient = axios.create({
    baseURL: API_SERVER
});

// 전체 메뉴 조회
// export async function은 이름을 지정해 함수를 내보냅니다.
export async function getAllMenus() {
    // get은 조회 요청을 보내고 response.data는 서버가 돌려준 본문입니다.
    const response = await apiClient.get("/menus");
    return response.data;
}

// 메뉴 검색
export async function searchMenus(keyword) {
    // params는 Axios가 URL 쿼리 문자열로 만들어 줍니다.
    const response = await apiClient.get("/menus/search", {
        params: { word: keyword }
    });
    return response.data;
}

// 메뉴 한 건 조회
export async function getMenuOne(id) {
    const response = await apiClient.get(`/menus/${id}`);
    return response.data;
}

// 메뉴 등록
export async function addMenu(menuObject) {
    console.log("menuObject", menuObject); // 디버깅용 로그 추가
    // post의 두 번째 인수는 서버로 보낼 요청 본문입니다.
    const response = await apiClient.post("/menus", menuObject);
    return response.data;
}

// 메뉴 수정
export async function updateMenu(menuObject) {
    // put은 기존 리소스 수정 요청입니다.
    const response = await apiClient.put("/menus", menuObject);
    return response.data;
}

// 메뉴 삭제
export async function deleteMenu(id) {
    const response = await apiClient.delete(`/menus/${id}`);

    // 204는 응답 본문이 없다는 뜻이므로 JSON 데이터 대신 null을 돌려줍니다.
    if (response.status === 204) {
        return null;
    }

    return response.data;
}

// 메뉴 추천
export async function recommendMenu(id) {
    const response = await apiClient.post(`/menus/recommend/${id}`);
    return response.data;
}

// AI 채팅
export async function sendChat(question) {
    const response = await apiClient.post("/chat", { question });
    return response.data;
}
