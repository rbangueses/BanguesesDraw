import type { ExcalidrawScene } from "../types/excalidraw";

type ExcalidrawElement = Record<string, unknown>;
type Point = [number, number];

const SUPPORTED_SHAPES = new Set(["rectangle", "diamond", "ellipse", "text"]);

function asElement(value: unknown): ExcalidrawElement | null {
  return value && typeof value === "object" ? (value as ExcalidrawElement) : null;
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function elementText(element: ExcalidrawElement) {
  const text = element.text ?? element.originalText;

  return typeof text === "string" ? text : "";
}

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function drawioColor(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value || value === "transparent") {
    return fallback;
  }

  return value;
}

function geometry(element: ExcalidrawElement) {
  return {
    x: finiteNumber(element.x),
    y: finiteNumber(element.y),
    width: Math.max(1, finiteNumber(element.width, 120)),
    height: Math.max(1, finiteNumber(element.height, 60)),
  };
}

function hasRoundness(element: ExcalidrawElement) {
  const roundness = element.roundness;

  return Boolean(roundness && typeof roundness === "object");
}

function shapeStyle(element: ExcalidrawElement) {
  const type = String(element.type);
  const strokeColor = drawioColor(element.strokeColor, "#1e1e1e");
  const fillColor = drawioColor(element.backgroundColor, "none");
  const base = [
    "whiteSpace=wrap",
    "html=1",
    `strokeColor=${strokeColor}`,
    `fillColor=${fillColor}`,
  ];

  if (type === "diamond") {
    base.push("shape=rhombus");
  } else if (type === "ellipse") {
    base.push("ellipse");
  } else {
    base.push(`rounded=${hasRoundness(element) ? 1 : 0}`);
  }

  return `${base.join(";")};`;
}

function textStyle(element: ExcalidrawElement) {
  const strokeColor = drawioColor(element.strokeColor, "#1e1e1e");
  const fontSize = finiteNumber(element.fontSize, 16);

  return [
    "text",
    "html=1",
    "strokeColor=none",
    "fillColor=none",
    `fontColor=${strokeColor}`,
    `fontSize=${fontSize}`,
    "align=center",
    "verticalAlign=middle",
    "whiteSpace=wrap",
    "rounded=0",
  ].join(";") + ";";
}

function vertexCell(id: string, value: string, style: string, element: ExcalidrawElement) {
  const { x, y, width, height } = geometry(element);

  return [
    `      <mxCell id="${xmlEscape(id)}" value="${xmlEscape(value)}" style="${xmlEscape(style)}" vertex="1" parent="1">`,
    `        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />`,
    "      </mxCell>",
  ].join("\n");
}

function absolutePoint(element: ExcalidrawElement, point: Point | undefined) {
  const x = finiteNumber(element.x);
  const y = finiteNumber(element.y);

  return {
    x: x + finiteNumber(point?.[0]),
    y: y + finiteNumber(point?.[1]),
  };
}

function arrowPoints(element: ExcalidrawElement) {
  const rawPoints = Array.isArray(element.points) ? element.points : null;
  const points = rawPoints?.filter(
    (point): point is Point =>
      Array.isArray(point) &&
      typeof point[0] === "number" &&
      typeof point[1] === "number",
  );

  if (points && points.length >= 2) {
    return {
      start: absolutePoint(element, points[0]),
      end: absolutePoint(element, points[points.length - 1]),
    };
  }

  const { x, y, width, height } = geometry(element);

  return {
    start: { x, y },
    end: { x: x + width, y: y + height },
  };
}

function edgeCell(id: string, element: ExcalidrawElement) {
  const { start, end } = arrowPoints(element);
  const strokeColor = drawioColor(element.strokeColor, "#1e1e1e");
  const style = [
    "endArrow=classic",
    "html=1",
    "rounded=0",
    `strokeColor=${strokeColor}`,
  ].join(";") + ";";

  return [
    `      <mxCell id="${xmlEscape(id)}" value="" style="${xmlEscape(style)}" edge="1" parent="1">`,
    "        <mxGeometry relative=\"1\" as=\"geometry\">",
    `          <mxPoint x="${start.x}" y="${start.y}" as="sourcePoint" />`,
    `          <mxPoint x="${end.x}" y="${end.y}" as="targetPoint" />`,
    "        </mxGeometry>",
    "      </mxCell>",
  ].join("\n");
}

function elementCell(element: ExcalidrawElement, index: number) {
  const id = typeof element.id === "string" ? element.id : `element-${index}`;
  const type = String(element.type);

  if (type === "arrow") {
    return edgeCell(`edge-${id}`, element);
  }

  if (!SUPPORTED_SHAPES.has(type)) {
    return null;
  }

  if (type === "text") {
    return vertexCell(`text-${id}`, elementText(element), textStyle(element), element);
  }

  return vertexCell(`shape-${id}`, elementText(element), shapeStyle(element), element);
}

export function exportSceneToDrawioXml(scene: ExcalidrawScene) {
  const cells = scene.elements
    .map(asElement)
    .filter((element): element is ExcalidrawElement => Boolean(element))
    .filter((element) => !element.isDeleted)
    .map(elementCell)
    .filter((cell): cell is string => Boolean(cell));

  return [
    '<mxfile host="DesignBuddy" agent="DesignBuddy" version="1.0">',
    '  <diagram id="designbuddy-page-1" name="Page-1">',
    '    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1000" math="0" shadow="0">',
    "      <root>",
    '        <mxCell id="0" />',
    '        <mxCell id="1" parent="0" />',
    ...cells,
    "      </root>",
    "    </mxGraphModel>",
    "  </diagram>",
    "</mxfile>",
    "",
  ].join("\n");
}
