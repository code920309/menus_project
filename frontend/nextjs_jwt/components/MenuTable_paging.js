"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteMenu, getMenuAttachmentUrl, recommendMenu } from "@/services/api";

const imageFilePattern = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;

export default function MenuTablePaging({ menus, onRefresh }) {
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
        <div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>이름</th>
                        <th>칼로리</th>
                        <th>설명</th>
                        <th>첨부파일</th>
                        <th>추천</th>
                        <th>관리</th>
                    </tr>
                </thead>

                <tbody>
                    {currentMenus.length === 0 ? (
                        <tr>
                            <td colSpan={7}>표시할 메뉴가 없습니다.</td>
                        </tr>
                    ) : (
                        currentMenus.map((menu) => (
                            <tr key={menu.id}>
                                <td>{menu.id}</td>
                                <td>{menu.name}</td>
                                <td>{menu.calories} kcal</td>
                                <td>{menu.description}</td>
                                <td>
                                    {menu.attachment ? (
                                        <div className="menu-attachment">
                                            {imageFilePattern.test(menu.attachment.filename) && (
                                                /* eslint-disable-next-line @next/next/no-img-element -- 업로드한 원본을 API에서 직접 표시합니다.
                                                src가 FileResponse 객체를 직접 받는 게 아닙니다. 주소를 통해 요청하고, 서버가 응답한 파일 내용을 브라우저가 표시 */
                                                <img
                                                    src={getMenuAttachmentUrl(menu.id, true)}
                                                    alt={`${menu.name} 첨부 이미지`}
                                                    className="menu-attachment-thumbnail"
                                                    width={80}
                                                    height={80}
                                                    loading="lazy"  /*이미지가 화면 근처에 보일 때 브라우저가 불러오도록 하여 성능을 최적화합니다. */
                                                />
                                            )}
                                            <a href={getMenuAttachmentUrl(menu.id)}>
                                                {menu.attachment.filename} 다운로드
                                            </a>
                                        </div>
                                    ) : "-"}
                                </td>
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
