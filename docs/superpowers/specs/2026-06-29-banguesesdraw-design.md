# BanguesesDraw Local Design Manager Design

Date: 2026-06-29

## Goal

Build BanguesesDraw as a local desktop design manager powered by the open-source Excalidraw editor. The app should let the user keep drawings in separate local projects, store all data on disk, and avoid accounts, cloud storage, or hidden browser-only storage.

## Non-Goals

- Rebuild Excalidraw's drawing engine from scratch.
- Add cloud sync, collaboration, accounts, or remote storage.
- Build a full image/export asset manager in the MVP.
- Use SQLite or another index database in the MVP.

## Architecture

BanguesesDraw will be a Tauri desktop app with a React and TypeScript frontend.

The React frontend owns the application experience:

- Project library.
- Design list.
- Editor shell.
- Dialogs and confirmations.
- Save status.
- Calls into the local file API.

The embedded `@excalidraw/excalidraw` component owns the drawing canvas:

- Shape creation.
- Text editing.
- Selection and transforms.
- Freehand drawing.
- Pan, zoom, undo, and redo.
- Excalidraw scene state.

The Tauri backend exposes a narrow local file API:

- List projects from the local `Designs/` folder.
- Create, rename, duplicate, and delete project folders.
- List designs within a project.
- Read and write `.excalidraw` scene files.
- Create, rename, duplicate, and delete individual designs.
- Write scene files through a safer temp-file-and-replace path.

The app depends on the free open-source Excalidraw editor package. License notices for Excalidraw and other dependencies should be preserved in the app's dependency/license notices.

## Storage

The default storage root is a visible folder inside this repo/workspace:

```text
/Users/rbangueses/Documents/BanguesesDraw/Designs/
```

Each project is a folder. Each design is a plain `.excalidraw` JSON scene file.

```text
/Users/rbangueses/Documents/BanguesesDraw/Designs/
  Project Name/
    Flow sketch.excalidraw
    Wireframe.excalidraw
  Another Project/
    Notes.excalidraw
```

The MVP stores scene files only. PNG, SVG, and attachment management can be added later if needed, but the first version keeps the library focused on editable Excalidraw scenes.

## App Experience

The app opens directly into the local design library.

The library view includes:

- A left sidebar with projects.
- A main area listing designs in the selected project.
- Compact create, rename, duplicate, delete, and open actions.
- Empty states for no projects and no designs.
- A simple design-name filter within the selected project.

Opening a design switches to the editor view.

The editor view includes:

- A full-space Excalidraw canvas.
- A compact app header showing project name, design name, save status, and a back-to-library control.
- Autosave after changes settle.
- Manual save through the same persistence path as autosave.
- Rename and duplicate actions available without leaving the editor.

The UI should be quiet, utility-focused, and built for repeated use. It should feel like a local working tool rather than a landing page or marketing surface.

## Data Flow

Opening a design:

1. The frontend asks the Tauri backend to read the `.excalidraw` file.
2. The backend returns the scene JSON.
3. The frontend validates that the scene has the expected Excalidraw shape.
4. The frontend passes the scene into the Excalidraw editor.

Editing a design:

1. Excalidraw change events update in-memory scene state.
2. Autosave waits briefly after edits settle.
3. The frontend sends the full scene JSON to the backend.
4. The backend writes the scene to a temporary file, then replaces the original file.
5. The editor header updates to `Saved`, `Saving...`, or `Unsaved changes`.

Manual save uses the same backend write path as autosave.

## Error Handling

- If a project list cannot be read, show a clear library-level error.
- If a design cannot be read, keep the user in the library and show the failed file name.
- If a save fails, keep the editor open, mark the design as unsaved, and offer retry.
- If a project or design name conflicts, ask for a different name instead of overwriting.
- Delete actions require confirmation.
- Rename and duplicate operations preserve the original when the operation fails.
- Invalid `.excalidraw` files are not silently repaired in the MVP.

## Testing

Backend tests should cover:

- Project create, list, rename, duplicate, and delete.
- Design create, list, read, write, rename, duplicate, and delete.
- Name-conflict handling.
- Temp-file-and-replace save behavior.

Frontend tests should cover:

- Empty library state.
- Creating a project.
- Creating a design inside a project.
- Opening a design.
- Save status transitions around autosave and manual save.
- Error states for failed reads and failed saves.

End-to-end or smoke testing should verify:

- The app starts.
- The library renders.
- A design can be opened.
- The Excalidraw editor renders non-empty UI.
- A basic scene can be saved and reopened.

## Future Enhancements

- User-selected workspace folder on first launch.
- All Designs view across projects.
- Thumbnails.
- Tags or favorites.
- PNG and SVG export management.
- Rich attachment/image library.
- Optional SQLite index if project scanning becomes too slow.
- Recent designs.
- App-level settings.
