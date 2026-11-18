"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import Link from "next/link";
import { removeMenu, voteMenu } from "@/store/menuSlice.mjs";

export default function MenuTablePaging({ menus, onRefresh }) {
    const dispatch = useDispatch();
    const [pagination, setPagination] = useState({ menus, page: 1 });
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(menus.length / pageSize));
    const currentPage = pagination.menus === menus ? pagination.page : 1;
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const currentMenus = menus.slice(startIndex, startIndex + pageSize);

    async function handleDelete(id) {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            // 서버에서 삭제 -> 성공하면 onRefresh(부모의 loadMenus -> fetchMenus)로 목록을 다시 받아
            // Store의 items가 갱신되고, 그 결과가 menus props로 내려와 표가 다시 그려집니다.
            await dispatch(removeMenu(id)).unwrap();
            await onRefresh();
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleRecommend(id) {
        try {
            // 추천수 증가도 삭제와 같은 패턴: 서버 변경 -> 목록 재조회 -> Store 갱신 -> 화면 반영
            await dispatch(voteMenu(id)).unwrap();
            await onRefresh();
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <div>
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
                    {currentMenus.length === 0 ? (
                        <tr>
                            <td colSpan={6}>표시할 메뉴가 없습니다.</td>
                        </tr>
                    ) : (
                        currentMenus.map((menu) => (
                            <tr key={menu.id}>
                                <td>{menu.id}</td>
                                <td>{menu.name}</td>
                                <td>{menu.calories} kcal</td>
                                <td>{menu.description}</td>
                                <td>
                                    {menu.recommendation ?? 0}
                                    <button onClick={() => handleRecommend(menu.id)}>
                                        추천
                                    </button>
                                </td>
                                <td>
                                    <Link href={`/menus/${menu.id}/edit`}>
                                        수정
                                    </Link>
                                    <button onClick={() => handleDelete(menu.id)}>
                                        삭제
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <nav className="menu-pagination" aria-label="메뉴 페이지">
                    <button
                        type="button"
                        onClick={() => setPagination({ menus, page: safePage - 1 })}
                        disabled={safePage === 1}
                    >
                        이전
                    </button>
                    <span aria-live="polite">
                        {safePage} / {totalPages} 페이지
                    </span>
                    <button
                        type="button"
                        onClick={() => setPagination({ menus, page: safePage + 1 })}
                        disabled={safePage === totalPages}
                    >
                        다음
                    </button>
                </nav>
            )}
        </div>
    );
}
