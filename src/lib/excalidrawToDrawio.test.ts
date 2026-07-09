import { describe, expect, it } from "vitest";
import { exportSceneToDrawioXml } from "./excalidrawToDrawio";
import type { ExcalidrawScene } from "../types/excalidraw";

function parseXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error(parserError.textContent ?? "XML parse error");
  }

  return document;
}

describe("exportSceneToDrawioXml", () => {
  it("exports basic Excalidraw shapes and text as draw.io mxCells", () => {
    const scene: ExcalidrawScene = {
      type: "excalidraw",
      elements: [
        {
          id: "rect-1",
          type: "rectangle",
          x: 10,
          y: 20,
          width: 180,
          height: 80,
          strokeColor: "#1e1e1e",
          backgroundColor: "#fffdf3",
          roundness: { type: 3 },
        },
        {
          id: "diamond-1",
          type: "diamond",
          x: 260,
          y: 20,
          width: 120,
          height: 120,
          strokeColor: "#1e1e1e",
          backgroundColor: "transparent",
        },
        {
          id: "text-1",
          type: "text",
          x: 24,
          y: 48,
          width: 140,
          height: 24,
          text: "Hello & <world>",
          strokeColor: "#1e1e1e",
        },
      ],
    };

    const document = parseXml(exportSceneToDrawioXml(scene));
    const cells = Array.from(document.querySelectorAll("mxCell"));

    expect(document.querySelector("mxfile")).toBeTruthy();
    expect(cells.some((cell) => cell.getAttribute("id") === "shape-rect-1")).toBe(true);
    expect(cells.some((cell) => cell.getAttribute("id") === "shape-diamond-1")).toBe(true);
    expect(cells.some((cell) => cell.getAttribute("value") === "Hello & <world>")).toBe(true);
    expect(
      document.querySelector('mxCell[id="shape-diamond-1"]')?.getAttribute("style"),
    ).toContain("shape=rhombus");
  });

  it("exports arrows using source and target points", () => {
    const scene: ExcalidrawScene = {
      type: "excalidraw",
      elements: [
        {
          id: "arrow-1",
          type: "arrow",
          x: 100,
          y: 120,
          width: 240,
          height: 40,
          points: [
            [0, 0],
            [240, 40],
          ],
          strokeColor: "#1e1e1e",
        },
      ],
    };

    const document = parseXml(exportSceneToDrawioXml(scene));
    const arrow = document.querySelector('mxCell[id="edge-arrow-1"]');
    const sourcePoint = arrow?.querySelector('mxPoint[as="sourcePoint"]');
    const targetPoint = arrow?.querySelector('mxPoint[as="targetPoint"]');

    expect(arrow?.getAttribute("edge")).toBe("1");
    expect(sourcePoint?.getAttribute("x")).toBe("100");
    expect(sourcePoint?.getAttribute("y")).toBe("120");
    expect(targetPoint?.getAttribute("x")).toBe("340");
    expect(targetPoint?.getAttribute("y")).toBe("160");
  });
});
