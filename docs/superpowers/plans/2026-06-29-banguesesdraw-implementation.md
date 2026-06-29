# BanguesesDraw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri desktop app that manages local Excalidraw scene files in visible project folders under `/Users/rbangueses/Documents/BanguesesDraw/Designs`.

**Architecture:** The React/TypeScript frontend renders the library and editor shell, embeds `@excalidraw/excalidraw`, and calls a narrow Tauri command API. The Rust backend owns filesystem operations, path safety, scene reads/writes, and temp-file replacement saves. Scene files remain plain `.excalidraw` JSON.

**Tech Stack:** Tauri v2, React, TypeScript, Vite, Rust, `@excalidraw/excalidraw`, Vitest, React Testing Library, Rust unit tests, Playwright smoke test.

## Global Constraints

- Storage root is `/Users/rbangueses/Documents/BanguesesDraw/Designs/`.
- Each project is a folder.
- Each design is a plain `.excalidraw` JSON scene file.
- MVP stores scene files only.
- No cloud sync, collaboration, accounts, remote storage, SQLite index, or browser-only IndexedDB storage.
- Do not rebuild Excalidraw's drawing engine.
- Preserve license notices for Excalidraw and other dependencies.
- UI opens directly into the local design library.
- UI must be quiet, utility-focused, and built for repeated use.
- Delete actions require confirmation.
- Name conflicts must not overwrite existing files.
- Save writes must use a temp-file-and-replace path.

---

## File Structure

Create this project structure from the empty repo:

```text
/Users/rbangueses/Documents/BanguesesDraw/
  Designs/
  docs/superpowers/specs/2026-06-29-banguesesdraw-design.md
  docs/superpowers/plans/2026-06-29-banguesesdraw-implementation.md
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  src/
    App.tsx
    main.tsx
    styles.css
    test/
      setup.ts
    types/
      designs.ts
      excalidraw.ts
    lib/
      designApi.ts
      designNames.ts
      sceneValidation.ts
    hooks/
      useAutosave.ts
      useDesignLibrary.ts
    components/
      AppShell.tsx
      LibraryView.tsx
      ProjectSidebar.tsx
      DesignList.tsx
      EditorView.tsx
      ConfirmDialog.tsx
      RenameDialog.tsx
  src-tauri/
    Cargo.toml
    tauri.conf.json
    capabilities/default.json
    src/
      main.rs
      designs.rs
  tests/
    smoke.spec.ts
```

Responsibilities:

- `src-tauri/src/designs.rs`: local filesystem domain logic, path validation, atomic scene writes, Rust tests.
- `src-tauri/src/main.rs`: Tauri command wrappers around `designs.rs`.
- `src/types/designs.ts`: shared frontend types matching Tauri command payloads.
- `src/types/excalidraw.ts`: minimal app-owned scene types so frontend code is not tightly coupled to Excalidraw internals.
- `src/lib/designApi.ts`: TypeScript wrapper around `@tauri-apps/api/core` `invoke`.
- `src/lib/designNames.ts`: frontend name validation helpers for dialog UX.
- `src/lib/sceneValidation.ts`: shallow scene validation before loading scene data into Excalidraw.
- `src/hooks/useDesignLibrary.ts`: library loading and mutation state.
- `src/hooks/useAutosave.ts`: debounced save state machine.
- `src/components/*`: focused React UI components.
- `src/App.tsx`: top-level route/state between library and editor.

---

### Task 1: Scaffold The Tauri React App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`

**Interfaces:**
- Produces: working Vite + Tauri shell with `<App />`.
- Produces: npm scripts `dev`, `tauri:dev`, `build`, `test`, `test:run`, and `smoke`.

- [ ] **Step 1: Initialize npm metadata**

Create `package.json`:

```json
{
  "name": "banguesesdraw",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "tauri:dev": "tauri dev",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "smoke": "playwright test"
  },
  "dependencies": {
    "@excalidraw/excalidraw": "latest",
    "@tauri-apps/api": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@tauri-apps/cli": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 3: Add Vite and TypeScript config**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BanguesesDraw</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Add the minimal React app**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-root">
      <h1>BanguesesDraw</h1>
    </main>
  );
}
```

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the application name", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "BanguesesDraw" })).toBeVisible();
  });
});
```

Create `src/styles.css`:

```css
:root {
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  color: #202124;
  background: #f7f7f4;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input {
  font: inherit;
}

.app-root {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
```

- [ ] **Step 5: Add Tauri config**

Create `src-tauri/Cargo.toml`:

```toml
[package]
name = "banguesesdraw"
version = "0.1.0"
description = "Local Excalidraw design manager"
authors = ["BanguesesDraw"]
edition = "2021"

[lib]
name = "banguesesdraw_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = [] }
thiserror = "1"
```

Create `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "BanguesesDraw",
  "version": "0.1.0",
  "identifier": "com.bangueses.draw",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "BanguesesDraw",
        "width": 1280,
        "height": 820,
        "minWidth": 960,
        "minHeight": 640
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": []
  }
}
```

Create `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default desktop capability",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

Create `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build();
}
```

Create `src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running BanguesesDraw");
}
```

- [ ] **Step 6: Verify scaffold**

Run: `npm run test:run`

Expected: PASS for `src/App.test.tsx`.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: Rust build completes and tests pass.

