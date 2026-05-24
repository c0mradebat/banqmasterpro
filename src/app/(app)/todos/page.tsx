import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { TodoBoard } from "./todo-board";

export default async function TodosPage() {
  const session = await auth();
  if (!session?.user) return null;
  const todos = await db.todo.findMany({
    where: { userId: session.user.id },
    orderBy: [{ done: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
  return (
    <>
      <PageHeader title="My to-do" description="Quick personal tasks." />
      <TodoBoard
        initial={todos.map((t) => ({
          ...t,
          dueDate: t.dueDate?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
