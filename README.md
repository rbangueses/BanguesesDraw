# BanguesesDraw

BanguesesDraw is a local-first desktop design manager powered by Excalidraw. It gives you a simple library for organizing projects and designs, while keeping every drawing file on your own machine.

## What It Does

- Create, rename, duplicate, and delete projects.
- Create, rename, duplicate, and delete designs inside each project.
- Draw with the full Excalidraw canvas experience.
- Autosave designs locally as `.excalidraw` files.
- Create and edit Mermaid flowcharts as local `.mmd` files.
- Generate AI diagrams as either Excalidraw scenes or Mermaid flowcharts.
- Modify existing Excalidraw and Mermaid diagrams with AI prompts.
- Convert supported Mermaid flowcharts into editable Excalidraw designs.
- Insert ready-made Twilio architecture blocks into Excalidraw diagrams.
- Import existing Excalidraw or Mermaid files into a project.
- Export individual designs for backup, sharing, or moving between machines.
- Toggle Mermaid support on or off from settings.
- Cancel dialogs with Escape.
- Build native installers for macOS and Windows.

## Screenshots

### Project Library

![BanguesesDraw project library](docs/screenshots/main%20ui.png)

### Drawing Editor

![BanguesesDraw drawing editor](docs/screenshots/sample%20drawing.png)

## Local Storage

Design files are stored locally in your user Documents folder:

- macOS: `~/Documents/BanguesesDraw/Designs`
- Windows: `C:\Users\<you>\Documents\BanguesesDraw\Designs`

Each Excalidraw design is saved as a separate `.excalidraw` file. Mermaid flowcharts are saved as separate `.mmd` files. No cloud sync, account, or remote storage is required.

## Excalidraw Designs

Excalidraw designs are the default design type. They use the embedded Excalidraw editor, so you get the familiar sketch-style drawing workflow, keyboard shortcuts, library tools, and editable canvas elements.

BanguesesDraw adds a local design-manager layer around Excalidraw:

- project folders in the sidebar
- design search and filtering
- rename and duplicate actions
- local autosave
- import and export
- AI modification
- Twilio component templates

## Twilio Component Templates

The Excalidraw editor includes a Twilio components picker for quickly adding architecture blocks. Components are grouped by product area:

- Channels: Programmable Messaging, Programmable Voice, SMS, WhatsApp, Email API, Recording
- Trust & Identity: Verify, Lookup
- Conversations Suite: Twilio Orchestrator, Conversation Relay, Twilio Agent Connect, Conversation Intelligence, Memory
- Contact Center: Flex, Studio, TaskRouter
- Compute & Integrations: Functions, Assets, 3rd Party API
- Segment Stack: Segment CDP, Connections, Profiles, Engage

Twilio-owned blocks use Twilio red. External dependencies such as `3rd Party API` use a separate yellow style.

## Mermaid Flowcharts

BanguesesDraw can store Mermaid flowcharts locally as `.mmd` files beside Excalidraw designs. Mermaid mode is useful for structured diagrams and lower-cost AI generation.

Mermaid designs have a split editor:

- source editor on the left
- live preview on the right
- AI modify support
- export/import as `.mmd`
- conversion into Excalidraw when the diagram uses the supported simple flowchart subset

Supported Mermaid-to-Excalidraw conversion currently focuses on simple `flowchart LR` and `flowchart TD` diagrams with basic nodes and arrows. Chained arrows and basic edge labels are supported, but complex Mermaid features such as subgraphs, styling directives, class definitions, sequence diagrams, and advanced shapes are intentionally outside the current conversion scope.

Mermaid can be disabled from AI settings if you want a simpler Excalidraw-only experience.

## AI Diagrams

AI features use your own OpenAI API key. The key is stored locally in the app settings on your machine.

From the library, you can generate a new diagram from a prompt and choose:

- Excalidraw output for fully editable sketch-style diagrams
- Mermaid output for cheaper, more compact structured flowcharts
- model and quality level

From an existing design, you can also ask AI to modify the current diagram. Excalidraw modification updates the editable scene. Mermaid modification updates the Mermaid source.

AI requests are sent to OpenAI only when you explicitly use an AI action. Regular drawing, local storage, import, export, and project management do not require a network connection.

## Import And Export

BanguesesDraw supports single-design import and export:

- import `.excalidraw` files into the selected project
- import `.mmd` Mermaid files into the selected project
- export an individual design for backup or sharing

If an imported design name already exists, BanguesesDraw creates a conflict-safe copy name instead of overwriting the existing file.

## Install

### macOS

Download the `BanguesesDraw-macos` artifact from GitHub Actions. Open the `.dmg` file inside the artifact and drag BanguesesDraw into Applications.

If macOS warns that Apple could not verify the app is free of malware, right-click the app in Applications and choose **Open**. This can happen because the app is ad-hoc signed but not notarized with an Apple Developer ID yet.

### Windows

Download the Windows build artifact from GitHub Actions and open the `nsis` folder. Run the `.exe` installer.

The artifact also includes an `msi` folder. The MSI installer is useful for Windows environments that prefer Windows Installer packages.

If Windows SmartScreen warns about the installer, choose **More info** and **Run anyway**. This can happen because the app is not code-signed yet.

## Build From Source

Requirements:

- Node.js 22 or newer
- npm
- Rust stable
- Tauri system dependencies for your OS

Clone the repository:

```bash
git clone https://github.com/rbangueses/BanguesesDraw.git
cd BanguesesDraw
```

Install dependencies:

```bash
npm ci
```

Run the app in development:

```bash
npm run tauri:dev
```

Build a native app bundle:

```bash
npm exec tauri build
```

On macOS, the local build creates a DMG under:

```text
src-tauri/target/release/bundle/dmg/
```

Open that folder:

```bash
open src-tauri/target/release/bundle/dmg
```

Then open the `.dmg`, drag BanguesesDraw into Applications, and launch it from Applications. A local build usually avoids the downloaded-artifact Gatekeeper flow, but if macOS still warns, right-click the app and choose **Open**.

Run tests:

```bash
npm run test:run
cargo test --manifest-path src-tauri/Cargo.toml
```

## Installer Builds With GitHub Actions

This repo includes GitHub Actions workflows for macOS and Windows installers:

```text
.github/workflows/macos-build.yml
.github/workflows/windows-build.yml
```

The workflows run on pushes to `main` and can also be started manually from GitHub:

1. Open the repo on GitHub.
2. Go to **Actions**.
3. Select **macOS Build** or **Windows Build**.
4. Click **Run workflow**.
5. Download `BanguesesDraw-macos` or `BanguesesDraw-windows` when the run finishes.

## Tech Stack

- Tauri 2
- React
- TypeScript
- Vite
- Excalidraw
- Mermaid
- Rust backend commands for local file storage

## License

Private/internal project unless a license is added.
