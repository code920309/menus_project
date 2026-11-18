
// 브라우저에서 접근할 백엔드 주소를 환경변수에서 가져옵니다.
const API_SERVER = process.env.NEXT_PUBLIC_API_SERVER;

// 오류 응답의 detail을 표시해 가입 중복과 인증 실패를 구별합니다.
async function authRequest(path, options = {}) {
    // 응답 상태와 본문을 확인하기 위해 서버의 응답 객체를 보관합니다.
    const response = await fetch(`${API_SERVER}${path}`, options);
    if (!response.ok) {
        // JSON 오류 본문만 파싱해 서버가 보낸 detail을 안전하게 읽습니다.
        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("application/json") ? await response.json() : null;
        // 화면에 표시할 문장과 상태 코드를 함께 전달합니다.
        const error = new Error(typeof body?.detail === "string" ? body.detail :
            response.status >= 500 ? "서버 오류가 발생했습니다." : "입력값을 확인하세요.");
        error.status = response.status;
        throw error;
    }
    return response.json();
}

export function signup(values) {
    return authRequest("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    });
}

export function login(values) {
    return authRequest("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    });
}

export function getCurrentUser(token) {
    return authRequest("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
}

// 파일 다운로드와 이미지 미리보기는 같은 첨부파일 API를 사용합니다.
export function getMenuAttachmentUrl(id, preview = false) {
    return `${API_SERVER}/menus/${id}/attachment${preview ? "?preview=true" : ""}`;
}

// 전체 메뉴 조회
export async function getAllMenus() {
    try {
        // 응답 성공 여부를 검사한 뒤 메뉴 목록 JSON을 반환합니다.
        const response = await fetch(`${API_SERVER}/menus`);

        if (!response.ok) {
            throw new Error(`메뉴 조회 실패: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("전체 메뉴 조회 오류:", error);
        throw error;
    }
}


// 메뉴 검색
export async function searchMenus(keyword) {
    try {
        // 검색어를 URL에 안전하게 담고 검색 결과 응답을 확인합니다.
        const params = new URLSearchParams({ word: keyword });
        const response = await fetch(`${API_SERVER}/menus/search?${params}`);

        if (!response.ok) {
            throw new Error(`메뉴 검색 실패: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("메뉴 검색 오류:", error);
        throw error;
    }
}


// 메뉴 한 건 조회
export async function getMenuOne(id) {
    try {
        // 지정한 메뉴의 응답 상태와 상세 JSON을 확인합니다.
        const response = await fetch(`${API_SERVER}/menus/${id}`);

        if (!response.ok) {
            throw new Error(`메뉴 조회 실패: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("메뉴 상세 조회 오류:", error);
        throw error;
    }
}


// 기존 코드: JSON 객체와 FormData를 구분하여 전송했습니다.
/*
export async function addMenu(menuData) {
    try {
        const isFormData = menuData instanceof FormData;
        const response = await fetch(`${API_SERVER}/menus`, {
            method: "POST",
            // FormData일 때 Content-Type을 직접 지정하면 multipart boundary가 누락될 수 있습니다.
            headers: isFormData ? undefined : { "Content-Type": "application/json" },
            body: isFormData ? menuData : JSON.stringify(menuData)
        });

        if (!response.ok) {
            throw new Error(`메뉴 등록 실패: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("메뉴 등록 오류:", error);
        throw error;
    }
}
*/

// JWT는 Authorization 헤더에, 파일과 입력값은 기존 FormData 본문에 담습니다.
export async function addMenu(formData, token) {
    try {
        // multipart 본문과 Bearer 토큰을 보낸 뒤 서버 응답을 확인합니다.
        const response = await fetch(`${API_SERVER}/menus`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            // Content-Type은 브라우저가 boundary와 함께 자동으로 지정합니다.
            body: formData
        });

        if (!response.ok) {
            if (response.status === 401) {
                // 호출한 폼에서 401을 구분해 로그인 상태를 지울 수 있게 합니다.
                const error = new Error("로그인이 필요하거나 만료되었습니다.");
                error.status = 401;
                throw error;
            }
            throw new Error(`메뉴 등록 실패: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error("메뉴 등록 오류:", error);
        throw error;
    }
}


// 메뉴 수정
export async function updateMenu(menuObject) {
    try {
        // 수정 성공 여부와 결과를 확인할 응답 객체입니다.
        const response = await fetch(`${API_SERVER}/menus`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(menuObject)
        });

        if (!response.ok) {
            throw new Error(`메뉴 수정 실패: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("메뉴 수정 오류:", error);
        throw error;
    }
}


// 메뉴 삭제
export async function deleteMenu(id) {
    try {
        // 삭제 성공 여부와 본문 유무를 확인할 응답 객체입니다.
        const response = await fetch(`${API_SERVER}/menus/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error(`메뉴 삭제 실패: ${response.status}`);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();

    } catch (error) {
        console.error("메뉴 삭제 오류:", error);
        throw error;
    }
}


// 메뉴 추천
export async function recommendMenu(id) {
    try {
        // 추천 요청의 성공 여부를 확인할 응답 객체입니다.
        const response = await fetch(`${API_SERVER}/menus/recommend/${id}`, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error(`메뉴 추천 실패: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("메뉴 추천 오류:", error);
        throw error;
    }
}


// AI 채팅
export async function sendChat(question) {
    try {
        // 질문에 대한 서버의 답변과 오류 상태를 확인합니다.
        const response = await fetch(`${API_SERVER}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        if (!response.ok) {
            throw new Error(`AI 채팅 요청 실패: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("AI 채팅 오류:", error);
        throw error;
    }
}



// // 공통 API 요청 함수
// async function request(url, options = {}) {
//     const response = await fetch(`${API_SERVER}${url}`, options);

//     if (!response.ok) {
//         throw new Error(`서버 요청 실패: ${response.status}`);
//     }
//     // DELETE 요청에서 응답 본문이 없는 경우
//     if (response.status === 204) {
//         return null;
//     }
//     return response.json();
// }

// // 전체 메뉴 조회
// export async function getAllMenus() {
//     return request("/menus");
// }

// // 메뉴 검색
// export async function searchMenus(keyword) {
//     const params = new URLSearchParams({ word: keyword });
//     return request(`/menus/search?${params}`);
// }

// // 메뉴 한 건 조회
// export async function getMenuOne(id) {
//     return request(`/menus/${id}`);
// }

// // 메뉴 등록
// export async function addMenu(menuObject) {
//     return request("/menus", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(menuObject)
//     });
// }

// // 메뉴 수정
// export async function updateMenu(menuObject) {
//     return request("/menus", {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(menuObject)
//     });
// }

// // 메뉴 삭제
// export async function deleteMenu(id) {
//     return request(`/menus/${id}`, {
//         method: "DELETE"
//     });
// }

// // 메뉴 추천
// export async function recommendMenu(id) {
//     return request(`/menus/recommend/${id}`, {
//         method: "POST"
//     });
// }

// // AI 채팅
// export async function sendChat(question) {
//     return request("/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ question })
//     });
// }
