import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorView } from "./EditorView";

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: ({
    initialData,
    onChange,
  }: {
    initialData: { elements?: unknown[] };
    onChange: (
      elements: unknown[],
      appState: Record<string, unknown>,
      files: Record<string, unknown>,
    ) => void;
  }) => (
    <div>
      <div>Mock Excalidraw ({initialData.elements?.length ?? 0})</div>
      <button
        type="button"
        onClick={() => onChange([{ id: "changed" }], { viewBackgroundColor: "#fff" }, {})}
      >
        Edit scene
      </button>
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span aria-hidden="true">arrow</span>,
  Save: () => <span aria-hidden="true">save</span>,
}));

vi.mock("../lib/designApi", () => ({
  designApi: {
    readDesign: vi.fn(),
    writeDesign: vi.fn(),
  },
}));

const { designApi } = await import("../lib/designApi");

describe("EditorView", () => {
  beforeEach(() => {
    vi.mocked(designApi.readDesign).mockReset();
    vi.mocked(designApi.writeDesign).mockReset();
  });

  it("flushes pending edits before leaving the editor", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    vi.mocked(designApi.readDesign).mockResolvedValue({
      project: "App",
      name: "Flow",
      fileName: "Flow.excalidraw",
      content: { type: "excalidraw", elements: [], appState: {}, files: {} },
    });
    vi.mocked(designApi.writeDesign).mockResolvedValue({
      project: "App",
      name: "Flow",
      fileName: "Flow.excalidraw",
      content: {
        type: "excalidraw",
        elements: [{ id: "changed" }],
        appState: { viewBackgroundColor: "#fff" },
        files: {},
      },
    });

    render(
      <EditorView project="App" fileName="Flow.excalidraw" onBack={onBack} />,
    );

    await user.click(await screen.findByRole("button", { name: "Edit scene" }));
    await user.click(screen.getByRole("button", { name: "Back to library" }));

    await waitFor(() => expect(designApi.writeDesign).toHaveBeenCalledTimes(1));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(designApi.writeDesign).toHaveBeenCalledWith(
      "App",
      "Flow.excalidraw",
      expect.objectContaining({
        type: "excalidraw",
        elements: [{ id: "changed" }],
      }),
    );
  });

  it("stays in the editor and surfaces save errors when leaving with pending edits", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    vi.mocked(designApi.readDesign).mockResolvedValue({
      project: "App",
      name: "Flow",
      fileName: "Flow.excalidraw",
      content: { type: "excalidraw", elements: [], appState: {}, files: {} },
    });
    vi.mocked(designApi.writeDesign).mockRejectedValue(new Error("Disk full"));

    render(
      <EditorView project="App" fileName="Flow.excalidraw" onBack={onBack} />,
    );

    await user.click(await screen.findByRole("button", { name: "Edit scene" }));
    await user.click(screen.getByRole("button", { name: "Back to library" }));

    await screen.findByText("Error: Disk full");
    expect(onBack).not.toHaveBeenCalled();
  });
});
