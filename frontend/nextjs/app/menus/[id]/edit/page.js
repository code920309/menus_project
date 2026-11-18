
"use client";

/*
 * 이 파일은 동적 경로 "/menus/[id]/edit"의 메뉴 수정 페이지입니다.
 * URL의 id로 메뉴를 조회하고, 수정 폼에서 저장한 내용을 API로 전달합니다.
 */

// React 상태 및 최초 렌더링 이후 메뉴를 가져오는 기능입니다.
import { useEffect, useState } from "react";
// Next.js에서 URL 매개변수와 페이지 이동 기능을 제공합니다.
import { useParams, useRouter } from "next/navigation";
// 메뉴 정보를 입력하고 저장을 요청하는 재사용 폼입니다.
import MenuModifyForm from "@/components/MenuModifyForm";

// 특정 메뉴를 조회하고 수정하는 프로젝트 내부 API 함수들입니다.
import {
    getMenuOne,
    updateMenu
} from "@/services/api";

// default export는 이 파일의 대표 페이지 컴포넌트를 내보냅니다.
export default function EditMenuPage() {
    // useParams()가 URL의 [id] 부분을 객체로 반환하고, 구조 분해로 id 값을 꺼냅니다.
    const { id } = useParams();  // 현재 URL의 동적 경로 값 가져오기
    const router = useRouter();  //페이지 이동 및 뒤로 가기 등 내비게이션 제어

    // 아직 조회 전에는 메뉴가 없으므로 null로 시작합니다.
    const [menu, setMenu] = useState(null);

    useEffect(() => {
        async function loadMenu() {
            try {
                const data = await getMenuOne(id);
                // 조회된 메뉴 객체를 저장해 폼에 전달합니다.
                setMenu(data);
            } catch (error) {
                alert(error.message);
            }
        }

        loadMenu();
        // URL의 id가 달라지면 해당 id의 메뉴를 다시 조회합니다.
    }, [id]);

    async function handleSave(menuObject) {
        try {
            // 폼에서 받은 수정 객체를 API에 보내고, 성공 후 목록 페이지로 이동합니다.
            await updateMenu(menuObject);
            alert("메뉴가 수정되었습니다.");
            router.push("/menus");
        } catch (error) {
            alert(error.message);
        }
    }

    // 조회가 끝나기 전에는 폼을 그리지 않고 로딩 안내를 보여 줍니다.
    if (!menu) return <p>메뉴 정보를 불러오는 중입니다.</p>;

    return (
        <section>
            <h2>메뉴 수정</h2>
            <MenuModifyForm
                initialData={menu}
                // 함수를 prop으로 전달하면 자식 폼에서 저장 시 부모의 저장 처리를 호출할 수 있습니다.
                onSave={handleSave}
            />
        </section>
    );
}
