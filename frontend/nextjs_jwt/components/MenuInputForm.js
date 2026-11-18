
"use client";

/*
 * 이 파일은 새 메뉴를 입력하고 등록하는 폼 컴포넌트입니다.
 * 제출 이벤트에서 FormData로 입력값을 읽어 API에 보내고, 성공하면 목록으로 이동합니다.
 */

// 메뉴 등록 요청을 담당하는 프로젝트 내부 API 함수입니다.
import { addMenu } from "@/services/api";
// Next.js 클라이언트 내비게이션으로 등록 완료 후 페이지를 이동하는 기능입니다.
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// default export는 이 폼 컴포넌트를 다른 파일에서 대표 이름으로 가져오게 합니다.
export default function MenuInputForm() {

    // 등록 성공 후 목록 페이지로 이동할 때 사용합니다.
    const router = useRouter();
    // token은 서버 인증에 사용하고 logout은 만료된 인증 상태를 지웁니다.
    const { token, logout } = useAuth();

    async function handleSave(event) {
        // 기본 페이지 새로고침 방지
        event.preventDefault();

        // 메뉴 입력값과 파일을 함께 보내기 위해 폼 전체를 FormData로 만듭니다.        
        // FormData는 브라우저에 내장된 웹 API로, 폼의 입력값과 파일을 서버에 보낼 수 있게 묶어 주는 객체입니다. 
        // TypeScript의 lib.dom.d.ts는 이 브라우저 API의 타입을 정의한 파일이에요.
        // 지금 코드에서는 MenuInputForm.js에서 new FormData(event.currentTarget)로 name, calories, description, file 값을 모읍니다. 
        // 이 객체를 api.js의 fetch 요청 본문으로 보내면, 브라우저가 파일을 포함한 multipart 형식으로 전송합니다.
        const formData = new FormData(event.currentTarget);
        // 기존 등록 요청처럼 새 메뉴의 ID도 함께 전달합니다.
        formData.set("id", "0");

        // 파일을 선택하지 않은 경우 빈 파일 값은 요청에서 제외합니다.
        const file = formData.get("file");
        if (file instanceof File && file.name === "") {
            formData.delete("file");
        }

        try {
            // 메뉴 등록 API를 기다린 뒤, 성공하면 알림을 띄우고 메뉴 목록으로 이동합니다.
            await addMenu(formData, token);
            alert("메뉴가 등록되었습니다.");
            // 메뉴 목록 페이지로 이동
            router.push("/menus");

        } catch (error) {
            if (error.status === 401) logout();
            alert(error.message);
        }
    }

    return (
        <div>
            <h2>메뉴 등록</h2>
            <form onSubmit={handleSave} encType="multipart/form-data">
                <div>
                    <label htmlFor="name">메뉴 이름:</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="calories">칼로리:</label>
                    <input
                        type="number"
                        id="calories"
                        name="calories"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="description">설명:</label>
                    <textarea
                        id="description"
                        name="description"
                    />
                </div>

                {/* 백엔드에서도 이 필드명 "file"에 맞춰 업로드를 받아야 합니다. */}
                <div>
                    <label htmlFor="file">파일:</label>
                    <input
                        type="file"
                        id="file"
                        name="file"
                    />
                </div>

                <button type="submit">등록</button>
            </form>
        </div>
    );
}
