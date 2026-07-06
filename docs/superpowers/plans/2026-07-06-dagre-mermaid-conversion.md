# Dagre Mermaid Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mermaid-to-Excalidraw conversion use a real graph layout so converted diagrams are readable instead of squeezed into a naive row.

**Architecture:** Keep the existing Mermaid parser and Excalidraw element generation. Replace the in-house level layout with dagre positions, then normalize arrow bounds and edge labels for Excalidraw.

**Tech Stack:** React, TypeScript, Vitest, Excalidraw scene JSON, existing `dagre-d3-es` dependency from Mermaid.

## Global Constraints

- Do not add a new dependency unless the existing Mermaid dependency cannot expose dagre layout.
- Keep conversion fully local and offline.
- Preserve support for `flowchart LR` and `flowchart TD`.
- Preserve cyclic graph crash protection.

---

### Task 1: Dagre Layout For Mermaid Conversion

**Files:**
- Modify: `src/lib/mermaidToExcalidraw.ts`
- Modify: `src/lib/mermaidToExcalidraw.test.ts`

**Interfaces:**
- Consumes: `parseMermaidFlowchart(source: string)`
- Produces: `mermaidToExcalidrawScene(source: string): ExcalidrawScene`

- [ ] **Step 1: Write failing layout tests**

Add tests that assert converted `LR` diagrams do not overlap edge labels with nodes and that `TD` cyclic diagrams still produce finite, non-negative arrow geometry.

- [ ] **Step 2: Run focused test**

Run: `npm run test:run -- src/lib/mermaidToExcalidraw.test.ts`

Expected before implementation: layout quality assertion fails.

- [ ] **Step 3: Replace custom level layout with dagre**

Import `Graph` from `dagre-d3-es/src/graphlib/index.js` and `layout` from `dagre-d3-es/src/dagre/index.js`. Create a graph with `rankdir`, `nodesep`, `ranksep`, `marginx`, and `marginy`, set node dimensions, set edges with label dimensions, call `layout(graph)`, and convert center positions to top-left positions.

- [ ] **Step 4: Preserve Excalidraw-safe arrows**

Keep arrow `x/y/width/height` as non-negative bounds and use point coordinates relative to those bounds.

- [ ] **Step 5: Verify**

Run:
- `npm run test:run -- src/lib/mermaidToExcalidraw.test.ts`
- `npm run test:run`
- `npm run build`

Expected: all tests and build pass.
