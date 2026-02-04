import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Todo, FilterType, PriorityType } from "../types/todo";
import { useToastStore } from "./useToastStore";
import { priorityOrder } from "../types/priorityOrder";

type SortType = "newest" | "oldest" | "priority" | "manual";

type TodoStore = {
  todos: Todo[];
  filter: FilterType;
  searchQuery: string;
  sortBy: SortType;

  setFilter: (filter: FilterType) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortType) => void;

  createTodo: (
    title: string,
    description: string,
    priority: PriorityType
  ) => Promise<void>;

  updateTodo: (
    id: string,
    title: string,
    description: string,
    priority: PriorityType
  ) => Promise<void>;

  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;

  moveTodoUp: (id: string) => void;
  moveTodoDown: (id: string) => void;

  filteredTodos: () => Todo[];
  stats: () => {
    total: number;
    completed: number;
    pending: number;
    highPriority: number;
  };
};

export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      todos: [],
      filter: "all",
      searchQuery: "",
      sortBy: "manual",

      createTodo: async (title, description, priority) => {
        const toast = useToastStore.getState().showToast;
        const todos = get().todos;

        const maxOrder = todos.length
          ? Math.max(...todos.map((t) => t.order))
          : 0;

        try {
          const res = await fetch("/api/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description,
              priority,
              order: maxOrder + 1,
            }),
          });

          const newTodo: Todo = await res.json();
          set({ todos: [...todos, newTodo] });

          toast("Todo created", "success");
        } catch {
          toast("Create failed", "error");
        }
      },

      updateTodo: async (id, title, description, priority) => {
        const toast = useToastStore.getState().showToast;

        try {
          const res = await fetch(`/api/todos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, priority }),
          });

          const updated: Todo = await res.json();

          set((state) => ({
            todos: state.todos.map((t) => (t.id === id ? updated : t)),
          }));

          toast("Todo updated", "success");
        } catch {
          toast("Update failed", "error");
        }
      },

      toggleTodo: async (id) => {
        const prev = get().todos;
        const toast = useToastStore.getState().showToast;

        set({
          todos: prev.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
        });

        try {
          await fetch(`/api/todos/${id}/toggle`, { method: "PATCH" });
        } catch {
          set({ todos: prev });
          toast("Toggle failed", "error");
        }
      },

      deleteTodo: async (id) => {
        const prev = get().todos;
        const toast = useToastStore.getState().showToast;

        set({ todos: prev.filter((t) => t.id !== id) });

        try {
          await fetch(`/api/todos/${id}`, { method: "DELETE" });
          toast("Todo deleted", "success");
        } catch {
          set({ todos: prev });
          toast("Delete failed", "error");
        }
      },

      moveTodoUp: (id) => {
        const todos = [...get().todos];
        const index = todos.findIndex((t) => t.id === id);

        if (index <= 0) return;

        [todos[index].order, todos[index - 1].order] = [
          todos[index - 1].order,
          todos[index].order,
        ];

        set({ todos });
      },

      moveTodoDown: (id) => {
        const todos = [...get().todos];
        const index = todos.findIndex((t) => t.id === id);

        if (index === -1 || index === todos.length - 1) return;

        [todos[index].order, todos[index + 1].order] = [
          todos[index + 1].order,
          todos[index].order,
        ];

        set({ todos });
      },

      setFilter: (filter) => set({ filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortBy: (sortBy) => set({ sortBy }),

      filteredTodos: () => {
        let list = [...get().todos];
        const { filter, searchQuery, sortBy } = get();

        if (filter === "completed") list = list.filter((t) => t.completed);
        if (filter === "active") list = list.filter((t) => !t.completed);

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          list = list.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q)
          );
        }

        switch (sortBy) {
          case "newest":
            list.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
            break;

          case "oldest":
            list.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
            break;

          case "priority":
            list.sort(
              (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
            );
            break;

          case "manual":
          default:
            list.sort((a, b) => a.order - b.order);
        }

        return list;
      },

      stats: () => {
        const todos = get().todos;

        return {
          total: todos.length,
          completed: todos.filter((t) => t.completed).length,
          pending: todos.filter((t) => !t.completed).length,
          highPriority: todos.filter((t) => t.priority === "high").length,
        };
      },
    }),
    { name: "todo-storage" }
  )
);
