"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { addTodo, removeTodo, toggleTodo } from "@/server/todos";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

export function TodoBoard({
  initial,
}: {
  initial: { id: string; title: string; done: boolean; priority: "LOW" | "MEDIUM" | "HIGH"; dueDate: string | null }[];
}) {
  const [todos, setTodos] = useState(initial);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [pending, start] = useTransition();

  return (
    <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-3">
      {pending && (
        <div
          className="absolute inset-0 z-[1] flex justify-end gap-2 rounded-lg bg-background/40 p-3 pt-4 backdrop-blur-[1px] lg:col-span-3"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
            Saving…
          </span>
        </div>
      )}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What needs doing?"
              disabled={pending}
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
              disabled={pending}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="LOW">Low priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="HIGH">High priority</option>
            </select>
            <Button
              variant="gradient"
              className="w-full"
              loading={pending}
              onClick={() =>
                start(async () => {
                  if (!text.trim()) return;
                  const created = await addTodo({ title: text, priority });
                  setTodos([{ id: created.id, title: text, done: false, priority, dueDate: null }, ...todos]);
                  setText("");
                  toast.success("Added");
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-2">
          {todos.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">All clear ✨</div>}
          {todos.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-3 ${t.done ? "opacity-60" : ""}`}>
              <Checkbox
                checked={t.done}
                disabled={pending}
                onCheckedChange={(v) =>
                  start(async () => {
                    await toggleTodo(t.id, !!v);
                    setTodos(todos.map((x) => (x.id === t.id ? { ...x, done: !!v } : x)));
                  })
                }
              />
              <div className={`flex-1 ${t.done ? "line-through" : ""}`}>{t.title}</div>
              <Badge variant={t.priority === "HIGH" ? "destructive" : t.priority === "MEDIUM" ? "warning" : "muted"}>
                {t.priority}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await removeTodo(t.id);
                    setTodos(todos.filter((x) => x.id !== t.id));
                  })
                }
              >
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
