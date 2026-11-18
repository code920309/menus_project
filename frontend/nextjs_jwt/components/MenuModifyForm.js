'use client';

/*
 * 이 파일은 기존 메뉴의 이름, 칼로리, 설명을 수정하는 폼입니다.
 * 초기 메뉴 정보와 저장 콜백을 부모로부터 받아 입력값을 관리합니다.
 */

// 입력값 각각을 React 상태로 관리하는 기능입니다.
import { useState } from "react";

// initialData와 onSave는 부모 페이지가 이 컴포넌트에 전달하는 props입니다.
// default export는 이 폼을 다른 파일에서 기본 내보내기로 가져오게 합니다.
export default function MenuModifyForm({ initialData, onSave }) {
    // 폼 상태를 기존 메뉴 값으로 초기화합니다.
    const [name, setName] = useState(initialData.name);
    const [calories, setCalories] = useState(initialData.calories);
    const [description, setDescription] = useState(initialData.description);

    function handleSubmit(event) {
        // 브라우저의 기본 form 제출과 전체 페이지 새로고침을 막습니다.
        event.preventDefault();
        // 입력 상태를 서버가 받을 메뉴 객체로 모읍니다. id는 수정할 기존 메뉴를 식별합니다.
        const menuObject = {
            id: initialData.id,
            name,
            calories: Number(calories),
            description
        };
        // 실제 API 저장은 부모가 전달한 콜백에 맡겨 폼 입력과 페이지 흐름을 분리합니다.
        onSave(menuObject);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label htmlFor="name">메뉴 이름:</label>
                <input
                    id="name"
                    value={name}
                    // 입력할 때마다 상태를 갱신하여 화면 값과 React 상태를 일치시킵니다.
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="calories">칼로리:</label>
                <input
                    id="calories"
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="description">설명:</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
            <button type="submit">저장</button>
        </form>
    );
}