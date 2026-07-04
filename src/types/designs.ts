import type { ExcalidrawScene } from "./excalidraw";

export type ProjectSummary = {
  name: string;
  designCount: number;
  visibleInPresentationMode?: boolean;
};

export type BackupResult = {
  projectCount: number;
  fileCount: number;
};

export type DesignKind = "excalidraw" | "mermaid";

export type MermaidDesignContent = {
  source: string;
};

export type DesignContent = ExcalidrawScene | MermaidDesignContent;

export type DesignSummary = {
  project: string;
  name: string;
  fileName: string;
  kind: DesignKind;
  updatedAtMs: number;
};

export type DesignScene = {
  project: string;
  name: string;
  fileName: string;
  kind: DesignKind;
  content: DesignContent;
};
