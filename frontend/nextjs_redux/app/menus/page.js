
"use client";

/*
 * 이 파일은 전체 메뉴 목록 페이지("/menus")입니다.
 * 메뉴를 검색하거나 전체 목록을 조회해 MenuTable에 전달합니다.
 * 상태와 이벤트 처리를 사용하므로 클라이언트 컴포넌트입니다.
 */

// 검색어는 화면 상태로, 메뉴 목록은 Redux Store에서 관리합니다.
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMenus } from "@/store/menuSlice.mjs";

// 메뉴 배열을 표 형태로 표시하는 자식 컴포넌트입니다.
import MenuTable from "@/components/MenuTable_paging";

// default export는 이 파일의 대표 컴포넌트를 Next.js 페이지로 내보냅니다.
export default function MenusPage() {
    // 메뉴 목록을 Store에서 읽고 검색어는 이 페이지에서 관리합니다.
    /*
     * [Redux 동작 흐름]
     * useSelector: Store의 state.menus.items를 구독합니다. 값이 바뀌면 이 컴포넌트만 자동 리렌더링됩니다.
     * dispatch(fetchMenus(keyword)): 서버 호출 -> fulfilled 시 reducer가 items를 교체 -> menus가 바뀌어 표가 갱신됩니다.
     * 이전에는 setMenus(data)로 직접 상태를 바꿨지만, 이제 반환값을 받아 set하지 않고 Store가 단일 출처가 됩니다.
     * keyword(입력창 값)는 이 페이지에서만 쓰는 임시 값이라 여전히 useState로 둡니다.
     */
    const dispatch = useDispatch();
    const menus = useSelector((state) => state.menus.items);
    const [keyword, setKeyword] = useState("");

    async function loadMenus() {
        try {
            // unwrap(): 성공하면 payload 반환, 실패(rejected)면 예외를 던져 아래 catch의 alert로 갑니다.
            // 반환값(목록)은 쓰지 않습니다. 이미 reducer가 Store의 items에 넣었기 때문입니다.
            await dispatch(fetchMenus(keyword)).unwrap();
        } catch (error) {
            alert(error.message);
        }
    }

    // 페이지가 나타나면 전체 목록을 불러옵니다.
    useEffect(() => {
        dispatch(fetchMenus("")).unwrap().catch((error) => alert(error.message));
    }, [dispatch]);

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
