import { describe, expect, it } from "vitest";
import { createLankamePayload, parseEmbedConfig } from "./embedMessaging";

describe("iframe messaging helpers", () => {
  it("reads parent origin and embed mode from the URL query", () => {
    expect(parseEmbedConfig("?parent=https%3A%2F%2Fsrilankataxicharterservice.com&embed=1")).toEqual({
      PARENT_ORIGIN: "https://srilankataxicharterservice.com",
      IS_EMBED: true,
    });
    expect(parseEmbedConfig("")).toEqual({ PARENT_ORIGIN: "*", IS_EMBED: false });
  });

  it("creates the fixed version 1 itinerary payload", () => {
    const payload = createLankamePayload({
      variant: "alternative",
      startPoint: "ネゴンボ (Negombo)",
      endPoint: "バンダラナイケ国際空港",
      startDate: "2026-08-31",
      endDate: "2026-09-02",
      mustVisit: ["シーギリヤ・ロック"],
      niceToVisit: [],
      route: ["コロンボ", "シーギリヤ", "コロンボ"],
      planName: "広域グランド",
      itineraryText: "| 日付 | 主な区間 |",
    });

    expect(payload).toMatchObject({
      type: "lankame:itinerary",
      version: 1,
      variant: "alternative",
      startDate: "2026-08-31",
    });
  });
});