- [ ] **Step 7: Commit scaffold**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json src src-tauri
git commit -m "chore: scaffold BanguesesDraw app"
```

---

### Task 2: Implement Backend Filesystem Domain

**Files:**
- Create: `src-tauri/src/designs.rs`
- Modify: `src-tauri/src/main.rs`

**Interfaces:**
- Produces: `ProjectSummary { name: String, design_count: usize }`
- Produces: `DesignSummary { project: String, name: String, file_name: String, updated_at_ms: u128 }`
- Produces: `DesignScene { project: String, name: String, content: serde_json::Value }`
- Produces: filesystem functions:
  - `list_projects(root: &Path) -> Result<Vec<ProjectSummary>, DesignError>`
  - `create_project(root: &Path, name: &str) -> Result<ProjectSummary, DesignError>`
  - `rename_project(root: &Path, old_name: &str, new_name: &str) -> Result<ProjectSummary, DesignError>`
  - `delete_project(root: &Path, name: &str) -> Result<(), DesignError>`
  - `duplicate_project(root: &Path, source_name: &str, target_name: &str) -> Result<ProjectSummary, DesignError>`
  - `list_designs(root: &Path, project: &str) -> Result<Vec<DesignSummary>, DesignError>`
  - `create_design(root: &Path, project: &str, name: &str) -> Result<DesignScene, DesignError>`
  - `read_design(root: &Path, project: &str, file_name: &str) -> Result<DesignScene, DesignError>`
  - `write_design(root: &Path, project: &str, file_name: &str, content: &serde_json::Value) -> Result<DesignScene, DesignError>`
  - `rename_design(root: &Path, project: &str, old_file_name: &str, new_name: &str) -> Result<DesignSummary, DesignError>`
  - `duplicate_design(root: &Path, project: &str, source_file_name: &str, target_name: &str) -> Result<DesignSummary, DesignError>`
  - `delete_design(root: &Path, project: &str, file_name: &str) -> Result<(), DesignError>`

- [ ] **Step 1: Write failing backend tests**

Create `src-tauri/src/designs.rs` with tests first:

```rust
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub name: String,
    pub design_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesignSummary {
    pub project: String,
    pub name: String,
    pub file_name: String,
    pub updated_at_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DesignScene {
    pub project: String,
    pub name: String,
    pub file_name: String,
    pub content: Value,
}

#[derive(Debug, Error)]
pub enum DesignError {
    #[error("invalid name: {0}")]
    InvalidName(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("already exists: {0}")]
    AlreadyExists(String),
    #[error("invalid design file: {0}")]
    InvalidDesignFile(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

pub fn empty_scene() -> Value {
    json!({
        "type": "excalidraw",
        "version": 2,
        "source": "banguesesdraw",
        "elements": [],
        "appState": {},
        "files": {}
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root(label: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("banguesesdraw-{label}-{stamp}"))
    }

    #[test]
    fn creates_and_lists_projects() {
        let root = test_root("projects");
        let project = create_project(&root, "Client Sketches").unwrap();
        assert_eq!(project.name, "Client Sketches");
        assert_eq!(project.design_count, 0);

        let projects = list_projects(&root).unwrap();
        assert_eq!(projects, vec![project]);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_path_traversal_names() {
        let root = test_root("traversal");
        let err = create_project(&root, "../bad").unwrap_err();
        assert!(matches!(err, DesignError::InvalidName(_)));
    }

    #[test]
    fn refuses_project_name_conflicts() {
        let root = test_root("conflict");
        create_project(&root, "Plans").unwrap();
        let err = create_project(&root, "Plans").unwrap_err();
        assert!(matches!(err, DesignError::AlreadyExists(_)));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn creates_reads_writes_and_lists_designs() {
        let root = test_root("designs");
        create_project(&root, "App").unwrap();
        let created = create_design(&root, "App", "First Flow").unwrap();
        assert_eq!(created.file_name, "First Flow.excalidraw");
        assert_eq!(created.content["type"], "excalidraw");

        let updated = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [{"id": "box-1", "type": "rectangle"}],
            "appState": {},
            "files": {}
        });
        write_design(&root, "App", "First Flow.excalidraw", &updated).unwrap();

        let read = read_design(&root, "App", "First Flow.excalidraw").unwrap();
        assert_eq!(read.content["elements"][0]["id"], "box-1");

        let designs = list_designs(&root, "App").unwrap();
        assert_eq!(designs.len(), 1);
        assert_eq!(designs[0].name, "First Flow");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rename_duplicate_and_delete_designs_preserve_originals() {
        let root = test_root("rename-duplicate");
        create_project(&root, "Ideas").unwrap();
        create_design(&root, "Ideas", "Sketch").unwrap();

        let renamed = rename_design(&root, "Ideas", "Sketch.excalidraw", "Sketch v2").unwrap();
        assert_eq!(renamed.file_name, "Sketch v2.excalidraw");

        let duplicated = duplicate_design(&root, "Ideas", "Sketch v2.excalidraw", "Copy").unwrap();
        assert_eq!(duplicated.file_name, "Copy.excalidraw");

        delete_design(&root, "Ideas", "Copy.excalidraw").unwrap();
        let designs = list_designs(&root, "Ideas").unwrap();
        assert_eq!(designs.len(), 1);
        assert_eq!(designs[0].file_name, "Sketch v2.excalidraw");

        fs::remove_dir_all(root).unwrap();
    }
}
```

- [ ] **Step 2: Run backend tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml designs`

Expected: FAIL with missing functions such as `create_project`, `list_projects`, and `create_design`.

- [ ] **Step 3: Implement backend filesystem logic**

Extend `src-tauri/src/designs.rs` after the tests' type definitions:

```rust
const EXTENSION: &str = "excalidraw";

fn ensure_root(root: &Path) -> Result<(), DesignError> {
    fs::create_dir_all(root)?;
    Ok(())
}

fn validate_name(name: &str) -> Result<String, DesignError> {
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed == "."
        || trimmed == ".."
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed.contains(':')
    {
        return Err(DesignError::InvalidName(name.to_string()));
    }
    Ok(trimmed.to_string())
}

fn design_file_name(name: &str) -> Result<String, DesignError> {
    let clean = validate_name(name)?;
    if clean.ends_with(&format!(".{EXTENSION}")) {
        Ok(clean)
    } else {
        Ok(format!("{clean}.{EXTENSION}"))
    }
}

fn design_name_from_file(file_name: &str) -> String {
    file_name
        .strip_suffix(&format!(".{EXTENSION}"))
        .unwrap_or(file_name)
        .to_string()
}

fn project_path(root: &Path, project: &str) -> Result<PathBuf, DesignError> {
    Ok(root.join(validate_name(project)?))
}

fn design_path(root: &Path, project: &str, file_name: &str) -> Result<PathBuf, DesignError> {
    let project_dir = project_path(root, project)?;
    let file_name = design_file_name(file_name)?;
    Ok(project_dir.join(file_name))
}

fn modified_ms(path: &Path) -> u128 {
    fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn project_summary(path: &Path) -> Result<ProjectSummary, DesignError> {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| DesignError::InvalidName(path.display().to_string()))?
        .to_string();
    let design_count = fs::read_dir(path)?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .path()
                .extension()
                .and_then(|extension| extension.to_str())
                == Some(EXTENSION)
        })
        .count();
    Ok(ProjectSummary { name, design_count })
}

fn validate_scene(value: &Value) -> Result<(), DesignError> {
    if value.get("type").and_then(Value::as_str) != Some("excalidraw") {
        return Err(DesignError::InvalidDesignFile(
            "missing type=excalidraw".to_string(),
        ));
    }
    if !value.get("elements").is_some_and(Value::is_array) {
        return Err(DesignError::InvalidDesignFile(
            "missing elements array".to_string(),
        ));
    }
    Ok(())
}

pub fn list_projects(root: &Path) -> Result<Vec<ProjectSummary>, DesignError> {
    ensure_root(root)?;
    let mut projects = fs::read_dir(root)?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_dir())
        .map(|entry| project_summary(&entry.path()))
        .collect::<Result<Vec<_>, _>>()?;
    projects.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(projects)
}

pub fn create_project(root: &Path, name: &str) -> Result<ProjectSummary, DesignError> {
    ensure_root(root)?;
    let path = project_path(root, name)?;
    if path.exists() {
        return Err(DesignError::AlreadyExists(name.to_string()));
    }
    fs::create_dir(&path)?;
    project_summary(&path)
}

pub fn rename_project(root: &Path, old_name: &str, new_name: &str) -> Result<ProjectSummary, DesignError> {
    let old_path = project_path(root, old_name)?;
    let new_path = project_path(root, new_name)?;
    if !old_path.exists() {
        return Err(DesignError::NotFound(old_name.to_string()));
    }
    if new_path.exists() {
        return Err(DesignError::AlreadyExists(new_name.to_string()));
    }
    fs::rename(old_path, &new_path)?;
    project_summary(&new_path)
}

pub fn delete_project(root: &Path, name: &str) -> Result<(), DesignError> {
    let path = project_path(root, name)?;
    if !path.exists() {
        return Err(DesignError::NotFound(name.to_string()));
    }
    fs::remove_dir_all(path)?;
    Ok(())
}

pub fn duplicate_project(root: &Path, source_name: &str, target_name: &str) -> Result<ProjectSummary, DesignError> {
    let source = project_path(root, source_name)?;
    let target = project_path(root, target_name)?;
    if !source.exists() {
        return Err(DesignError::NotFound(source_name.to_string()));
    }
    if target.exists() {
        return Err(DesignError::AlreadyExists(target_name.to_string()));
    }
    fs::create_dir(&target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        if entry.path().is_file() {
            fs::copy(entry.path(), target.join(entry.file_name()))?;
        }
    }
    project_summary(&target)
}

pub fn list_designs(root: &Path, project: &str) -> Result<Vec<DesignSummary>, DesignError> {
    let project_dir = project_path(root, project)?;
    if !project_dir.exists() {
        return Err(DesignError::NotFound(project.to_string()));
    }
    let mut designs = fs::read_dir(&project_dir)?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .filter(|entry| {
            entry
                .path()
                .extension()
                .and_then(|extension| extension.to_str())
                == Some(EXTENSION)
        })
        .map(|entry| {
            let file_name = entry.file_name().to_string_lossy().to_string();
            Ok(DesignSummary {
                project: project.to_string(),
                name: design_name_from_file(&file_name),
                file_name,
                updated_at_ms: modified_ms(&entry.path()),
            })
        })
        .collect::<Result<Vec<_>, DesignError>>()?;
    designs.sort_by(|a, b| b.updated_at_ms.cmp(&a.updated_at_ms));
    Ok(designs)
}

pub fn create_design(root: &Path, project: &str, name: &str) -> Result<DesignScene, DesignError> {
    let path = design_path(root, project, name)?;
    if path.exists() {
        return Err(DesignError::AlreadyExists(name.to_string()));
    }
    let content = empty_scene();
    write_design(root, project, path.file_name().unwrap().to_string_lossy().as_ref(), &content)
}

pub fn read_design(root: &Path, project: &str, file_name: &str) -> Result<DesignScene, DesignError> {
    let path = design_path(root, project, file_name)?;
    if !path.exists() {
        return Err(DesignError::NotFound(file_name.to_string()));
    }
    let content: Value = serde_json::from_str(&fs::read_to_string(&path)?)?;
    validate_scene(&content)?;
    let file_name = path.file_name().unwrap().to_string_lossy().to_string();
    Ok(DesignScene {
        project: project.to_string(),
        name: design_name_from_file(&file_name),
        file_name,
        content,
    })
}

pub fn write_design(root: &Path, project: &str, file_name: &str, content: &Value) -> Result<DesignScene, DesignError> {
    validate_scene(content)?;
    let path = design_path(root, project, file_name)?;
    let parent = path.parent().ok_or_else(|| DesignError::InvalidName(file_name.to_string()))?;
    if !parent.exists() {
        return Err(DesignError::NotFound(project.to_string()));
    }
    let tmp_path = path.with_extension(format!("{EXTENSION}.tmp"));
    fs::write(&tmp_path, serde_json::to_string_pretty(content)?)?;
    fs::rename(&tmp_path, &path)?;
    read_design(root, project, path.file_name().unwrap().to_string_lossy().as_ref())
}

pub fn rename_design(root: &Path, project: &str, old_file_name: &str, new_name: &str) -> Result<DesignSummary, DesignError> {
    let old_path = design_path(root, project, old_file_name)?;
    let new_path = design_path(root, project, new_name)?;
    if !old_path.exists() {
        return Err(DesignError::NotFound(old_file_name.to_string()));
    }
    if new_path.exists() {
        return Err(DesignError::AlreadyExists(new_name.to_string()));
    }
    fs::rename(old_path, &new_path)?;
    let file_name = new_path.file_name().unwrap().to_string_lossy().to_string();
    Ok(DesignSummary {
        project: project.to_string(),
        name: design_name_from_file(&file_name),
        file_name,
        updated_at_ms: modified_ms(&new_path),
    })
}

pub fn duplicate_design(root: &Path, project: &str, source_file_name: &str, target_name: &str) -> Result<DesignSummary, DesignError> {
    let source = design_path(root, project, source_file_name)?;
    let target = design_path(root, project, target_name)?;
    if !source.exists() {
        return Err(DesignError::NotFound(source_file_name.to_string()));
    }
    if target.exists() {
        return Err(DesignError::AlreadyExists(target_name.to_string()));
    }
    fs::copy(&source, &target)?;
    let file_name = target.file_name().unwrap().to_string_lossy().to_string();
    Ok(DesignSummary {
        project: project.to_string(),
        name: design_name_from_file(&file_name),
        file_name,
        updated_at_ms: modified_ms(&target),
    })
}

pub fn delete_design(root: &Path, project: &str, file_name: &str) -> Result<(), DesignError> {
    let path = design_path(root, project, file_name)?;
    if !path.exists() {
        return Err(DesignError::NotFound(file_name.to_string()));
    }
    fs::remove_file(path)?;
    Ok(())
}
```

Modify `src-tauri/src/main.rs`:

```rust
mod designs;

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running BanguesesDraw");
}
```

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml designs`

Expected: PASS for all `designs` tests.

- [ ] **Step 5: Commit backend domain**

```bash
git add src-tauri/src/designs.rs src-tauri/src/main.rs
git commit -m "feat: add local design filesystem domain"
```

---

### Task 3: Expose Tauri Commands And Frontend API

**Files:**
- Modify: `src-tauri/src/main.rs`
- Create: `src/types/designs.ts`
- Create: `src/types/excalidraw.ts`
- Create: `src/lib/designApi.ts`
- Create: `src/lib/designApi.test.ts`
- Create: `src/lib/sceneValidation.ts`
- Create: `src/lib/sceneValidation.test.ts`
- Create: `src/lib/designNames.ts`
- Create: `src/lib/designNames.test.ts`

**Interfaces:**
- Consumes: backend functions from `src-tauri/src/designs.rs`.
- Produces: `designApi` object with methods `listProjects`, `createProject`, `renameProject`, `duplicateProject`, `deleteProject`, `listDesigns`, `createDesign`, `readDesign`, `writeDesign`, `renameDesign`, `duplicateDesign`, `deleteDesign`.
- Produces: `isExcalidrawScene(value: unknown): value is ExcalidrawScene`.
- Produces: `validateDisplayName(name: string): string | null`.

- [ ] **Step 1: Write frontend helper tests**

Create `src/lib/sceneValidation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isExcalidrawScene } from "./sceneValidation";

describe("isExcalidrawScene", () => {
  it("accepts a minimal Excalidraw scene", () => {
    expect(
      isExcalidrawScene({
        type: "excalidraw",
        elements: [],
        appState: {},
        files: {},
      }),
    ).toBe(true);
  });

  it("rejects invalid scene data", () => {
    expect(isExcalidrawScene({ type: "other", elements: [] })).toBe(false);
    expect(isExcalidrawScene(null)).toBe(false);
  });
});
```

Create `src/lib/designNames.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateDisplayName } from "./designNames";

describe("validateDisplayName", () => {
  it("accepts normal names", () => {
    expect(validateDisplayName("Client Flow")).toBeNull();
  });

  it("rejects empty and path-like names", () => {
    expect(validateDisplayName("")).toBe("Enter a name.");
    expect(validateDisplayName("../bad")).toBe("Names cannot contain path separators or colons.");
    expect(validateDisplayName("bad:name")).toBe("Names cannot contain path separators or colons.");
  });
});
```

Create `src/lib/designApi.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("designApi", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("calls list_projects", async () => {
    invoke.mockResolvedValueOnce([{ name: "App", designCount: 2 }]);
    const { designApi } = await import("./designApi");

    await expect(designApi.listProjects()).resolves.toEqual([
      { name: "App", designCount: 2 },
    ]);
    expect(invoke).toHaveBeenCalledWith("list_projects");
  });

  it("calls write_design with scene content", async () => {
    const scene = { type: "excalidraw", elements: [], appState: {}, files: {} };
    invoke.mockResolvedValueOnce({
      project: "App",
      name: "Sketch",
      fileName: "Sketch.excalidraw",
      content: scene,
    });
    const { designApi } = await import("./designApi");

    await designApi.writeDesign("App", "Sketch.excalidraw", scene);

    expect(invoke).toHaveBeenCalledWith("write_design", {
      project: "App",
      fileName: "Sketch.excalidraw",
      content: scene,
    });
  });
});
```

- [ ] **Step 2: Run frontend helper tests to verify they fail**

Run: `npm run test:run -- src/lib`

Expected: FAIL because `designApi`, `sceneValidation`, and `designNames` do not exist.

- [ ] **Step 3: Add frontend types and helpers**

Create `src/types/excalidraw.ts`:

```ts
export type ExcalidrawScene = {
  type: "excalidraw";
  version?: number;
  source?: string;
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};
```

Create `src/types/designs.ts`:

```ts
import type { ExcalidrawScene } from "./excalidraw";

export type ProjectSummary = {
  name: string;
  designCount: number;
};

export type DesignSummary = {
  project: string;
  name: string;
  fileName: string;
  updatedAtMs: number;
};

export type DesignScene = {
  project: string;
  name: string;
  fileName: string;
  content: ExcalidrawScene;
};
```

Create `src/lib/sceneValidation.ts`:

```ts
import type { ExcalidrawScene } from "../types/excalidraw";

export function isExcalidrawScene(value: unknown): value is ExcalidrawScene {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.type === "excalidraw" && Array.isArray(candidate.elements);
}
```

Create `src/lib/designNames.ts`:

```ts
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Enter a name.";
  }
  if (
    trimmed === "." ||
    trimmed === ".." ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes(":")
  ) {
    return "Names cannot contain path separators or colons.";
  }
  return null;
}
```

Create `src/lib/designApi.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { DesignScene, DesignSummary, ProjectSummary } from "../types/designs";
import type { ExcalidrawScene } from "../types/excalidraw";

