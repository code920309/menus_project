import { createTodo, getTodos } from "@/lib/todoStore";

const priorities = new Set(["low", "medium", "high"]);

export async function GET() {
    try {
        const todos = await getTodos();
        return Response.json({ todos });
    } catch (error) {
        console.error("GET /api/todos failed:", error);
        return Response.json(
            { error: "할 일 목록을 불러오지 못했습니다." },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    let body;

    try {
        body = await request.json();
    } catch {
        return Response.json(
            { error: "요청 본문이 올바른 JSON이 아닙니다." },
            { status: 400 }
        );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return Response.json(
            { error: "요청 본문은 JSON 객체여야 합니다." },
            { status: 400 }
        );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
        typeof body.description === "string" ? body.description.trim() : "";
    const priority = body.priority;

    if (!title || title.length > 120) {
        return Response.json(
            { error: "제목은 1자 이상 120자 이하로 입력해 주세요." },
            { status: 400 }
        );
    }

    if (description.length > 500) {
        return Response.json(
            { error: "설명은 500자 이하로 입력해 주세요." },
            { status: 400 }
        );
    }

    if (!priorities.has(priority)) {
        return Response.json(
            { error: "우선순위 값이 올바르지 않습니다." },
            { status: 400 }
        );
    }

    try {
        const todo = await createTodo({ title, description, priority });
        return Response.json({ todo }, { status: 201 });
    } catch (error) {
        console.error("POST /api/todos failed:", error);
        return Response.json(
            { error: "할 일을 저장하지 못했습니다." },
            { status: 500 }
        );
    }
}
