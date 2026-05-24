"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TodoPriority } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-guard";

const TodoPriorityValues = ["LOW", "MEDIUM", "HIGH"] as const;
const AddTodoInput = z.object({
  title: z.string().min(1).max(200),
  priority: z.enum(TodoPriorityValues),
});

export async function addTodo(input: { title: string; priority: TodoPriority }) {
  const user = await requireUser();
  const data = AddTodoInput.parse(input);
  const created = await db.todo.create({
    data: { title: data.title, priority: data.priority, userId: user.id },
  });
  revalidatePath("/todos");
  return created;
}

async function requireOwnTodo(id: string) {
  const user = await requireUser();
  const todo = await db.todo.findUnique({ where: { id }, select: { userId: true } });
  if (!todo) throw new Error("Todo not found");
  if (todo.userId !== user.id) {
    throw new Error("You can only manage your own to-dos");
  }
  return user;
}

export async function toggleTodo(id: string, done: boolean) {
  await requireOwnTodo(id);
  await db.todo.update({ where: { id }, data: { done } });
  revalidatePath("/todos");
}

export async function removeTodo(id: string) {
  await requireOwnTodo(id);
  await db.todo.delete({ where: { id } });
  revalidatePath("/todos");
}
