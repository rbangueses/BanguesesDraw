import { act, renderHook } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "./useAutosave";

vi.useFakeTimers();

vi.mock("../lib/designApi", () => ({
  designApi: {
    writeDesign: vi.fn(),
  },
}));

const { designApi } = await import("../lib/designApi");

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.mocked(designApi.writeDesign).mockReset();
  });

  it("debounces writes and reports saved", async () => {
    vi.mocked(designApi.writeDesign).mockResolvedValue({
      project: "App",
      name: "Flow",
      fileName: "Flow.excalidraw",
      content: { type: "excalidraw", elements: [], appState: {}, files: {} },
    });

    const { rerender, result } = renderHook(
      ({ scene }) =>
        useAutosave({
          project: "App",
          fileName: "Flow.excalidraw",
          scene,
          enabled: true,
        }),
      {
        initialProps: {
          scene: {
            type: "excalidraw" as const,
            elements: [] as unknown[],
            appState: {},
            files: {},
          },
        },
      },
    );

    rerender({
      scene: {
        type: "excalidraw" as const,
        elements: [{ id: "a" }] as unknown[],
        appState: {},
        files: {},
      },
    });

    expect(result.current.status).toBe("unsaved");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(result.current.status).toBe("saved");
    expect(designApi.writeDesign).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending autosave when saved manually", async () => {
    vi.mocked(designApi.writeDesign).mockResolvedValue({
      project: "App",
      name: "Flow",
      fileName: "Flow.excalidraw",
      content: { type: "excalidraw", elements: [], appState: {}, files: {} },
    });

    const { rerender, result } = renderHook(
      ({ scene }) =>
        useAutosave({
          project: "App",
          fileName: "Flow.excalidraw",
          scene,
          enabled: true,
        }),
      {
        initialProps: {
          scene: {
            type: "excalidraw" as const,
            elements: [] as unknown[],
            appState: {},
            files: {},
          },
        },
      },
    );

    const updatedScene = {
      type: "excalidraw" as const,
      elements: [{ id: "a" }] as unknown[],
      appState: {},
      files: {},
    };

    rerender({ scene: updatedScene });

    expect(result.current.status).toBe("unsaved");

    await act(async () => {
      await result.current.saveNow();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(designApi.writeDesign).toHaveBeenCalledTimes(1);
    expect(designApi.writeDesign).toHaveBeenCalledWith(
      "App",
      "Flow.excalidraw",
      updatedScene,
    );
  });

  it("does not duplicate writes when saveNow is called while saving", async () => {
    const deferred = createDeferred<{
      project: string;
      name: string;
      fileName: string;
      content: { type: "excalidraw"; elements: unknown[]; appState: {}; files: {} };
    }>();

    vi.mocked(designApi.writeDesign).mockReturnValue(deferred.promise);

    const { rerender, result } = renderHook(
      ({ scene }) =>
        useAutosave({
          project: "App",
          fileName: "Flow.excalidraw",
          scene,
          enabled: true,
        }),
      {
        initialProps: {
          scene: {
            type: "excalidraw" as const,
            elements: [] as unknown[],
            appState: {},
            files: {},
          },
        },
      },
    );

    const updatedScene = {
      type: "excalidraw" as const,
      elements: [{ id: "a" }] as unknown[],
      appState: {},
      files: {},
    };

    rerender({ scene: updatedScene });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(result.current.status).toBe("saving");
    expect(designApi.writeDesign).toHaveBeenCalledTimes(1);

    let manualSaveResult: Promise<boolean> | undefined;

    await act(async () => {
      manualSaveResult = result.current.saveNow();
      await Promise.resolve();
    });

    expect(designApi.writeDesign).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("saving");

    deferred.resolve({
      project: "App",
      name: "Flow",
      fileName: "Flow.excalidraw",
      content: { type: "excalidraw", elements: [{ id: "a" }], appState: {}, files: {} },
    });

    await act(async () => {
      await manualSaveResult;
    });

    expect(result.current.status).toBe("saved");
  });

  afterAll(() => {
    vi.useRealTimers();
  });
});
