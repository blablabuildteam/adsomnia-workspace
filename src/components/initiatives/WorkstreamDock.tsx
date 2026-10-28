"use client";

import { useCallback, useState, type ComponentProps } from "react";
import { WorkstreamChat } from "./WorkstreamChat";
import { WorkstreamTodos } from "./WorkstreamTodos";
import type { WorkstreamTodo } from "@/lib/workstream-todos";

type Props = Omit<
  ComponentProps<typeof WorkstreamChat>,
  "open" | "onOpenChange" | "launcherSlot" | "hidePreview"
> & {
  todos: WorkstreamTodo[];
};

/** Chat and personal to-dos stacked bottom-right; one panel open at a time. */
export function WorkstreamDock({ todos, ...chatProps }: Props) {
  const [panel, setPanel] = useState<"chat" | "todos" | null>(null);
  const onChatOpenChange = useCallback(
    (open: boolean) => setPanel(open ? "chat" : null),
    [],
  );
  const onTodosOpenChange = useCallback(
    (open: boolean) => setPanel(open ? "todos" : null),
    [],
  );

  return (
    <WorkstreamChat
      {...chatProps}
      open={panel === "chat"}
      onOpenChange={onChatOpenChange}
      hidePreview={panel === "todos"}
      launcherSlot={
        <WorkstreamTodos
          initiativeId={chatProps.initiativeId}
          todos={todos}
          currentStage={chatProps.currentStage}
          open={panel === "todos"}
          onOpenChange={onTodosOpenChange}
          dockAbovePhaseBar={chatProps.dockAbovePhaseBar}
        />
      }
    />
  );
}