export const designApi = {
  listProjects: () => invoke<ProjectSummary[]>("list_projects"),
  createProject: (name: string) => invoke<ProjectSummary>("create_project", { name }),
  renameProject: (oldName: string, newName: string) =>
    invoke<ProjectSummary>("rename_project", { oldName, newName }),
  duplicateProject: (sourceName: string, targetName: string) =>
    invoke<ProjectSummary>("duplicate_project", { sourceName, targetName }),
  deleteProject: (name: string) => invoke<void>("delete_project", { name }),
  listDesigns: (project: string) => invoke<DesignSummary[]>("list_designs", { project }),
  createDesign: (project: string, name: string) =>
    invoke<DesignScene>("create_design", { project, name }),
  readDesign: (project: string, fileName: string) =>
    invoke<DesignScene>("read_design", { project, fileName }),
  writeDesign: (project: string, fileName: string, content: ExcalidrawScene) =>
    invoke<DesignScene>("write_design", { project, fileName, content }),
  renameDesign: (project: string, oldFileName: string, newName: string) =>
    invoke<DesignSummary>("rename_design", { project, oldFileName, newName }),
  duplicateDesign: (project: string, sourceFileName: string, targetName: string) =>
    invoke<DesignSummary>("duplicate_design", { project, sourceFileName, targetName }),
  deleteDesign: (project: string, fileName: string) =>
    invoke<void>("delete_design", { project, fileName }),
};
```

- [ ] **Step 4: Add Tauri command wrappers**

Replace `src-tauri/src/main.rs` with:

```rust
mod designs;

