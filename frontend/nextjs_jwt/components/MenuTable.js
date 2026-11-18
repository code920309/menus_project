
"use client";

/*
 * 이 파일은 메뉴 배열을 표로 보여 주고, 메뉴 추천 및 삭제 작업을 제공합니다.
 * 작업이 끝나면 부모가 전달한 onRefresh 함수를 호출해 최신 목록을 요청합니다.
 */

// Next.js의 Link 컴포넌트로 메뉴 수정 경로에 연결합니다.
import Link from "next/link";
// 메뉴 삭제 및 추천 요청을 담당하는 프로젝트 내부 API 함수들입니다.
import { deleteMenu, recommendMenu } from "@/services/api";

// menus와 onRefresh는 부모가 전달하는 props입니다.
// default export는 이 표 컴포넌트를 다른 파일에서 기본 내보내기로 가져오게 합니다.
export default function MenuTable({ menus, onRefresh }) {
    async function handleDelete(id) {
        // 사용자가 취소하면 삭제 요청을 보내지 않고 함수를 끝냅니다.
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            await deleteMenu(id);
            await onRefresh();
        } catch (error) {
            alert(error.message);
        }
    }

    
    async function handleRecommend(id) {
        try {
            await recommendMenu(id);
            await onRefresh();
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>이름</th>
                    <th>칼로리</th>
                    <th>설명</th>
                    <th>추천</th>
                    <th>관리</th>
                </tr>
            </thead>

            <tbody>
                {/* map은 메뉴 배열을 표의 행들로 바꿉니다. 각 행에는 고유한 key가 필요합니다. */}
                {menus.map((menu) => (
                    <tr key={menu.id}>
                        <td>{menu.id}</td>
                        <td>{menu.name}</td>
                        <td>{menu.calories} kcal</td>
                        <td>{menu.description}</td>

                        <td>
                            {/* ??는 왼쪽 값이 null 또는 undefined일 때만 오른쪽 기본값 0을 사용합니다. */}
                            {menu.recommendation ?? 0}
                            {/* 클릭 시 현재 행 메뉴의 id를 넘겨 추천 요청을 실행합니다. */}
                            <button onClick={() => handleRecommend(menu.id)}>
                                추천
                            </button>
                        </td>

                        <td>
                            {/* 템플릿 문자열에 id를 끼워 메뉴별 수정 주소를 만듭니다. */}
                            <Link href={`/menus/${menu.id}/edit`}>
                                수정
                            </Link>

                            <button onClick={() => handleDelete(menu.id)}>
                                삭제
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
