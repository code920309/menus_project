
"use client";

/*
 * 이 파일은 새 메뉴 등록 페이지("/menus/new")입니다.
 * 메뉴 입력 폼을 페이지 안에 배치하며 실제 입력 및 등록 처리는 폼 컴포넌트가 담당합니다.
 */

// 사용자가 메뉴 정보를 입력할 수 있는 폼 컴포넌트입니다.
import MenuInputForm from "@/components/MenuInputForm";
import { useAuth } from "@/components/AuthProvider";

// default export는 Next.js가 이 파일을 등록 페이지로 사용할 수 있도록 대표 컴포넌트를 내보냅니다.
export default function NewMenuPage() { 
    // 인증 확인 중인지와 로그인 사용자가 있는지에 따라 안내 또는 폼을 표시합니다.
    const { user, loading } = useAuth();
    return (
        <section>
            <h2>새 메뉴 등록</h2>
            {loading ? <p>로그인 상태를 확인하는 중입니다.</p>
                : user ? <MenuInputForm />
                : <p>메뉴를 등록하려면 상단에서 로그인해 주세요.</p>}
        </section>
    );
}


//콜백방식으로 개발한다면
//콜백 방식을 사용하는 이유는 자식 컴포넌트가 부모 컴포넌트의 기능을 실행할 수 있도록 하기 위해서입니다.
//React의 부모와 자식 관계를 이해하면 자연스럽게 이해할 수 있습니다.

// 1. 왜 콜백 함수가 필요할까요?  
// 현재 컴포넌트가 두 개 있습니다.  컴포넌트의 계층 구조와 책임 분리(Separation of Concerns) 문제
// NewMenuPage: 메뉴 등록 페이지
// MenuInputForm: 메뉴 입력 폼
// 각 컴포넌트의 역할을 생각해 보겠습니다.

// 컴포넌트 담당 역할
// 부모(NewMenuPage)
// API 통신, 페이지 이동

// 자식(MenuInputForm)
// 사용자 입력, 입력값 전달
/*
NewMenuPage.jsx
"use client";

import MenuInputForm from "@/components/MenuInputForm";
import { addMenu } from "@/services/api";
import { useRouter } from "next/navigation";

export default function NewMenuPage() {

    const router = useRouter();

    // 메뉴 등록 함수
    async function handleSave(menuObject) {
        try {
            await addMenu(menuObject);

            alert("메뉴가 등록되었습니다.");

            router.push("/menus");

        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <section>
            <h2>새 메뉴 등록</h2>

            <MenuInputForm handleSave={handleSave} />
        </section>
    );
}

MenuInputForm.jsx
"use client";

export default function MenuInputForm({ handleSave }) {

    function submitForm(event) {

        // 기본 새로고침 방지
        event.preventDefault();

        // FormData 가져오기
        const formData = new FormData(event.target);

        // 객체 생성
        const menuObject = {
            name: formData.get("name"),
            calories: Number(formData.get("calories")),
            description: formData.get("description")
        };

        // 부모 컴포넌트의 함수 호출
        handleSave(menuObject);
    }

    return (
        <div>
            <form onSubmit={submitForm}>
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

                <button type="submit">등록</button>
            </form>
        </div>
    );
}*/