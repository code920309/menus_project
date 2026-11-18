
/*
 * 이 파일은 Next.js 앱 전체에 공통으로 적용되는 최상위 레이아웃입니다.
 * Next.js의 App Router는 layout.js와 page.js라는 파일 규칙을 통해 페이지 구조를 관리합니다.
 * layout.js는 공통 레이아웃을 정의하는 파일이고, page.js는 각 페이지의 내용을 정의하는 파일입니다.
 * 공통 CSS, 헤더, 채팅 사이드바를 배치하고 현재 페이지를 children 위치에 표시합니다.
 * 우리가 웹사이트를 만들 때 모든 페이지를 각각 독립적으로 만들면 헤더나 사이드바를 계속 반복해서 작성해야 합니다.
 * 그래서 가장 바깥쪽에 공통 레이아웃이라는 부모 컴포넌트를 만듭니다.
 * 부모 컴포넌트는 공통적인 화면 구조를 가지고 있고, 그 안에 자식 페이지가 들어갈 자리를 만들어 둡니다.
 * Next.js에서는 이 자리를 children이라고 합니다.
 * 사용자가 다른 페이지로 이동하면 공통 레이아웃은 유지하면서 children에 들어가는 페이지 내용이 바뀌는 것입니다.
 */

// 앱 전체에 적용할 전역 CSS 파일을 불러옵니다.
import "./globals.css";

// 모든 페이지 위쪽에 표시할 공통 헤더입니다.
import Header from "@/components/Header";
// 모든 페이지 옆에 표시할 채팅 사이드바입니다.
import ChatSidebar from "@/components/ChatSidebar";

// export default는 이 파일의 대표 컴포넌트를 내보내며, Next.js는 app/layout.js 규칙에 따라 루트 레이아웃으로 사용합니다.
// children은 현재 URL에 해당하는 페이지 내용이 Next.js로부터 전달되는 prop입니다.
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <div className="app-layout">
          <ChatSidebar />
          <main className="main-area">
            {/* 페이지마다 달라지는 내용은 공통 레이아웃의 이 자리에 들어옵니다. */}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
