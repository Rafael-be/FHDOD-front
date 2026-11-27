import { describe, expect, it } from "vitest";
import * as analyticsInsights from "./AnalyticsInsights";

describe("AnalyticsInsights module resolution", () => {
  it("exposes the React insight components from the .tsx module", () => {
    expect(typeof analyticsInsights.CriticalRanking).toBe("function");
    expect(typeof analyticsInsights.QuestionDistribution).toBe("function");
    expect(typeof analyticsInsights.SatisfactionHeatmap).toBe("function");
    expect(typeof analyticsInsights.ShiftOverview).toBe("function");
  });
});
