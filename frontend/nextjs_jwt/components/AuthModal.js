"use client";

import { useEffect, useRef, useState } from "react";
import { signup } from "@/services/api";
import { useAuth } from "@/components/AuthProvider";

export default function AuthModal({ mode, onClose, onChangeMode }) {
    // ref는 다시 렌더링해도 같은 객체를 유지하며 실제 dialog DOM에 접근합니다.
    const dialog = useRef(null);
    // 오류가 생기면 메시지를 저장해 폼 안에 표시합니다. 처음에는 표시할 오류가 없습니다.
    const [error, setError] = useState("");
    // 가입 성공처럼 사용자에게 알려 줄 안내문을 저장합니다.
    const [message, setMessage] = useState("");
    // 요청 중에는 중복 제출이나 모달 닫기를 막기 위해 진행 상태를 저장합니다.
    const [busy, setBusy] = useState(false);
    // 공통 인증 Context에서 로그인 함수를 꺼내 성공 시 모든 화면의 상태를 갱신합니다.
    const { login } = useAuth();
    // 부모가 전달한 mode를 비교해 가입 폼인지 로그인 폼인지 결정합니다.
    const isSignup = mode === "signup";

    useEffect(() => {
        // showModal은 배경 조작을 막고 브라우저의 대화상자 포커스 관리를 사용합니다.
        // ref.current에는 렌더링된 dialog 요소가 들어 있습니다.
       // const element = dialog.current;
        //showModal()은 브라우저가 제공하는 HTML <dialog> 요소의 내장 메서드입니다.
        //if (!element.open) element.showModal(); //모달 열기

        const element = document.querySelector("#auth-dialog");
        element.showModal();
        
        // return () => element.close(); // 모달 닫기
    }, []);

    async function submit(event) {
        event.preventDefault();
        // 제출한 form을 보관해 입력값을 읽고 가입 성공 시 초기화합니다.
        const form = event.currentTarget;
        // FormData는 name 속성을 기준으로 폼의 입력값을 모읍니다.
        const fields = new FormData(form);
        // 가입과 로그인에 공통으로 필요한 이메일과 비밀번호입니다.
        const values = { email: fields.get("email"), password: fields.get("password") };
        setError("");
        setMessage("");
        setBusy(true);  // 요청 중 상태로 변경
        try {
            if (isSignup) {
                await signup({ ...values, phone: fields.get("phone") });
                form.reset();
                onChangeMode("login");
                setMessage("회원가입이 완료되었습니다. 로그인해 주세요.");
            } else {
                await login(values);
                onClose();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false); // 요청 완료 후 상태 초기화
        }
    }
    // dialog라는 태크를 useRef로 참조하고, useEffect에서 showModal을 호출해 모달을 표시합니다.  
    // Esc 키에 반응하는 이벤트는 onCancel에서 처리합니다.
    return (       
        <dialog ref={dialog} id="auth-dialog" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="auth-title">
            <form onSubmit={submit} className="auth-form">
                <h2 id="auth-title">{isSignup ? "회원가입" : "로그인"}</h2>
               {/* message에 내용이 있을 때만 문장을 화면에 표시하는 JSX 문법 */}
                {message && <p role="status">{message}</p>}
                {error && <p role="alert">{error}</p>}
                <label>이메일<input name="email" type="email" maxLength={254} required autoComplete="email" /></label>
                <label>비밀번호<input name="password" type="password" minLength={8} maxLength={128} required autoComplete={isSignup ? "new-password" : "current-password"} /></label>
                {isSignup && <label>연락처<input name="phone" type="tel" maxLength={30} required autoComplete="tel" /></label>}
                <div className="auth-actions">
                    <button type="submit" disabled={busy}>{isSignup ? "가입하기" : "로그인"}</button>
                    <button type="button" disabled={busy} onClick={onClose}>닫기</button>
                </div>
            </form>
        </dialog>
    );
}
