import type { DesignContent, NoteDesignContent } from "../types/designs";

export const EMPTY_NOTE_CONTENT: NoteDesignContent = {
  type: "banguesesdraw-note",
  version: 1,
  content: {
    type: "doc",
    content: [{ type: "paragraph" }],
  },
};

export function isNoteContent(content: DesignContent): content is NoteDesignContent {
  return (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    content.type === "banguesesdraw-note" &&
    "content" in content &&
    typeof content.content === "object" &&
    content.content !== null &&
    "type" in content.content &&
    content.content.type === "doc"
  );
}

export function normaliseNoteContent(content: DesignContent): NoteDesignContent {
  if (!isNoteContent(content)) {
    throw new Error("Unsupported note content.");
  }

  return {
    type: "banguesesdraw-note",
    version: Number.isFinite(content.version) ? content.version : 1,
    content: content.content,
  };
}
