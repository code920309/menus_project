import { deleteTodo, updateTodo } from "@/lib/todoStore";

const statuses = new Set(["todo", "in_progress", "done"]);

export async function PATCH(request, { params }) {
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

    if (!statuses.has(body.status)) {
        return Response.json(
            { error: "상태 값이 올바르지 않습니다." },
            { status: 400 }
        );
    }

    const { id } = await params;

    try {
        const todo = await updateTodo(id, { status: body.status });

        if (!todo) {
            return Response.json(
                { error: "할 일을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        return Response.json({ todo });
    } catch (error) {
        console.error(`PATCH /api/todos/${id} failed:`, error);
        return Response.json(
            { error: "할 일 상태를 변경하지 못했습니다." },
            { status: 500 }
        );
    }
}

export async function DELETE(_request, { params }) {
    const { id } = await params;

    try {
        const deleted = await deleteTodo(id);

        if (!deleted) {
            return Response.json(
                { error: "할 일을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        return new Response(null, { status: 204 });
    } catch (error) {
        console.error(`DELETE /api/todos/${id} failed:`, error);
        return Response.json(
            { error: "할 일을 삭제하지 못했습니다." },
            { status: 500 }
        );
    }
}
