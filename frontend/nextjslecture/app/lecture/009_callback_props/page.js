'use client';

import { useState } from 'react';

// 자식 컴포넌트: 입력 UI를 담당하고, 추가할 제목을 부모에게 callback으로 전달합니다.
function TaskForm({ onAddTask }) {
    const [title, setTitle] = useState('');

    function handleSubmit(event) {
        event.preventDefault();

        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        // 부모가 전달한 함수를 호출해 입력값을 부모에게 올려 보냅니다.
        onAddTask(trimmedTitle);
        setTitle('');
    }

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor="task-title">새 할 일: </label>
            <input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 강의 자료 읽기"
                required
            />
            <button type="submit">추가</button>
        </form>
    );
}

// 자식 컴포넌트: 할 일 하나를 보여 주고, 완료/삭제 동작을 부모에게 요청합니다.
function TaskItem({ task, onToggleTask, onDeleteTask }) {
    return (
        <li>
            <label>
                <input
                    type="checkbox"
                    checked={task.isDone}
                    onChange={() => onToggleTask(task.id)}
                />
                <span
                    style={{
                        textDecoration: task.isDone ? 'line-through' : 'none',
                    }}
                >
                    {task.title}
                </span>
            </label>
            <button type="button" onClick={() => onDeleteTask(task.id)}>
                삭제
            </button>
        </li>
    );
}

// 자식 컴포넌트: 배열을 화면에 표시하고 각 항목에 callback을 전달합니다.
function TaskList({ tasks, onToggleTask, onDeleteTask }) {
    if (tasks.length === 0) {
        return <p>할 일이 없습니다. 새 할 일을 추가해 보세요.</p>;
    }

    return (
        <ul>
            {tasks.map((task) => (
                <TaskItem
                    key={task.id}
                    task={task}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                />
            ))}
        </ul>
    );
}

export default function CallbackPropsLecturePage() {
    // 부모 컴포넌트가 목록 state를 소유합니다.
    const [tasks, setTasks] = useState([
        { id: 1, title: '강의 자료 읽기', isDone: false },
        { id: 2, title: '실습 코드 작성하기', isDone: true },
        { id: 3, title: '배운 내용 복습하기', isDone: false },
    ]);
    const [nextTaskId, setNextTaskId] = useState(4);

    // 자식이 onAddTask(title)을 호출하면 부모가 목록 state를 갱신합니다.
    function handleAddTask(title) {
        setTasks((currentTasks) => [
            ...currentTasks,
            { id: nextTaskId, title, isDone: false },
        ]);
        setNextTaskId((currentId) => currentId + 1);
    }

    // 자식은 task id만 전달하고, 실제 변경은 부모가 처리합니다.
    function handleToggleTask(taskId) {
        setTasks((currentTasks) =>
            currentTasks.map((task) =>
                task.id === taskId
                    ? { ...task, isDone: !task.isDone }
                    : task
            )
        );
    }

    function handleDeleteTask(taskId) {
        setTasks((currentTasks) =>
            currentTasks.filter((task) => task.id !== taskId)
        );
    }

    const remainingCount = tasks.filter((task) => !task.isDone).length;

    return (
        <main>
            <h1>Callback Props: 할 일 목록</h1>
            <p>
                자식 컴포넌트에서 발생한 동작을 callback으로 부모에게 알리고,
                부모가 가진 목록 state를 변경합니다.
            </p>

            <h2>1. 할 일 추가</h2>
            <TaskForm onAddTask={handleAddTask} />

            <h2>2. 할 일 목록 ({remainingCount}개 남음)</h2>
            <TaskList
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
            />

            <hr />
            <h2>데이터 흐름</h2>
            <ol>
                <li>부모가 목록 state와 추가·완료·삭제 함수를 가집니다.</li>
                <li>부모가 자식에게 데이터와 callback을 props로 전달합니다.</li>
                <li>자식은 버튼이나 입력 이벤트가 발생하면 callback을 호출합니다.</li>
                <li>부모가 state를 바꾸면 목록을 다시 렌더링합니다.</li>
            </ol>
        </main>
    );
}
