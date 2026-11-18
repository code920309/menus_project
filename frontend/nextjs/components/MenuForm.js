"use client";

import { useState } from "react";

export default function MenuForm({ initialData = null, onSave }) {

    const [name, setName] = useState(initialData?.name || "");
    const [calories, setCalories] = useState(initialData?.calories || "");
    const [description, setDescription] = useState(initialData?.description || "");

    const isModify = initialData !== null;

    function handleSubmit(event) {
        event.preventDefault();

        const menuObject = {
            id: initialData?.id || 0,
            name,
            calories: Number(calories),
            description
        };

        onSave(menuObject);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>메뉴 이름:</label>
                <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            <div>
                <label>칼로리:</label>
                <input
                    type="number"
                    name="calories"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    required
                />
            </div>

            <div>
                <label>설명:</label>
                <textarea
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <button type="submit">
                {isModify ? "수정" : "등록"}
            </button>
        </form>
    );
}