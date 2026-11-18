"use client";

import { useEffect, useMemo, useState } from "react";
import {
    createTodo,
    deleteTodo,
    getTodos,
    updateTodo,
} from "@/services/todoApi";

const columns = [
    {
        id: "todo",
        title: "해야 할 일",
        description: "시작 전",
        style: "border-slate-200 bg-slate-50",
        marker: "bg-slate-400",
        count: "bg-slate-200 text-slate-700",
    },
    {
        id: "in_progress",
        title: "진행 중",
        description: "지금 하고 있어요",
        style: "border-blue-200 bg-blue-50",
        marker: "bg-blue-500",
        count: "bg-blue-100 text-blue-700",
    },
    {
        id: "done",
        title: "완료",
        description: "잘 해냈어요",
        style: "border-emerald-200 bg-emerald-50",
        marker: "bg-emerald-500",
        count: "bg-emerald-100 text-emerald-700",
    },
];

const priorityLabels = {
    low: "낮음",
    medium: "보통",
    high: "높음",
};

const priorityStyles = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
};

export default function TodoApp() {
    const [todos, setTodos] = useState([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingTodoId, setPendingTodoId] = useState(null);
    const [draggingTodoId, setDraggingTodoId] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let isCurrent = true;

        async function loadTodos() {
            try {
                const data = await getTodos();
                if (isCurrent) setTodos(data);
            } catch (requestError) {
                if (isCurrent) setError(requestError.message);
            } finally {
                if (isCurrent) setIsLoading(false);
            }
        }

        loadTodos();
        return () => {
            isCurrent = false;
        };
    }, []);

    const remainingCount = todos.filter((todo) => todo.status !== "done").length;
    const visibleTodos = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

        return todos.filter((todo) =>
            `${todo.title} ${todo.description}`
                .toLocaleLowerCase("ko-KR")
                .includes(normalizedQuery)
        );
    }, [query, todos]);

    async function handleSubmit(event) {
        event.preventDefault();
        const trimmedTitle = title.trim();

        if (!trimmedTitle || isSaving) return;

        setIsSaving(true);
        setError("");

        try {
            const newTodo = await createTodo({
                title: trimmedTitle,
                description: description.trim(),
                priority,
            });
            setTodos((currentTodos) => [newTodo, ...currentTodos]);
            setTitle("");
            setDescription("");
            setPriority("medium");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleMove(todoId, nextStatus) {
        const todo = todos.find((item) => item.id === todoId);
        if (
            !todo ||
            todo.status === nextStatus ||
            pendingTodoId !== null
        ) {
            return;
        }

        setPendingTodoId(todoId);
        setError("");

        try {
            const updatedTodo = await updateTodo(todoId, { status: nextStatus });
            setTodos((currentTodos) =>
                currentTodos.map((item) =>
                    item.id === updatedTodo.id ? updatedTodo : item
                )
            );
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setPendingTodoId(null);
            setDraggingTodoId(null);
        }
    }

    function handleDragStart(event, todoId) {
        if (pendingTodoId !== null) {
            event.preventDefault();
            return;
        }

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", todoId);
        setDraggingTodoId(todoId);
    }

    function handleDrop(event, status) {
        event.preventDefault();
        const todoId = event.dataTransfer.getData("text/plain");
        setDraggingTodoId(null);

        if (todoId) {
            handleMove(todoId, status);
        }
    }

    async function handleDelete(todoId) {
        if (pendingTodoId !== null) return;

        setPendingTodoId(todoId);
        setError("");

        try {
            await deleteTodo(todoId);
            setTodos((currentTodos) =>
                currentTodos.filter((todo) => todo.id !== todoId)
            );
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setPendingTodoId(null);
        }
    }

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-sm font-semibold tracking-wide text-indigo-600">
                            NEXT.JS LEARNING PROJECT
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            오늘의 할 일
                        </h1>
                        <p className="mt-2 text-slate-600">
                            카드를 옮기며 진행 상황을 관리해 보세요.
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-sm text-slate-500">남은 할 일</p>
                        <p className="mt-1 text-2xl font-bold text-indigo-600">
                            {remainingCount}
                            <span className="ml-1 text-sm font-medium text-slate-500">
                                / {todos.length}
                            </span>
                        </p>
                    </div>
                </header>

                <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
                    <h2 className="mb-5 text-lg font-semibold">새 할 일 추가</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="todo-title"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                제목
                            </label>
                            <input
                                id="todo-title"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                maxLength={120}
                                required
                                placeholder="예: Next.js 페이지 만들기"
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                            <div>
                                <label
                                    htmlFor="todo-description"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    설명 <span className="font-normal text-slate-400">(선택)</span>
                                </label>
                                <input
                                    id="todo-description"
                                    value={description}
                                    onChange={(event) =>
                                        setDescription(event.target.value)
                                    }
                                    maxLength={500}
                                    placeholder="추가로 기억할 내용"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="todo-priority"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    우선순위
                                </label>
                                <select
                                    id="todo-priority"
                                    value={priority}
                                    onChange={(event) =>
                                        setPriority(event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                >
                                    <option value="high">높음</option>
                                    <option value="medium">보통</option>
                                    <option value="low">낮음</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving || !title.trim()}
                                className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? "저장 중..." : "할 일 추가"}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold">칸반 보드</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            카드를 드래그하거나 카드의 상태 선택 메뉴로 이동하세요.
                        </p>
                    </div>
                    <label className="sr-only" htmlFor="todo-search">
                        할 일 검색
                    </label>
                    <input
                        id="todo-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="할 일 검색"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:max-w-xs"
                    />
                </section>

                {error && (
                    <p
                        role="alert"
                        className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    >
                        {error}
                    </p>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {columns.map((column) => {
                        const columnTodos = visibleTodos.filter(
                            (todo) => todo.status === column.id
                        );
                        const totalInColumn = todos.filter(
                            (todo) => todo.status === column.id
                        ).length;

                        return (
                            <section
                                key={column.id}
                                aria-labelledby={`column-${column.id}`}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(event) => handleDrop(event, column.id)}
                                className={`min-h-72 rounded-2xl border p-4 transition-colors ${column.style} ${
                                    draggingTodoId
                                        ? "ring-2 ring-indigo-200"
                                        : ""
                                }`}
                            >
                                <header className="mb-4 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5">
                                        <span
                                            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${column.marker}`}
                                        />
                                        <div>
                                            <h3
                                                id={`column-${column.id}`}
                                                className="font-semibold text-slate-800"
                                            >
                                                {column.title}
                                            </h3>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {column.description}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${column.count}`}
                                    >
                                        {totalInColumn}
                                    </span>
                                </header>

                                {isLoading ? (
                                    <p
                                        role="status"
                                        className="rounded-xl bg-white/70 px-3 py-8 text-center text-sm text-slate-500"
                                    >
                                        불러오는 중...
                                    </p>
                                ) : columnTodos.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-8 text-center text-sm text-slate-500">
                                        {query
                                            ? "검색 결과가 없습니다."
                                            : "이 단계에 할 일이 없습니다."}
                                    </div>
                                ) : (
                                    <ul className="space-y-3">
                                        {columnTodos.map((todo) => (
                                            <li key={todo.id}>
                                                <article
                                                    draggable={pendingTodoId === null}
                                                    onDragStart={(event) =>
                                                        handleDragStart(event, todo.id)
                                                    }
                                                    onDragEnd={() =>
                                                        setDraggingTodoId(null)
                                                    }
                                                    className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md ${
                                                        draggingTodoId === todo.id
                                                            ? "opacity-40"
                                                            : ""
                                                    } ${
                                                        pendingTodoId === todo.id
                                                            ? "cursor-wait"
                                                            : "cursor-grab active:cursor-grabbing"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h4 className="break-words font-medium text-slate-800">
                                                            {todo.title}
                                                        </h4>
                                                        <span
                                                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[todo.priority]}`}
                                                        >
                                                            {priorityLabels[todo.priority]}
                                                        </span>
                                                    </div>

                                                    {todo.description && (
                                                        <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                                                            {todo.description}
                                                        </p>
                                                    )}

                                                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                                        <label
                                                            className="sr-only"
                                                            htmlFor={`status-${todo.id}`}
                                                        >
                                                            {todo.title} 상태 변경
                                                        </label>
                                                        <select
                                                            id={`status-${todo.id}`}
                                                            value={todo.status}
                                                            disabled={pendingTodoId !== null}
                                                            onChange={(event) =>
                                                                handleMove(
                                                                    todo.id,
                                                                    event.target.value
                                                                )
                                                            }
                                                            className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                                                        >
                                                            {columns.map((option) => (
                                                                <option
                                                                    key={option.id}
                                                                    value={option.id}
                                                                >
                                                                    {option.title}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDelete(todo.id)
                                                            }
                                                            disabled={
                                                                pendingTodoId !== null
                                                            }
                                                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </article>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>

                <footer className="mt-6 text-center text-xs text-slate-500">
                    저장소: <code>data/todos.json</code> · API:{" "}
                    <code>/api/todos</code>
                </footer>
            </div>
        </main>
    );
}
