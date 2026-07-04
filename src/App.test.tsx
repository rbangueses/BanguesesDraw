import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/designApi", () => ({
  designApi: {
    readDesign: vi.fn(),
  },
}));

const { designApi } = await import("./lib/designApi");

vi.mock("./components/LibraryView", () => ({
  LibraryView: ({
    openError,
    onOpenDesign,
    initialSelectedProject,
  }: {
    openError?: string | null;
    initialSelectedProject?: string | null;
    onOpenDesign: (project: string, fileName: string) => void;
  }) => (
    <section aria-label="Design library">
      <h1>BanguesesDraw</h1>
      <p>Selected hint: {initialSelectedProject ?? "none"}</p>
      {openError ? <div>{openError}</div> : null}
      <button
        type="button"
        onClick={() => onOpenDesign("App", "Flow.excalidraw")}
      >
        Open sample design
      </button>
      <button
        type="button"
        onClick={() => onOpenDesign("App", "Flow.mmd")}
      >
        Open Mermaid design
      </button>
      <button
        type="button"
        onClick={() => onOpenDesign("Third", "Third flow.excalidraw")}
      >
        Open third project design
      </button>
    </section>
  ),
}));

vi.mock("./components/EditorView", () => ({
  EditorView: ({
    project,
    fileName,
    onDesignMoved,
    onBack,
  }: {
    project: string;
    fileName: string;
    onDesignMoved: (
      project: string,
      fileName: string,
      content: {
        type: "excalidraw";
        elements: unknown[];
        appState: Record<string, unknown>;
        files: Record<string, unknown>;
      },
    ) => void;
    onBack: () => void;
  }) => (
    <section aria-label="Editor">
      <p>
        {project} / {fileName}
      </p>
      <button
        type="button"
        onClick={() =>
          onDesignMoved("App", "Renamed.excalidraw", {
            type: "excalidraw",
            elements: [],
            appState: {},
            files: {},
          })
        }
      >
        Rename in editor
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </section>
  ),
}));

vi.mock("./components/MermaidEditorView", () => ({
  MermaidEditorView: ({
    project,
    fileName,
    initialSource,
    onBack,
  }: {
    project: string;
    fileName: string;
    initialSource: string;
    onBack: () => void;
  }) => (
    <section aria-label="Mermaid editor">
      <p>
        {project} / {fileName} / {initialSource}
      </p>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </section>
  ),
}));

describe("App", () => {
  beforeEach(() => {
    vi.mocked(designApi.readDesign).mockReset();
    vi.mocked(designApi.readDesign).mockResolvedValue({
      project: "App",
      name: "Flow",
      fileName: "Flow.excalidraw",
      kind: "excalidraw",
      content: { type: "excalidraw", elements: [], appState: {}, files: {} },
    });
  });

  it("starts in the library and returns there after leaving a design", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: "BanguesesDraw" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Open sample design" }));

    expect(screen.getByText("App / Flow.excalidraw")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("heading", { name: "BanguesesDraw" })).toBeVisible();
  });

  it("returns to the project that opened the artifact", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open third project design" }));

    expect(screen.getByText("Third / Third flow.excalidraw")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByText("Selected hint: Third")).toBeVisible();
  });

  it("stays in the library and names the file when opening a design fails", async () => {
    const user = userEvent.setup();
    vi.mocked(designApi.readDesign).mockRejectedValue(new Error("Permission denied"));

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open sample design" }));

    expect(await screen.findByText("Flow.excalidraw: Error: Permission denied")).toBeVisible();
    expect(screen.getByRole("heading", { name: "BanguesesDraw" })).toBeVisible();
    expect(screen.queryByLabelText("Editor")).not.toBeInTheDocument();
  });

  it("keeps the editor open on the moved design after an editor rename or duplicate", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open sample design" }));
    await user.click(await screen.findByRole("button", { name: "Rename in editor" }));

    expect(screen.getByText("App / Renamed.excalidraw")).toBeVisible();
  });

  it("opens Mermaid designs in the Mermaid editor", async () => {
    const user = userEvent.setup();
    vi.mocked(designApi.readDesign).mockResolvedValueOnce({
      project: "App",
      name: "Flow",
      fileName: "Flow.mmd",
      kind: "mermaid",
      content: { source: "flowchart LR\n" },
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Mermaid design" }));

    expect(screen.getByLabelText("Mermaid editor")).toHaveTextContent(
      "App / Flow.mmd / flowchart LR",
    );
  });

  it("rejects unsupported artifacts instead of opening an editor", async () => {
    const user = userEvent.setup();
    vi.mocked(designApi.readDesign).mockResolvedValueOnce({
      project: "App",
      name: "Notes",
      fileName: "Notes.md",
      kind: "note" as never,
      content: { source: "# Notes\n" },
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open sample design" }));

    expect(await screen.findByText("Flow.excalidraw: Error: Unsupported design type.")).toBeVisible();
    expect(screen.queryByLabelText("Editor")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mermaid editor")).not.toBeInTheDocument();
  });
});
