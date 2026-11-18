'use client';

import { useState } from 'react';

export default function MenuNamePreviewPage() {
    // ============================================================
    // 예제 1: 문자열 state 하나를 새 메뉴 이름으로 바꾸기
    // ============================================================
    const [menuName, setMenuName] = useState('김치찌개');
    const [inputMenuName, setInputMenuName] = useState('');

    function handleChangeMenu(event) {
        event.preventDefault();

        const newMenuName = inputMenuName.trim();
        if (!newMenuName) return;

        setMenuName(newMenuName);
        setInputMenuName('');
    }

    // ============================================================
    // 예제 2: 문자열 배열에 새 메뉴 이름을 추가하기
    // ============================================================
    const [menus, setMenus] = useState(['김치찌개', '불고기', '비빔밥']);
    const [newMenu, setNewMenu] = useState('');

    function handleAddMenu(event) {
        event.preventDefault();

        const menuToAdd = newMenu.trim();
        if (!menuToAdd) return;

        setMenus((currentMenus) => [...currentMenus, menuToAdd]);
        setNewMenu('');
    }

    // ============================================================
    // 예제 3: 메뉴 이름과 가격을 객체 배열에 추가하기
    // ============================================================
    const [menuItems, setMenuItems] = useState([
        { id: 1, name: '김밥', price: 3500 },
        { id: 2, name: '라면', price: 4000 },
        { id: 3, name: '떡볶이', price: 5000 },
    ]);
    const [newMenuName, setNewMenuName] = useState('');
    const [newMenuPrice, setNewMenuPrice] = useState('');
    const [nextMenuId, setNextMenuId] = useState(4);

    function handleAddMenuItem(event) {
        event.preventDefault();

        const name = newMenuName.trim();
        const price = Number(newMenuPrice);
        if (!name || newMenuPrice === '' || !Number.isFinite(price) || price < 0) {
            return;
        }

        setMenuItems((currentMenuItems) => [
            ...currentMenuItems,
            { id: nextMenuId, name, price },
        ]);
        setNextMenuId((currentId) => currentId + 1);
        setNewMenuName('');
        setNewMenuPrice('');
    }

    return (
        <main>
            {/* ========================================================
                예제 1 화면: 메뉴 하나를 입력한 이름으로 교체합니다.
                ======================================================== */}
            <section>
                <h1>예제 1: 메뉴 하나 바꾸기</h1>
                <p>현재 메뉴: {menuName}</p>

                <form onSubmit={handleChangeMenu}>
                    <label htmlFor="menu-name">새 메뉴 이름: </label>
                    <input
                        id="menu-name"
                        value={inputMenuName}
                        onChange={(event) => setInputMenuName(event.target.value)}
                        placeholder="메뉴 이름을 입력하세요"
                    />
                    <button type="submit" disabled={!inputMenuName.trim()}>
                        메뉴 바꾸기
                    </button>
                </form>
            </section>

            <hr />

            {/* ========================================================
                예제 2 화면: 입력한 메뉴를 기존 메뉴 배열 끝에 추가합니다.
                ======================================================== */}
            <section>
                <h2>예제 2: 메뉴 목록에 추가하기</h2>
                <ul>
                    {menus.map((menu, index) => (
                        <li key={index}>{menu}</li>
                    ))}
                </ul>

                <form onSubmit={handleAddMenu}>
                    <label htmlFor="new-menu">추가할 메뉴 이름: </label>
                    <input
                        id="new-menu"
                        value={newMenu}
                        onChange={(event) => setNewMenu(event.target.value)}
                        placeholder="메뉴 이름을 입력하세요"
                    />
                    <button type="submit" disabled={!newMenu.trim()}>
                        메뉴 추가
                    </button>
                </form>
            </section>

            <hr />

            {/* ========================================================
                예제 3 화면: 메뉴명과 가격을 객체 하나로 만들어 목록에 추가합니다.
                ======================================================== */}
            <section>
                <h2>예제 3: 메뉴명과 가격 추가하기</h2>
                <ul>
                    {menuItems.map((menu) => (
                        <li key={menu.id}>
                            {menu.name} - {menu.price.toLocaleString('ko-KR')}원
                        </li>
                    ))}
                </ul>

                <form onSubmit={handleAddMenuItem}>
                    <label htmlFor="menu-item-name">메뉴명: </label>
                    <input
                        id="menu-item-name"
                        value={newMenuName}
                        onChange={(event) => setNewMenuName(event.target.value)}
                        placeholder="메뉴 이름"
                        required
                    />

                    <label htmlFor="menu-item-price">가격: </label>
                    <input
                        id="menu-item-price"
                        type="number"
                        min="0"
                        step="1"
                        value={newMenuPrice}
                        onChange={(event) => setNewMenuPrice(event.target.value)}
                        placeholder="가격"
                        required
                    />

                    <button type="submit">
                        메뉴와 가격 추가
                    </button>
                </form>
            </section>
        </main>
    );
}
