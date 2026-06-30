import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignLibrary } from "./useDesignLibrary";

vi.mock("../lib/designApi", () => ({
  designApi: {
    listProjects: vi.fn(),
    listDesigns: vi.fn(),
    createProject: vi.fn(),
    createDesign: vi.fn(),
  },
}));

const { designApi } = await import("../lib/designApi");

describe("useDesignLibrary", () => {
  beforeEach(() => {
    vi.mocked(designApi.listProjects).mockReset();
    vi.mocked(designApi.listDesigns).mockReset();
    vi.mocked(designApi.createProject).mockReset();
    vi.mocked(designApi.createDesign).mockReset();
  });

  it("loads projects and designs for the selected project", async () => {
    vi.mocked(designApi.listProjects).mockResolvedValueOnce([
      { name: "App", designCount: 2 },
    ]);
    vi.mocked(designApi.listDesigns).mockResolvedValueOnce([
      {
        project: "App",
        name: "Flow",
        fileName: "Flow.excalidraw",
        updatedAtMs: 1,
      },
      {
        project: "App",
        name: "Board",
        fileName: "Board.excalidraw",
        updatedAtMs: 2,
      },
    ]);

    const { result } = renderHook(() => useDesignLibrary());

    await waitFor(() => expect(result.current.projects[0].name).toBe("App"));
    await waitFor(() => expect(result.current.designs).toHaveLength(2));

    expect(result.current.selectedProject).toBe("App");
    expect(result.current.designs[0].name).toBe("Flow");
    expect(designApi.listDesigns).toHaveBeenCalledWith("App");
  });

  it("filters designs by case-insensitive query", async () => {
    vi.mocked(designApi.listProjects).mockResolvedValueOnce([
      { name: "App", designCount: 2 },
    ]);
    vi.mocked(designApi.listDesigns).mockResolvedValueOnce([
      {
        project: "App",
        name: "Flow chart",
        fileName: "Flow.excalidraw",
        updatedAtMs: 1,
      },
      {
        project: "App",
        name: "Landing page",
        fileName: "Landing.excalidraw",
        updatedAtMs: 2,
      },
    ]);

    const { result } = renderHook(() => useDesignLibrary());

    await waitFor(() => expect(result.current.filteredDesigns).toHaveLength(2));

    act(() => {
      result.current.setFilter("flow");
    });

    expect(result.current.filteredDesigns).toEqual([
      {
        project: "App",
        name: "Flow chart",
        fileName: "Flow.excalidraw",
        updatedAtMs: 1,
      },
    ]);
  });

  it("creates a project, selects it, and creates designs within it", async () => {
    vi.mocked(designApi.listProjects)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ name: "Ideas", designCount: 0 }]);
    vi.mocked(designApi.listDesigns)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(designApi.createProject).mockResolvedValueOnce({
      name: "Ideas",
      designCount: 0,
    });
    vi.mocked(designApi.createDesign).mockResolvedValueOnce({
      project: "Ideas",
      name: "Sketch",
      fileName: "Sketch.excalidraw",
      content: {
        type: "excalidraw",
        elements: [],
        appState: {},
        files: {},
      },
    });

    const { result } = renderHook(() => useDesignLibrary());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createProject("Ideas");
    });

    expect(designApi.createProject).toHaveBeenCalledWith("Ideas");
    expect(result.current.selectedProject).toBe("Ideas");

    await act(async () => {
      await result.current.createDesign("Sketch");
    });

    expect(designApi.createDesign).toHaveBeenCalledWith("Ideas", "Sketch");
  });
});
