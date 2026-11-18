
/*
 * 이 파일은 모든 페이지 상단에 공통으로 표시되는 사이트 제목과 내비게이션입니다.
 */

// Next.js의 Link는 페이지 전체를 다시 불러오지 않고 앱 내부 경로를 이동하게 합니다.
import Link from "next/link";

// default export는 이 컴포넌트를 다른 파일에서 중괄호 없이 가져오게 합니다.
export default function Header() {
    return (
        <header className="header">
            <h1>음식 메뉴 관리 시스템</h1>

            <nav>
                <Link href="/">홈</Link>
                <Link href="/menus">전체 메뉴</Link>
                <Link href="/menus/new">메뉴 등록</Link>
            </nav>
        </header>
    );
}
