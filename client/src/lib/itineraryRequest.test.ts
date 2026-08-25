import { describe, expect, it } from "vitest";
import { createItineraryRequestSnapshot } from "./itineraryRequest";

describe("createItineraryRequestSnapshot", () => {
  it("uses only the current form values and keeps submitted spot arrays immutable", () => {
    const form = {
      startPoint: "ネゴンボ (Negombo)",
      endPoint: "バンダラナイケ国際空港",
      startDate: new Date(2026, 7, 31),
      endDate: new Date(2026, 8, 2),
      mustVisit: ["シーギリヤ・ロック", "キャンディ（仏歯寺）"],
      niceToVisit: [],
    };

    const snapshot = createItineraryRequestSnapshot(form);
    form.mustVisit.push("ポロンナルワ遺跡");

    expect(snapshot).toMatchObject({
      startDate: "8/31",
      endDate: "9/2",
      numDays: 3,
      mustVisit: ["シーギリヤ・ロック", "キャンディ（仏歯寺）"],
    });
    expect(snapshot.mustVisit).not.toContain("ポロンナルワ遺跡");
  });
});
