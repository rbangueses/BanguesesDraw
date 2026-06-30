import { useCallback, useEffect, useRef, useState } from "react";
import { designApi } from "../lib/designApi";
import type { ExcalidrawScene } from "../types/excalidraw";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

type UseAutosaveArgs = {
  project: string;
  fileName: string;
  scene: ExcalidrawScene | null;
  enabled: boolean;
};

export function useAutosave({
  project,
  fileName,
  scene,
  enabled,
}: UseAutosaveArgs) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  const pendingTimeout = useRef<number | null>(null);
  const sceneKey = `${project}/${fileName}`;
  const lastSceneKey = useRef(sceneKey);

  const clearPendingTimeout = useCallback(() => {
    if (pendingTimeout.current === null) {
      return;
    }

    window.clearTimeout(pendingTimeout.current);
    pendingTimeout.current = null;
  }, []);

  useEffect(() => {
    if (lastSceneKey.current === sceneKey) {
      return;
    }

    clearPendingTimeout();
    lastSceneKey.current = sceneKey;
    lastSaved.current = null;
    setStatus("saved");
    setError(null);
  }, [clearPendingTimeout, sceneKey]);

  const saveNow = useCallback(async () => {
    if (!scene) {
      return false;
    }

    clearPendingTimeout();
    setStatus("saving");
    setError(null);

    try {
      await designApi.writeDesign(project, fileName, scene);
      lastSaved.current = JSON.stringify(scene);
      setStatus("saved");
      return true;
    } catch (unknownError) {
      setError(String(unknownError));
      setStatus("error");
      return false;
    }
  }, [clearPendingTimeout, fileName, project, scene]);

  useEffect(() => {
    if (!enabled || !scene) {
      return;
    }

    const serialized = JSON.stringify(scene);

    if (lastSaved.current === null) {
      lastSaved.current = serialized;
      setStatus("saved");
      return;
    }

    if (serialized === lastSaved.current) {
      return;
    }

    setStatus("unsaved");

    pendingTimeout.current = window.setTimeout(() => {
      pendingTimeout.current = null;
      void saveNow();
    }, 800);

    return () => {
      clearPendingTimeout();
    };
  }, [clearPendingTimeout, enabled, saveNow, scene]);

  return { status, saveNow, error };
}
