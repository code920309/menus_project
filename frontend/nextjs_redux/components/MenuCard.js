
/*
 * 이 파일은 메뉴 한 건을 카드 형태로 보여 주는 재사용 컴포넌트입니다.
 * 부모가 menu 객체를 prop으로 전달하면 이름, 칼로리, 설명을 표시합니다.
 */

// menu는 부모 컴포넌트가 전달하는 props 중 menu 항목을 구조 분해로 꺼낸 값입니다.
// default export는 이 파일의 대표 컴포넌트를 내보냅니다.
export default function MenuCard({ menu }) {
    return (
        <div className="card" >
            <h3>{menu.name}</h3>
            <p>칼로리: {menu.calories} kcal</p>
            <p>{menu.description}</p>
        </div>
    );
}
