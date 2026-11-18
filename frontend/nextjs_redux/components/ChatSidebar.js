
"use client";

/*
 * 이 파일은 AI 메뉴 도우미의 채팅 사이드바 UI입니다.
 * 질문 입력, 대화 메시지 표시, API 응답 대기를 담당합니다.
 */

// 입력값과 대화 목록, 요청 중 여부를 React 상태로 관리합니다.
import { useState } from "react";
// 질문을 서버에 보내고 AI 응답을 받는 프로젝트 내부 API 함수입니다.
import { sendChat } from "@/services-not_used/api";

// default export는 다른 파일에서 기본 이름으로 가져올 수 있는 대표 내보내기입니다.
export default function ChatSidebar() {
    // 각 useState는 해당 UI 값과 갱신 함수를 한 쌍으로 만듭니다.
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);

    // 메시지는 role(작성자 역할)과 content(본문)를 가진 객체들의 배열입니다.
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "안녕하세요! 음식 메뉴에 관해 질문해 주세요."
        }
    ]);

    async function handleSend() {
        // trim()은 질문 앞뒤 공백을 제거합니다. 빈 질문이나 진행 중인 중복 요청은 보내지 않습니다.
        const text = question.trim();

        if (!text || loading) return;

        // 이전 상태를 인수로 받으면 최신 메시지 목록을 기준으로 안전하게 갱신할 수 있습니다.
        // [...prev, 새 항목]은 기존 배열을 직접 수정하지 않고 새 배열 끝에 메시지를 추가합니다.
        setMessages((prev) => [
            ...prev,
            { role: "user", content: text }
        ]);

        setQuestion("");
        setLoading(true);

        try {
            const result = await sendChat(text);

            // 서버 응답도 새 배열을 만들어 대화 목록의 마지막에 추가합니다.
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: result.answer }
            ]);
        } catch (error) {
            // 요청 실패도 대화에 표시하여 사용자에게 오류를 알립니다.
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `오류가 발생했습니다. ${error.message}`
                }
            ]);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e) {
        // Enter 단독 입력은 전송, Shift+Enter는 줄바꿈으로 사용합니다.
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <aside className="chat-sidebar">
            <h2>AI 메뉴 도우미</h2>

            <div className="chat-messages">
                {messages.map((message, index) => (
                    // map으로 메시지 객체를 화면 요소로 만들고, key로 각 항목을 구분합니다.
                    <div
                        key={index}
                        className={
                            message.role === "user"
                                ? "user-message"
                                : "bot-message"
                        }
                    >
                        {message.content}
                    </div>
                ))}

                {loading && (
                    <div className="bot-message">
                        답변을 생각하고 있습니다...
                    </div>
                )}
            </div>

            <div className="chat-input-area">
                <textarea
                    value={question}
                    // 상태와 입력 요소를 연결해 입력할 때마다 question을 갱신합니다.
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메뉴에 관해 질문하세요."
                    rows={2}
                />

                <button
                    onClick={handleSend}
                    disabled={loading || !question.trim()}
                >
                    전송
                </button>
            </div>
        </aside>
    );
}
