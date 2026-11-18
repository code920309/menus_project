async function request(url, options) {
    const response = await fetch(url, {
        ...options,
        cache: "no-store",
        headers: {
            ...(options?.headers ?? {}),
            "Content-Type": "application/json",
        },
    });

    if (response.status === 204) {
        return null;
    }

    let result;
    try {
        result = await response.json();
    } catch (error) {
        throw new Error(`서버 응답을 읽지 못했습니다: ${error.message}`);
    }

    if (!response.ok) {
        throw new Error(result.error || `요청에 실패했습니다 (${response.status}).`);
    }

    return result;
}

export async function getTodos() {
    const result = await request("/api/todos");
    return result.todos;
}

export async function createTodo(todo) {
    const result = await request("/api/todos", {
        method: "POST",
        body: JSON.stringify(todo),
    });
    return result.todo;
}

export async function updateTodo(id, updates) {
    const result = await request(`/api/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
    });
    return result.todo;
}

export function deleteTodo(id) {
    return request(`/api/todos/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}
