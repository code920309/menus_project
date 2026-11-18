
"use client";

/*
 * 이 파일은 전체 메뉴 목록 페이지("/menus")입니다.
 * 메뉴를 검색하거나 전체 목록을 조회해 MenuTable에 전달합니다.
 * 상태와 이벤트 처리를 사용하므로 클라이언트 컴포넌트입니다.
 */

// React의 화면 상태 관리와 최초 표시 후 데이터 조회에 사용하는 기능입니다.
import { useEffect, useState } from "react";
// 메뉴 조회와 검색을 담당하는 프로젝트 내부 API 함수들입니다.
import {
    getAllMenus,
    searchMenus
} from "@/services/api";

// 메뉴 배열을 표 형태로 표시하는 자식 컴포넌트입니다.
import MenuTable from "@/components/MenuTable_paging";

// default export는 이 파일의 대표 컴포넌트를 Next.js 페이지로 내보냅니다.
export default function MenusPage() {
    // 메뉴 목록과 검색어를 각각 React 상태로 관리합니다.
    const [menus, setMenus] = useState([]);
    const [keyword, setKeyword] = useState("");

    async function loadMenus() {
        try {
            // trim()으로 앞뒤 공백을 제거한 뒤, 검색어가 있으면 검색하고 없으면 전체 목록을 요청합니다.
            const data = keyword.trim()
                ? await searchMenus(keyword)
                : await getAllMenus();

            // 받은 배열로 상태를 바꾸어 표를 새 데이터로 다시 그립니다.
            setMenus(data);
        } catch (error) {
            alert(error.message);
        }
    }

    // 빈 의존성 배열은 컴포넌트가 처음 화면에 나타날 때 목록을 불러오게 합니다.
    useEffect(() => {
        loadMenus();
    }, []);

    function handleSearch(e) {
        // form의 기본 제출 동작(페이지 새로고침)을 막고 직접 검색을 처리합니다.
        e.preventDefault();
        loadMenus();
    }

    return (
        <section>
            <h2>전체 메뉴 목록</h2>
            <form onSubmit={handleSearch}>
                <input
                    value={keyword}
                    // 입력값을 상태에 저장하는 제어 컴포넌트 방식입니다.
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="메뉴 검색"
                />
                <button type="submit">검색</button>
            </form>
            <MenuTable
                menus={menus}
                // 자식 표가 메뉴를 변경한 뒤 부모의 목록 조회 함수를 다시 실행하도록 전달합니다.
                onRefresh={loadMenus}
            />
        </section>
    );
}
