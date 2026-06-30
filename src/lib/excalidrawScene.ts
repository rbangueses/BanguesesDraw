import type { ExcalidrawScene } from "../types/excalidraw";

const RUNTIME_APP_STATE_KEYS = new Set([
  "activeEmbeddable",
  "collaborators",
  "contextMenu",
  "cursorButton",
  "editingFrame",
  "editingGroupId",
  "editingLinearElement",
  "editingTextElement",
  "elementsToHighlight",
  "errorMessage",
  "fileHandle",
  "followedBy",
  "frameToHighlight",
  "hoveredElementIds",
  "isCropping",
  "isLoading",
  "isResizing",
  "isRotating",
  "multiElement",
  "newElement",
  "openDialog",
  "openMenu",
  "openPopup",
  "pasteDialog",
  "pendingImageElementId",
  "previousSelectedElementIds",
  "resizingElement",
  "searchMatches",
  "selectedElementIds",
  "selectedGroupIds",
  "selectedLinearElement",
  "selectionElement",
  "showHyperlinkPopup",
  "snapLines",
  "startBoundElement",
  "suggestedBindings",
  "toast",
  "userToFollow",
]);

function sanitizeAppState(appState: Record<string, unknown> | undefined) {
  if (!appState) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(appState).filter(([key]) => !RUNTIME_APP_STATE_KEYS.has(key)),
  );
}

export function prepareSceneForStorage(scene: ExcalidrawScene): ExcalidrawScene {
  return {
    type: "excalidraw",
    version: scene.version ?? 2,
    source: scene.source ?? "banguesesdraw",
    elements: scene.elements,
    appState: sanitizeAppState(scene.appState),
    files: scene.files ?? {},
  };
}

export function prepareSceneForExcalidraw(scene: ExcalidrawScene): ExcalidrawScene {
  return prepareSceneForStorage(scene);
}
