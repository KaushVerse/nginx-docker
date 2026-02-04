export type PriorityType = "low" | "medium" | "high";

export type FilterType =
  | "all"
  | "completed"
  | "pending"
  | "active"
  | PriorityType;

export type Todo = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  priority: PriorityType;
  order: number;
};
