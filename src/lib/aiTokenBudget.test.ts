import { describe, expect, it } from "vitest";
import {
  estimateCompletionRisk,
  getExcalidrawMaxOutputTokens,
  getMermaidMaxOutputTokens,
} from "./aiTokenBudget";

describe("aiTokenBudget", () => {
  it("keeps current standard token budgets by output type and quality", () => {
    expect(getExcalidrawMaxOutputTokens("draft")).toBe(12_000);
    expect(getExcalidrawMaxOutputTokens("balanced")).toBe(28_000);
    expect(getExcalidrawMaxOutputTokens("high")).toBe(40_000);
    expect(getMermaidMaxOutputTokens("balanced")).toBe(8_000);
  });

  it("allows bounded extended and maximum Excalidraw budgets", () => {
    expect(getExcalidrawMaxOutputTokens("balanced", "extended")).toBe(60_000);
    expect(getExcalidrawMaxOutputTokens("balanced", "maximum")).toBe(80_000);
  });

  it("describes larger Excalidraw budgets as a medium completion risk", () => {
    expect(
      estimateCompletionRisk({
        kind: "excalidraw",
        quality: "balanced",
        outputBudget: "extended",
      }),
    ).toBe("Medium");
    expect(
      estimateCompletionRisk({
        kind: "excalidraw",
        quality: "balanced",
        outputBudget: "maximum",
      }),
    ).toBe("Medium");
  });
});