use designs::{DesignScene, DesignSummary, ProjectSummary};
use serde_json::Value;
use std::path::PathBuf;

fn designs_root() -> PathBuf {
    PathBuf::from("/Users/rbangueses/Documents/BanguesesDraw/Designs")
}

#[tauri::command]
fn list_projects() -> Result<Vec<ProjectSummary>, String> {
    designs::list_projects(&designs_root()).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_project(name: String) -> Result<ProjectSummary, String> {
    designs::create_project(&designs_root(), &name).map_err(|error| error.to_string())
}

#[tauri::command]
fn rename_project(old_name: String, new_name: String) -> Result<ProjectSummary, String> {
    designs::rename_project(&designs_root(), &old_name, &new_name).map_err(|error| error.to_string())
}

#[tauri::command]
fn duplicate_project(source_name: String, target_name: String) -> Result<ProjectSummary, String> {
    designs::duplicate_project(&designs_root(), &source_name, &target_name).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_project(name: String) -> Result<(), String> {
    designs::delete_project(&designs_root(), &name).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_designs(project: String) -> Result<Vec<DesignSummary>, String> {
    designs::list_designs(&designs_root(), &project).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_design(project: String, name: String) -> Result<DesignScene, String> {
    designs::create_design(&designs_root(), &project, &name).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_design(project: String, file_name: String) -> Result<DesignScene, String> {
    designs::read_design(&designs_root(), &project, &file_name).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_design(project: String, file_name: String, content: Value) -> Result<DesignScene, String> {
    designs::write_design(&designs_root(), &project, &file_name, &content).map_err(|error| error.to_string())
}

#[tauri::command]
fn rename_design(project: String, old_file_name: String, new_name: String) -> Result<DesignSummary, String> {
    designs::rename_design(&designs_root(), &project, &old_file_name, &new_name).map_err(|error| error.to_string())
}

#[tauri::command]
fn duplicate_design(project: String, source_file_name: String, target_name: String) -> Result<DesignSummary, String> {
    designs::duplicate_design(&designs_root(), &project, &source_file_name, &target_name).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_design(project: String, file_name: String) -> Result<(), String> {
    designs::delete_design(&designs_root(), &project, &file_name).map_err(|error| error.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_projects,
            create_project,
            rename_project,
            duplicate_project,
            delete_project,
            list_designs,
            create_design,
            read_design,
            write_design,
            rename_design,
            duplicate_design,
            delete_design
        ])
        .run(tauri::generate_context!())
        .expect("error while running BanguesesDraw");
}
```

- [ ] **Step 5: Verify command/API layer**

Run: `npm run test:run -- src/lib`

Expected: PASS for `designApi`, `sceneValidation`, and `designNames`.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit command/API layer**

```bash
git add src-tauri/src/main.rs src/types src/lib
git commit -m "feat: expose local design API"
```

---

### Task 4: Build Library State And Project UI

**Files:**
- Create: `src/hooks/useDesignLibrary.ts`
- Create: `src/hooks/useDesignLibrary.test.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/ProjectSidebar.tsx`
- Create: `src/components/DesignList.tsx`
- Create: `src/components/LibraryView.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/components/RenameDialog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `designApi`.
- Produces: `useDesignLibrary()` state/actions for project and design CRUD.
- Produces: `LibraryView` props:
  - `onOpenDesign(project: string, fileName: string): void`

- [ ] **Step 1: Write failing library hook test**

Create `src/hooks/useDesignLibrary.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
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
      { name: "App", designCount: 1 },
    ]);
    vi.mocked(designApi.listDesigns).mockResolvedValueOnce([
      { project: "App", name: "Flow", fileName: "Flow.excalidraw", updatedAtMs: 1 },
    ]);

    const { result } = renderHook(() => useDesignLibrary());

    await waitFor(() => expect(result.current.projects[0].name).toBe("App"));
    expect(result.current.selectedProject).toBe("App");
    expect(result.current.designs[0].name).toBe("Flow");
  });
});
```

- [ ] **Step 2: Run hook test to verify it fails**

Run: `npm run test:run -- src/hooks/useDesignLibrary.test.tsx`

Expected: FAIL because `useDesignLibrary` does not exist.

- [ ] **Step 3: Implement library hook**

Create `src/hooks/useDesignLibrary.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { designApi } from "../lib/designApi";
import type { DesignSummary, ProjectSummary } from "../types/designs";

export function useDesignLibrary() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await designApi.listProjects();
      setProjects(loaded);
      setSelectedProject((current) => current ?? loaded[0]?.name ?? null);
    } catch (unknownError) {
      setError(String(unknownError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDesigns = useCallback(async (project: string | null) => {
    if (!project) {
      setDesigns([]);
      return;
    }
    setError(null);
    try {
      setDesigns(await designApi.listDesigns(project));
    } catch (unknownError) {
      setError(String(unknownError));
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadDesigns(selectedProject);
  }, [loadDesigns, selectedProject]);

  const filteredDesigns = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return designs;
    }
    return designs.filter((design) => design.name.toLowerCase().includes(query));
  }, [designs, filter]);

  return {
    projects,
    designs,
    filteredDesigns,
    selectedProject,
    filter,
    isLoading,
    error,
    setSelectedProject,
    setFilter,
    refresh: loadProjects,
    createProject: async (name: string) => {
      const project = await designApi.createProject(name);
      await loadProjects();
      setSelectedProject(project.name);
    },
    createDesign: async (name: string) => {
      if (!selectedProject) {
        return null;
      }
      const design = await designApi.createDesign(selectedProject, name);
      await loadDesigns(selectedProject);
      return design;
    },
  };
}
```

- [ ] **Step 4: Add library UI components**

Create `src/components/AppShell.tsx`:

```tsx
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return <div className="app-shell">{children}</div>;
}
```

Create `src/components/ConfirmDialog.tsx`:

```tsx
type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, body, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="danger-button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
```

Create `src/components/RenameDialog.tsx`:

```tsx
import { useState } from "react";
import { validateDisplayName } from "../lib/designNames";

type RenameDialogProps = {
  title: string;
  initialName?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void> | void;
};

export function RenameDialog({ title, initialName = "", submitLabel, onCancel, onSubmit }: RenameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const validation = validateDisplayName(name);
    if (validation) {
      setError(validation);
      return;
    }
    await onSubmit(name.trim());
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={submit}>{submitLabel}</button>
        </div>
      </section>
    </div>
  );
}
```

Create `src/components/ProjectSidebar.tsx`:

```tsx
import { FolderPlus } from "lucide-react";
import type { ProjectSummary } from "../types/designs";

type ProjectSidebarProps = {
  projects: ProjectSummary[];
  selectedProject: string | null;
  onSelectProject: (project: string) => void;
  onCreateProject: () => void;
};

export function ProjectSidebar({ projects, selectedProject, onSelectProject, onCreateProject }: ProjectSidebarProps) {
  return (
    <aside className="project-sidebar">
      <div className="sidebar-header">
        <h1>BanguesesDraw</h1>
        <button type="button" className="icon-button" onClick={onCreateProject} aria-label="Create project" title="Create project">
          <FolderPlus size={18} />
        </button>
      </div>
      <nav aria-label="Projects">
        {projects.map((project) => (
          <button
            type="button"
            key={project.name}
            className={project.name === selectedProject ? "project-button active" : "project-button"}
            onClick={() => onSelectProject(project.name)}
          >
            <span>{project.name}</span>
            <span>{project.designCount}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
```

Create `src/components/DesignList.tsx`:

```tsx
import { FilePlus2 } from "lucide-react";
import type { DesignSummary } from "../types/designs";

type DesignListProps = {
  project: string | null;
  designs: DesignSummary[];
  filter: string;
  onFilterChange: (filter: string) => void;
  onCreateDesign: () => void;
  onOpenDesign: (project: string, fileName: string) => void;
};

export function DesignList({ project, designs, filter, onFilterChange, onCreateDesign, onOpenDesign }: DesignListProps) {
  if (!project) {
    return <section className="empty-state">Create a project to start drawing.</section>;
  }

  return (
    <section className="design-panel">
      <header className="design-panel-header">
        <div>
          <p className="eyebrow">Project</p>
          <h2>{project}</h2>
        </div>
        <button type="button" onClick={onCreateDesign}>
          <FilePlus2 size={16} />
          New design
        </button>
      </header>
      <input
        className="filter-input"
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        placeholder="Filter designs"
        aria-label="Filter designs"
      />
      {designs.length === 0 ? (
        <div className="empty-state">No designs in this project yet.</div>
      ) : (
        <div className="design-list">
          {designs.map((design) => (
            <button
              type="button"
              className="design-row"
              key={design.fileName}
              onClick={() => onOpenDesign(design.project, design.fileName)}
            >
              <span>{design.name}</span>
              <span>{new Date(Number(design.updatedAtMs)).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
```

Create `src/components/LibraryView.tsx`:

```tsx
import { useState } from "react";
import { useDesignLibrary } from "../hooks/useDesignLibrary";
import { DesignList } from "./DesignList";
import { ProjectSidebar } from "./ProjectSidebar";
import { RenameDialog } from "./RenameDialog";

type LibraryViewProps = {
  onOpenDesign: (project: string, fileName: string) => void;
};

export function LibraryView({ onOpenDesign }: LibraryViewProps) {
  const library = useDesignLibrary();
  const [dialog, setDialog] = useState<"project" | "design" | null>(null);

  return (
    <div className="library-view">
      <ProjectSidebar
        projects={library.projects}
        selectedProject={library.selectedProject}
        onSelectProject={library.setSelectedProject}
        onCreateProject={() => setDialog("project")}
      />
      <main className="library-main">
        {library.error ? <div className="error-banner">{library.error}</div> : null}
        {library.isLoading ? (
          <section className="empty-state">Loading designs...</section>
        ) : (
          <DesignList
            project={library.selectedProject}
            designs={library.filteredDesigns}
            filter={library.filter}
            onFilterChange={library.setFilter}
            onCreateDesign={() => setDialog("design")}
            onOpenDesign={onOpenDesign}
          />
        )}
      </main>
      {dialog === "project" ? (
        <RenameDialog
          title="Create project"
          submitLabel="Create"
          onCancel={() => setDialog(null)}
          onSubmit={async (name) => {
            await library.createProject(name);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "design" ? (
        <RenameDialog
          title="Create design"
          submitLabel="Create"
          onCancel={() => setDialog(null)}
          onSubmit={async (name) => {
            const design = await library.createDesign(name);
            setDialog(null);
            if (design) {
              onOpenDesign(design.project, design.fileName);
            }
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Wire library into App and CSS**

Replace `src/App.tsx`:

```tsx
import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { LibraryView } from "./components/LibraryView";

type OpenDesign = {
  project: string;
  fileName: string;
};

export default function App() {
  const [openDesign, setOpenDesign] = useState<OpenDesign | null>(null);

  return (
    <AppShell>
      {openDesign ? (
        <main className="editor-preview">
          <button type="button" onClick={() => setOpenDesign(null)}>Back</button>
          <p>{openDesign.project} / {openDesign.fileName}</p>
        </main>
      ) : (
        <LibraryView
          onOpenDesign={(project, fileName) => setOpenDesign({ project, fileName })}
        />
      )}
    </AppShell>
  );
}
```

Append to `src/styles.css`:

```css
.app-shell {
  min-height: 100vh;
  background: #f7f7f4;
}

.library-view {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 100vh;
}

.project-sidebar {
  border-right: 1px solid #deded8;
  background: #ffffff;
  padding: 16px;
}

.sidebar-header,
.design-panel-header,
.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-header h1,
.design-panel h2 {
  margin: 0;
  font-size: 18px;
}

.icon-button {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
}

.project-button,
.design-row {
  width: 100%;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #202124;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.project-button.active,
.project-button:hover,
.design-row:hover {
  background: #ecebe4;
}

.library-main {
  padding: 24px;
  min-width: 0;
}

.design-panel {
  max-width: 980px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #676b73;
  font-size: 12px;
  text-transform: uppercase;
}

.filter-input {
  width: 100%;
  margin: 18px 0;
  padding: 10px 12px;
  border: 1px solid #d7d7d0;
  border-radius: 6px;
}

.design-list {
  border: 1px solid #deded8;
  border-radius: 8px;
  overflow: hidden;
}

.design-row {
  border-radius: 0;
  border-bottom: 1px solid #eeeeea;
  background: #ffffff;
}

.design-row:last-child {
  border-bottom: 0;
}

.empty-state,
.error-banner {
  border: 1px solid #deded8;
  border-radius: 8px;
  background: #ffffff;
  padding: 24px;
}

.error-banner,
.form-error {
  color: #9b1c1c;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(32 33 36 / 35%);
}

.dialog {
  width: min(420px, calc(100vw - 32px));
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
}

.dialog input {
  width: 100%;
  padding: 10px 12px;
}

.danger-button {
  color: #9b1c1c;
}

.editor-preview {
  padding: 24px;
}
```

- [ ] **Step 6: Verify library UI**

Run: `npm run test:run -- src/hooks src/lib`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit library UI**

```bash
git add src/hooks src/components src/App.tsx src/styles.css
git commit -m "feat: add local design library UI"
```

---

### Task 5: Integrate Excalidraw Editor And Autosave

**Files:**
- Create: `src/hooks/useAutosave.ts`
- Create: `src/hooks/useAutosave.test.tsx`
- Create: `src/components/EditorView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `designApi.readDesign(project, fileName)` and `designApi.writeDesign(project, fileName, content)`.
- Consumes: `isExcalidrawScene`.
- Produces: `EditorView` props:
  - `project: string`
  - `fileName: string`
  - `onBack(): void`
- Produces: `useAutosave({ project, fileName, scene, enabled })` returning `{ status, saveNow, error }`.

- [ ] **Step 1: Write failing autosave test**

Create `src/hooks/useAutosave.test.tsx`:

```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "./useAutosave";

vi.useFakeTimers();

vi.mock("../lib/designApi", () => ({
  designApi: {
    writeDesign: vi.fn(),
  },
}));

const { designApi } = await import("../lib/designApi");

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
          scene: { type: "excalidraw" as const, elements: [], appState: {}, files: {} },
        },
      },
    );

    rerender({
      scene: {
        type: "excalidraw" as const,
        elements: [{ id: "a" }],
        appState: {},
        files: {},
      },
    });

    expect(result.current.status).toBe("unsaved");

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    await waitFor(() => expect(result.current.status).toBe("saved"));
    expect(designApi.writeDesign).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run autosave test to verify it fails**

Run: `npm run test:run -- src/hooks/useAutosave.test.tsx`

Expected: FAIL because `useAutosave` does not exist.

- [ ] **Step 3: Implement autosave hook**

Create `src/hooks/useAutosave.ts`:

```ts
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

export function useAutosave({ project, fileName, scene, enabled }: UseAutosaveArgs) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef<string>("");

  const saveNow = useCallback(async () => {
    if (!scene) {
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      await designApi.writeDesign(project, fileName, scene);
      lastSaved.current = JSON.stringify(scene);
      setStatus("saved");
    } catch (unknownError) {
      setError(String(unknownError));
      setStatus("error");
    }
  }, [fileName, project, scene]);

  useEffect(() => {
    if (!enabled || !scene) {
      return;
    }

    const serialized = JSON.stringify(scene);
    if (serialized === lastSaved.current) {
      return;
    }

    setStatus("unsaved");
    const timeout = window.setTimeout(() => {
      void saveNow();
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [enabled, saveNow, scene]);

  return { status, saveNow, error };
}
```

- [ ] **Step 4: Add editor view**

Create `src/components/EditorView.tsx`:

```tsx
import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { designApi } from "../lib/designApi";
import { isExcalidrawScene } from "../lib/sceneValidation";
import { useAutosave } from "../hooks/useAutosave";
import type { ExcalidrawScene } from "../types/excalidraw";

type EditorViewProps = {
  project: string;
  fileName: string;
  onBack: () => void;
};

export function EditorView({ project, fileName, onBack }: EditorViewProps) {
  const [scene, setScene] = useState<ExcalidrawScene | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const autosave = useAutosave({ project, fileName, scene, enabled: Boolean(scene) });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const design = await designApi.readDesign(project, fileName);
        if (!isExcalidrawScene(design.content)) {
          throw new Error("Invalid Excalidraw scene.");
        }
        if (!cancelled) {
          setScene(design.content);
        }
      } catch (unknownError) {
        if (!cancelled) {
          setLoadError(String(unknownError));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [fileName, project]);

  return (
    <div className="editor-view">
      <header className="editor-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to library" title="Back to library">
          <ArrowLeft size={18} />
        </button>
        <div className="editor-title">
          <span>{project}</span>
          <strong>{fileName.replace(/\.excalidraw$/, "")}</strong>
        </div>
        <div className="save-cluster">
          <span className={`save-status ${autosave.status}`}>{autosave.status}</span>
          <button type="button" onClick={autosave.saveNow}>
            <Save size={16} />
            Save
          </button>
        </div>
      </header>
      {loadError ? (
        <main className="empty-state">{loadError}</main>
      ) : scene ? (
        <main className="canvas-wrap">
          <Excalidraw
            initialData={scene}
            onChange={(elements, appState, files) => {
              setScene({
                ...scene,
                elements: elements as unknown[],
                appState: appState as unknown as Record<string, unknown>,
                files: files as Record<string, unknown>,
              });
            }}
          />
          {autosave.error ? <div className="save-error">{autosave.error}</div> : null}
        </main>
      ) : (
        <main className="empty-state">Loading editor...</main>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire editor into App and CSS**

Replace `src/App.tsx`:

```tsx
import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { EditorView } from "./components/EditorView";
import { LibraryView } from "./components/LibraryView";

type OpenDesign = {
  project: string;
  fileName: string;
};

export default function App() {
  const [openDesign, setOpenDesign] = useState<OpenDesign | null>(null);

  return (
    <AppShell>
      {openDesign ? (
        <EditorView
          project={openDesign.project}
          fileName={openDesign.fileName}
          onBack={() => setOpenDesign(null)}
        />
      ) : (
        <LibraryView
          onOpenDesign={(project, fileName) => setOpenDesign({ project, fileName })}
        />
      )}
    </AppShell>
  );
}
```

Append to `src/styles.css`:

```css
.editor-view {
  min-height: 100vh;
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr);
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #deded8;
  background: #ffffff;
  padding: 8px 12px;
}

.editor-title {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.editor-title span {
  color: #676b73;
  font-size: 12px;
}

.editor-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-cluster {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.save-status {
  color: #676b73;
  font-size: 13px;
  text-transform: capitalize;
}

.save-status.error,
.save-error {
  color: #9b1c1c;
}

.canvas-wrap {
  position: relative;
  min-height: 0;
}

.canvas-wrap .excalidraw {
  height: calc(100vh - 56px);
}

.save-error {
  position: absolute;
  right: 16px;
  bottom: 16px;
  border: 1px solid #f0b8b8;
  border-radius: 6px;
  background: #fff7f7;
  padding: 10px 12px;
}
```

- [ ] **Step 6: Verify editor integration**

Run: `npm run test:run -- src/hooks src/lib`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit editor integration**

```bash
git add src/hooks/useAutosave.ts src/hooks/useAutosave.test.tsx src/components/EditorView.tsx src/App.tsx src/styles.css
git commit -m "feat: embed Excalidraw editor with autosave"
```

---

### Task 6: Complete Project And Design Management Actions

**Files:**
- Modify: `src/hooks/useDesignLibrary.ts`
- Modify: `src/components/LibraryView.tsx`
- Modify: `src/components/ProjectSidebar.tsx`
- Modify: `src/components/DesignList.tsx`
- Modify: `src/components/EditorView.tsx`
- Modify: `src/styles.css`
- Modify: `src/hooks/useDesignLibrary.test.tsx`

**Interfaces:**
- Consumes: all `designApi` CRUD methods.
- Produces: visible create, rename, duplicate, and delete actions for projects and designs.
- Produces: delete confirmation flow using `ConfirmDialog`.

- [ ] **Step 1: Extend hook tests for delete and duplicate**

Update `src/hooks/useDesignLibrary.test.tsx` mock to include all methods:

```tsx
vi.mock("../lib/designApi", () => ({
  designApi: {
    listProjects: vi.fn(),
    listDesigns: vi.fn(),
    createProject: vi.fn(),
    renameProject: vi.fn(),
    duplicateProject: vi.fn(),
    deleteProject: vi.fn(),
    createDesign: vi.fn(),
    renameDesign: vi.fn(),
    duplicateDesign: vi.fn(),
    deleteDesign: vi.fn(),
  },
}));
```

Add this test:

```tsx
it("duplicates and deletes designs through the API", async () => {
  vi.mocked(designApi.listProjects).mockResolvedValue([{ name: "App", designCount: 1 }]);
  vi.mocked(designApi.listDesigns).mockResolvedValue([
    { project: "App", name: "Flow", fileName: "Flow.excalidraw", updatedAtMs: 1 },
  ]);
  vi.mocked(designApi.duplicateDesign).mockResolvedValue({
    project: "App",
    name: "Flow Copy",
    fileName: "Flow Copy.excalidraw",
    updatedAtMs: 2,
  });
  vi.mocked(designApi.deleteDesign).mockResolvedValue();

  const { result } = renderHook(() => useDesignLibrary());
  await waitFor(() => expect(result.current.selectedProject).toBe("App"));

  await act(async () => {
    await result.current.duplicateDesign("Flow.excalidraw", "Flow Copy");
    await result.current.deleteDesign("Flow.excalidraw");
  });

  expect(designApi.duplicateDesign).toHaveBeenCalledWith("App", "Flow.excalidraw", "Flow Copy");
  expect(designApi.deleteDesign).toHaveBeenCalledWith("App", "Flow.excalidraw");
});
```

- [ ] **Step 2: Run extended hook tests to verify they fail**

Run: `npm run test:run -- src/hooks/useDesignLibrary.test.tsx`

Expected: FAIL because `duplicateDesign` and `deleteDesign` actions are missing.

- [ ] **Step 3: Extend `useDesignLibrary` actions**

Add these methods inside the returned object in `src/hooks/useDesignLibrary.ts`:

```ts
renameProject: async (oldName: string, newName: string) => {
  const project = await designApi.renameProject(oldName, newName);
  await loadProjects();
  setSelectedProject(project.name);
},
duplicateProject: async (sourceName: string, targetName: string) => {
  const project = await designApi.duplicateProject(sourceName, targetName);
  await loadProjects();
  setSelectedProject(project.name);
},
deleteProject: async (name: string) => {
  await designApi.deleteProject(name);
  setSelectedProject(null);
  await loadProjects();
},
renameDesign: async (oldFileName: string, newName: string) => {
  if (!selectedProject) {
    return null;
  }
  const design = await designApi.renameDesign(selectedProject, oldFileName, newName);
  await loadDesigns(selectedProject);
  return design;
},
duplicateDesign: async (sourceFileName: string, targetName: string) => {
  if (!selectedProject) {
    return null;
  }
  const design = await designApi.duplicateDesign(selectedProject, sourceFileName, targetName);
  await loadDesigns(selectedProject);
  return design;
},
deleteDesign: async (fileName: string) => {
  if (!selectedProject) {
    return;
  }
  await designApi.deleteDesign(selectedProject, fileName);
  await loadDesigns(selectedProject);
},
```

- [ ] **Step 4: Add UI controls for management actions**

Update `ProjectSidebar` props:

```ts
onRenameProject: (project: string) => void;
onDuplicateProject: (project: string) => void;
onDeleteProject: (project: string) => void;
```

For each project row, add compact buttons using `Pencil`, `Copy`, and `Trash2` icons from `lucide-react`. Each button must have an `aria-label` and `title` such as `Rename App`.

Update `DesignList` props:

```ts
onRenameDesign: (design: DesignSummary) => void;
onDuplicateDesign: (design: DesignSummary) => void;
onDeleteDesign: (design: DesignSummary) => void;
```

For each design row, add compact buttons using `Pencil`, `Copy`, and `Trash2` icons from `lucide-react`. Stop event propagation in action button click handlers so clicking an action does not open the design:

```tsx
onClick={(event) => {
  event.stopPropagation();
  onDeleteDesign(design);
}}
```

Update `LibraryView` to maintain one action state:

```ts
type PendingAction =
  | { type: "rename-project"; project: string }
  | { type: "duplicate-project"; project: string }
  | { type: "delete-project"; project: string }
  | { type: "rename-design"; design: DesignSummary }
  | { type: "duplicate-design"; design: DesignSummary }
  | { type: "delete-design"; design: DesignSummary }
  | null;
```

Render `RenameDialog` for rename/duplicate actions and `ConfirmDialog` for delete actions. Delete confirmation body text must include the project or design name.

- [ ] **Step 5: Verify management actions**

Run: `npm run test:run -- src/hooks src/lib`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit management actions**

```bash
git add src/hooks/useDesignLibrary.ts src/hooks/useDesignLibrary.test.tsx src/components src/styles.css
git commit -m "feat: complete local library management actions"
```

---

### Task 7: Add Smoke Test And Final Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/smoke.spec.ts`
- Modify: `package.json`
- Create: `LICENSES.md`

**Interfaces:**
- Consumes: completed app.
- Produces: `npm run smoke` local browser smoke test.
- Produces: basic dependency license notice document.

- [ ] **Step 1: Add smoke test config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:1420",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

Create `tests/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("library renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BanguesesDraw" })).toBeVisible();
});
```

- [ ] **Step 2: Add dependency license notice**

Create `LICENSES.md`:

```md
# Dependency License Notices

BanguesesDraw embeds and depends on open-source packages, including the open-source Excalidraw editor package `@excalidraw/excalidraw`.

Before distributing the app, generate and review dependency license notices from the installed package tree and include required copyright and license text for runtime dependencies.

The MVP is a local development app and keeps this file as the distribution checklist for license compliance.
```

- [ ] **Step 3: Run complete verification**

Run: `npm run test:run`

Expected: PASS.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npm run smoke`

Expected: PASS and confirms the library heading renders.

- [ ] **Step 4: Run app for manual check**

Run: `npm run tauri:dev`

Expected: The desktop app opens. Create a project, create a design, draw one rectangle, wait for `saved`, go back to the library, reopen the design, and confirm the rectangle remains.

- [ ] **Step 5: Commit verification assets**

```bash
git add playwright.config.ts tests/smoke.spec.ts package.json package-lock.json LICENSES.md
git commit -m "test: add BanguesesDraw smoke verification"
```

---

## Final Acceptance Checklist

- [ ] `/Users/rbangueses/Documents/BanguesesDraw/Designs` is created automatically.
- [ ] Projects are visible folders.
- [ ] Designs are visible `.excalidraw` JSON files.
- [ ] Project create, rename, duplicate, delete works.
- [ ] Design create, rename, duplicate, delete works.
- [ ] Design-name filtering works inside the selected project.
- [ ] Opening a design renders Excalidraw.
- [ ] Autosave writes scene changes to disk through the backend.
- [ ] Failed reads and saves show user-visible errors.
- [ ] Delete actions require confirmation.
- [ ] `npm run test:run` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] `npm run build` passes.
- [ ] `npm run smoke` passes.
