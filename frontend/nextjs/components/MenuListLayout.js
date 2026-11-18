
"use client";

/*
 * 이 파일은 메뉴 검색 폼과 메뉴 표를 함께 보여 주는 목록 레이아웃 컴포넌트입니다.
 * 메뉴 조회와 검색을 수행하고, 검색어 및 결과 목록을 상태로 관리합니다.
 */

// React 상태 및 처음 화면이 표시된 후 목록을 조회하는 기능입니다.
import { useEffect, useState } from "react";
// 메뉴 전체 조회 및 검색에 사용하는 프로젝트 내부 API 함수입니다.
import {
    getAllMenus,
    searchMenus
} from "@/services/api";

// 조회한 메뉴를 표로 렌더링하는 컴포넌트입니다.
import MenuTable from "@/components/MenuTable_paging";

// default export는 이 파일의 대표 컴포넌트를 내보냅니다.
export default function MenusPage() {
    // 화면에 표시할 메뉴 배열과 사용자가 입력한 검색어를 상태로 저장합니다.
    const [menus, setMenus] = useState([]);
    const [keyword, setKeyword] = useState("");

    async function loadMenus() {
        try {
            // 검색어가 비어 있지 않으면 검색 API, 비어 있으면 전체 조회 API를 사용합니다.
            const data = keyword.trim()
                ? await searchMenus(keyword)
                : await getAllMenus();

            // 상태를 새 API 결과로 바꾸면 목록 표가 다시 렌더링됩니다.
            setMenus(data);
        } catch (error) {
            alert(error.message);
        }
    }

    // 빈 의존성 배열로 최초 마운트 때 한 번 전체 메뉴를 불러옵니다.
    useEffect(() => {
        loadMenus();
    }, []);

    function handleSearch(e) {
        // form의 기본 제출(브라우저 새로고침)을 취소하고 React 함수로 검색합니다.
        e.preventDefault();
        loadMenus();
    }

    return (
        <section>
            <form onSubmit={handleSearch}>
                <input
                    value={keyword}
                    // 입력 요소를 상태와 연결하는 제어 컴포넌트 방식입니다.
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="메뉴 검색"
                />

                <button type="submit">검색</button>
            </form>

            <MenuTable
                menus={menus}
                // 표에서 메뉴가 바뀐 뒤 최신 목록을 다시 가져오도록 함수를 prop으로 전달합니다.
                onRefresh={loadMenus}
            />
        </section>
    );
}
