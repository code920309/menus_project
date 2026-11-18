
"use client";

// default export로 폼 컴포넌트를 내보냅니다.
export default function MenuInputForm({ onSave }) {

    function handleSave(event) {
        event.preventDefault();

        // 폼 입력값과 파일을 FormData로 수집
        const formData = new FormData(event.currentTarget);

        // 신규 메뉴 ID 설정
        formData.set("id", "0");

        // 파일을 선택하지 않았다면 빈 파일 제외
        const file = formData.get("file");

        if (file instanceof File && file.name === "") {
            formData.delete("file");
        }

        // 부모에게 FormData 전달
        onSave(formData);
    }

    return (
        <div>
            <h2>메뉴 등록</h2>

            <form onSubmit={handleSave} encType="multipart/form-data">
                <div>
                    <label htmlFor="name">메뉴 이름:</label>
                    <input type="text" id="name" name="name" required />
                </div>

                <div>
                    <label htmlFor="calories">칼로리:</label>
                    <input type="number" id="calories" name="calories" required />
                </div>

                <div>
                    <label htmlFor="description">설명:</label>
                    <textarea id="description" name="description" />
                </div>

                <div>
                    <label htmlFor="file">파일:</label>
                    <input type="file" id="file" name="file" />
                </div>

                <button type="submit">등록</button>
            </form>
        </div>
    );
}
