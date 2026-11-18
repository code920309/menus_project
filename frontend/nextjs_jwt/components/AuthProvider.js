"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, login as loginRequest } from "@/services/api";

// Context는 서로 떨어진 헤더와 페이지에 같은 인증 상태를 전달합니다.
const AuthContext = createContext(null);
// 토큰을 저장하고 다시 찾을 때 같은 sessionStorage 키를 사용합니다.
const TOKEN_KEY = "menus_access_token";

export function AuthProvider({ children }) {
    // 서버가 확인한 사용자 정보이며 null이면 로그인된 사용자가 없습니다.
    const [user, setUser] = useState(null);
    // 보호된 API에 보낼 JWT이며 초기에는 없습니다.
    const [token, setToken] = useState(null);
    // 저장된 토큰의 검사 완료 전에는 손님으로 성급하게 판단하지 않습니다.
    const [loading, setLoading] = useState(true);
    // 인증 상태 복원 중 서버 통신에 실패한 이유를 화면에 알립니다.
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        // 새로고침 후에는 저장된 값 자체를 믿지 않고 서버에 서명과 만료를 확인합니다.
        const saved = sessionStorage.getItem(TOKEN_KEY);
        // 정리 이후에 응답이 도착해도 이전 effect가 상태를 바꾸지 않게 합니다.
        let active = true;
        // 토큰이 없을 때도 Promise로 처리해 공통 완료 처리로 연결합니다.
        const verification = saved ? getCurrentUser(saved) : Promise.resolve(null);
        verification.then((verifiedUser) => {
            if (active && verifiedUser) {
                setToken(saved);
                setUser(verifiedUser);
            }
        }).catch((error) => {
            if (active) {
                if (error.status === 401) sessionStorage.removeItem(TOKEN_KEY);
                else setAuthError("로그인 상태를 확인하지 못했습니다. 서버를 확인한 후 새로고침하세요.");
            }
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, []);

    async function login(values) {
        // 서버 응답에서 발급된 토큰과 확인된 사용자 정보를 함께 받습니다.
        const result = await loginRequest(values);
        // sessionStorage는 이 탭의 새로고침에는 유지되고 탭을 닫으면 제거됩니다.
        sessionStorage.setItem(TOKEN_KEY, result.access_token);
        setToken(result.access_token);
        setUser(result.user);
        setAuthError("");
    }

    function logout() {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setAuthError("");
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, authError, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
