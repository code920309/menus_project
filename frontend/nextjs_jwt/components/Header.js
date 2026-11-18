"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";

export default function Header() {
    // 헤더가 공통 인증 상태를 표시하고 로그아웃을 호출하도록 Context에서 꺼냅니다.
    const { user, loading, authError, logout } = useAuth();
    // null은 닫힘, signup과 login은 각각 열 모달의 종류입니다.
    const [modal, setModal] = useState(null);

    return (
        <header className="header">
            <div className="header-auth">
                <span aria-live="polite">user : {loading ? "확인 중" : user ? `${user.name}님` : "손님"}</span>
                {user ? (
                    <button type="button" onClick={logout}>로그아웃</button>
                ) : (
                    <>
                        <button type="button" disabled={loading} onClick={() => setModal("signup")}>회원가입</button>
                        <button type="button" disabled={loading} onClick={() => setModal("login")}>로그인</button>
                    </>
                )}
            </div>
            {authError && <p role="alert">{authError}</p>}
            <h1>음식 메뉴 관리 시스템</h1>
            <nav>
                <Link href="/">홈</Link>
                <Link href="/menus">전체 메뉴</Link>
                <Link href="/menus/new">메뉴 등록</Link>
            </nav>
            {modal && <AuthModal mode={modal} onClose={() => setModal(null)} onChangeMode={setModal} />}
                {/*modal에 값이 있을 때만 회원가입 또는 로그인 모달을 표시합니다.
                modal &&: modal이 null이면 표시하지 않고, 값이 있으면 <AuthModal />을 표시합니다.
                mode={modal}: "signup" 또는 "login"을 전달해 모달 종류를 정합니다.
                onClose={() => setModal(null)}: 자식이 onClose()를 호출하면 modal이 null이 되어 모달이 닫힙니다.
                onChangeMode={setModal}: 자식이 onChangeMode("login")을 호출하면 로그인 모달로 바뀝니다. 현재는 회원가입 성공 후 사용합니다.
                즉, 부모인 Header가 모달 상태를 관리하고, 자식인 AuthModal은 전달받은 함수를 호출해 상태 변경을 요청합니다.*/}
        </header>
    );
}
