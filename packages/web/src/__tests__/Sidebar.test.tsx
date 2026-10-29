import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Sidebar } from "../components/Sidebar";
import type { ConversationEntry } from "../hooks/useConversations";

it("opens a conversation with the keyboard without activating its context action", async () => {
  const onSelect = vi.fn();
  const onDelete = vi.fn();
  const conversations: ConversationEntry[] = [{
    id: "qa-conversation",
    summary: {
      summary: "QA conversation",
      stepCount: 2,
      lastModifiedTime: "2026-10-28T00:00:00Z",
      createdTime: "2026-10-28T00:00:00Z",
      trajectoryId: "qa-conversation",
      status: "CASCADE_RUN_STATUS_DONE",
      workspaces: [],
    },
  }];
  render(<Sidebar conversations={conversations} activeId={null}
    onSelect={onSelect} onDelete={onDelete} onNew={vi.fn()} onSettings={vi.fn()}
    loading={false} connected isOpen onToggle={vi.fn()} />);

  const user = userEvent.setup();
  const conversation = screen.getByRole("button", { name: "Open conversation: QA conversation" });
  conversation.focus();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("qa-conversation");
  await user.tab();
  expect(screen.getByRole("button", { name: "More options for QA conversation" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onDelete).not.toHaveBeenCalled();
});
