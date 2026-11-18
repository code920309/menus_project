import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const dataFile = path.join(process.cwd(), "data", "todos.json");
let mutationQueue = Promise.resolve();

async function readTodos() {
    const contents = await readFile(dataFile, "utf8");
    const todos = JSON.parse(contents);

    if (!Array.isArray(todos)) {
        throw new Error("Todo 데이터 파일은 배열이어야 합니다.");
    }

    return todos;
}

async function writeTodos(todos) {
    const temporaryFile = `${dataFile}.${randomUUID()}.tmp`;

    await writeFile(temporaryFile, `${JSON.stringify(todos, null, 2)}\n`, "utf8");
    await rename(temporaryFile, dataFile);
}

function mutateTodos(mutator) {
    const operation = mutationQueue.then(async () => {
        const todos = await readTodos();
        const { result, changed } = mutator(todos);

        if (changed) {
            await writeTodos(todos);
        }

        return result;
    });

    mutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
}

export async function getTodos() {
    await mutationQueue;
    return readTodos();
}

export function createTodo({ title, description, priority }) {
    return mutateTodos((todos) => {
        const todo = {
            id: randomUUID(),
            title,
            description,
            priority,
            status: "todo",
            createdAt: new Date().toISOString(),
        };

        todos.unshift(todo);
        return { result: todo, changed: true };
    });
}

export function updateTodo(id, updates) {
    return mutateTodos((todos) => {
        const todo = todos.find((item) => item.id === id);

        if (!todo) {
            return { result: null, changed: false };
        }

        Object.assign(todo, updates);
        return { result: todo, changed: true };
    });
}

export function deleteTodo(id) {
    return mutateTodos((todos) => {
        const nextTodos = todos.filter((todo) => todo.id !== id);

        if (nextTodos.length === todos.length) {
            return { result: false, changed: false };
        }

        todos.splice(0, todos.length, ...nextTodos);
        return { result: true, changed: true };
    });
}
