import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../App";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    getWorkspaces: vi.fn(),
    conversations: vi.fn(),
    health: vi.fn(),
    models: vi.fn(),
  },
}));

vi.mock("../components/ChatPanel", () => ({ ChatPanel: () => <div>Existing conversation</div> }));

function LocationProbe() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

function renderApp(path = "/") {
  return render(<MemoryRouter initialEntries={[path]}><App /><LocationProbe /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getWorkspaces).mockResolvedValue({ workspaceInfos: [{ workspaceUri: "file:///qa/recovered" }] });
  vi.mocked(api.conversations).mockResolvedValue({ trajectorySummaries: {} });
  vi.mocked(api.health).mockResolvedValue({
    status: "ok", proxy: { port: 3170, uptime: 1 },
    languageServers: [{ pid: 1, httpsPort: 1234, source: "fixture" }],
  });
  vi.mocked(api.models).mockResolvedValue({ clientModelConfigs: [] });
});

it("recovers the startup placeholder after the workspace API becomes available", async () => {
  vi.mocked(api.getWorkspaces).mockRejectedValueOnce(new Error("Proxy is starting"));
  renderApp();
  await waitFor(() => expect(screen.getByLabelText("Current route")).toHaveTextContent(/^\/recovered$/));
});

it("preserves an explicitly selected project when other workspaces load", async () => {
  renderApp("/chosen");
  await waitFor(() => expect(screen.getByTitle("Attach image")).toBeEnabled());
  expect(screen.getByLabelText("Current route")).toHaveTextContent(/^\/chosen$/);
});

it("requires a live workspace result before selecting a project from the startup placeholder", async () => {
  vi.mocked(api.getWorkspaces).mockRejectedValue(new Error("Workspace discovery unavailable"));
  vi.mocked(api.conversations).mockResolvedValue({ trajectorySummaries: {
    historical: {
      summary: "Old project conversation", stepCount: 1, trajectoryId: "historical",
      status: "CASCADE_RUN_STATUS_DONE", createdTime: "2026-10-28T00:00:00Z",
      lastModifiedTime: "2026-10-28T00:00:00Z",
      workspaces: [{ workspaceFolderAbsoluteUri: "file:///qa/historical" }],
    },
  } });
  await act(async () => { renderApp(); });
  expect(screen.getByLabelText("Current route")).toHaveTextContent(/^\/unknown$/);
  expect(screen.getAllByText("No workspace selected").length).toBeGreaterThan(0);
});

it("keeps an open conversation on its current route when workspaces load", async () => {
  renderApp("/unknown/chat-kept");
  await waitFor(() => expect(screen.getByTitle("Attach image")).toBeEnabled());
  expect(screen.getByText("Existing conversation")).toBeInTheDocument();
  expect(screen.getByLabelText("Current route")).toHaveTextContent(/^\/unknown\/chat-kept$/);
});

it("describes the empty workspace state without exposing the routing placeholder", async () => {
  vi.mocked(api.getWorkspaces).mockResolvedValue({ workspaceInfos: [] });
  renderApp();
  await waitFor(() => expect(screen.getAllByText("No workspace selected").length).toBeGreaterThan(0));
  expect(screen.queryByText("unknown")).not.toBeInTheDocument();
});
