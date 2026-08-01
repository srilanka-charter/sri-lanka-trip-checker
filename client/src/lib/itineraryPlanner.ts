/**
 * Itinerary Planner Logic
 * Generates optimal day-by-day itinerary for Sri Lanka trips
 * Based on distance/time data and business rules (full spec)
 */

import { getShortestPath, normalizeLocation, formatTime } from "./distanceData";

export interface TripInput {
  startDate: Date | null;
  endDate: Date | null;
  startPoint: string;
  endPoint: string;
  mustVisit: string[];
  niceToVisit: string[];
  _isAlternative?: boolean; // internal flag to prevent infinite recursion
}

export interface DayItinerary {
  date: string;
  dateObj: Date | null;
  segments: string;
  distance: number;
  time: number;
  notes: string[];
  isPickup?: boolean;
  isReturn?: boolean;
  isStay?: boolean;
}

export interface ItineraryResult {
  days: DayItinerary[];
  totalDistance: number;
  totalDays: number;
  planType: "近郊プレミアム" | "広域グランド" | "超広域";
  judgment: "OK" | "A" | "B";
  judgmentMessage: string;
  alternatives?: AlternativePlan[];
  specialNotes: string[];
  extraDaysAdded: number;
  markdownTable: string;
  route: string[]; // canonical location names for map rendering
}

export interface AlternativePlan {
  title: string;
  adjustment: string;
  merit: string;
  caution: string;
  days: DayItinerary[];
  totalDistance: number;
  planType: string;
  markdownTable: string;
}

// Base (拠点) = コロンボ
const BASE = "コロンボ";

// Locations that trigger 初日特例
const LONG_DISTANCE_STARTS = ["エッラ", "ヌワラエリヤ", "ヤーラ国立公園", "アルガムベイ"];

// Plan limits
const KINKO_PREMIUM_LIMITS: Record<number, number> = {
  2: 450, 3: 540, 4: 648, 5: 720, 6: 810, 7: 945,
  8: 1080, 9: 1215, 10: 1350, 11: 1485, 12: 1620,
  13: 1755, 14: 1890, 15: 2025,
};
const KOIKI_GRAND_LIMITS: Record<number, number> = {
  1: 270, 2: 540, 3: 594, 4: 792, 5: 900, 6: 972, 7: 1008,
  8: 1080, 9: 1215, 10: 1350, 11: 1485, 12: 1620,
  13: 1755, 14: 1890, 15: 2025,
};

function formatDate(date: Date | null, dayIndex: number): string {
  if (!date) return `${dayIndex + 1}日目`;
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

function addDays(date: Date | null, days: number): Date | null {
  if (!date) return null;
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Build optimal route visiting all required and optional stops
 * Uses nearest-neighbor heuristic with distance optimization
 */
function buildRoute(
  start: string,
  end: string,
  mustVisit: string[],
  niceToVisit: string[]
): string[] {
  const normStart = normalizeLocation(start);
  const normEnd = normalizeLocation(end);
  const normMust = mustVisit
    .map(normalizeLocation)
    .filter(v => v !== normStart && v !== normEnd);
  const normNice = niceToVisit
    .map(normalizeLocation)
    .filter(v => v !== normStart && v !== normEnd && !normMust.includes(v));

  const route: string[] = [normStart];
  const remaining = [...normMust];

  // Greedy nearest-neighbor for must-visit
  let current = normStart;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const path = getShortestPath(current, remaining[i]);
      if (path && path.distance < bestDist) {
        bestDist = path.distance;
        bestIdx = i;
      }
    }
    current = remaining[bestIdx];
    route.push(current);
    remaining.splice(bestIdx, 1);
  }

  // Try to insert nice-to-visit stops
  for (const nice of normNice) {
    if (route.includes(nice)) continue;
    let bestPos = route.length;
    let bestExtra = Infinity;
    for (let i = 1; i <= route.length; i++) {
      const prev = route[i - 1];
      const next = i < route.length ? route[i] : normEnd;
      const prevToNice = getShortestPath(prev, nice);
      const niceToNext = getShortestPath(nice, next);
      const prevToNext = getShortestPath(prev, next);
      if (!prevToNice || !niceToNext) continue;
      const extra = prevToNice.distance + niceToNext.distance - (prevToNext?.distance ?? 0);
      if (extra < bestExtra) {
        bestExtra = extra;
        bestPos = i;
      }
    }
    route.splice(bestPos, 0, nice);
  }

  // Always add end point (even if same as start, for return journey)
  route.push(normEnd);
  return route;
}

/**
 * Compute leg distances for a route
 */
function computeLegs(route: string[]): Array<{ from: string; to: string; distance: number; time: number }> {
  const legs: Array<{ from: string; to: string; distance: number; time: number }> = [];
  for (let i = 0; i < route.length - 1; i++) {
    const path = getShortestPath(route[i], route[i + 1]);
    legs.push({
      from: route[i],
      to: route[i + 1],
      distance: path?.distance ?? 50,
      time: path?.time ?? 1.5,
    });
  }
  return legs;
}

/**
 * Distribute route legs across days
 * Returns per-day data including pickup/return
 */
function buildDayItineraries(
  route: string[],
  numDays: number,
  startDate: Date | null,
  isLongDistanceStart: boolean,
  pickupPath: { distance: number; time: number } | null,
  returnPath: { distance: number; time: number } | null,
  normStart: string,
  normEnd: string,
  extraDaysOffset: number
): DayItinerary[] {
  const days: DayItinerary[] = [];
  const legs = computeLegs(route);

  // Pre-day: pickup (if long distance start → 初日特例)
  if (isLongDistanceStart && pickupPath && normStart !== BASE) {
    days.push({
      date: startDate ? formatDate(addDays(startDate, -1), -1) : "前日",
      dateObj: addDays(startDate, -1),
      segments: `前日移動：拠点（${BASE}）→ ${normStart}`,
      distance: pickupPath.distance,
      time: pickupPath.time,
      notes: ["迎車"],
      isPickup: true,
    });
  }

  if (legs.length === 0) {
    // All stay days
    for (let i = 0; i < numDays; i++) {
      // First day: add pickup if needed (not long distance start)
      let segStr = `${normStart} 周辺観光`;
      let dist = 40;
      let time = 1.5;
      const notes: string[] = [];
      if (i === 0 && !isLongDistanceStart && pickupPath && normStart !== BASE) {
        segStr = `迎車（${BASE} → ${normStart}）、${normStart} 周辺観光`;
        dist += pickupPath.distance;
        time += pickupPath.time;
        notes.push("迎車含む");
      }
      if (i === numDays - 1 && returnPath && normEnd !== BASE) {
        segStr = `${segStr}、回送（${normEnd} → ${BASE}）`;
        dist += returnPath.distance;
        time += returnPath.time;
        notes.push("回送含む");
      }
      days.push({
        date: startDate ? formatDate(addDays(startDate, i), i) : `${i + 1}日目`,
        dateObj: addDays(startDate, i),
        segments: segStr,
        distance: dist,
        time,
        notes,
        isStay: true,
      });
    }
    return days;
  }

  // Assign legs to days
  // Strategy: if numDays >= legs.length, assign 1 leg per day (preferred)
  // Otherwise, pack greedily (max ~300km/day)
  const dayLegs: Array<typeof legs> = [];

  if (numDays >= legs.length) {
    // 1 leg per day, distribute remaining stay days proportionally
    const stayDaysTotal = numDays - legs.length;
    const stayPerLeg = Math.floor(stayDaysTotal / legs.length);
    let extraStay = stayDaysTotal % legs.length;

    for (let li = 0; li < legs.length; li++) {
      // Travel day for this leg
      dayLegs.push([legs[li]]);
      // Stay days at destination
      const stayCount = stayPerLeg + (extraStay > 0 ? 1 : 0);
      if (extraStay > 0) extraStay--;
      const dest = legs[li].to;
      for (let s = 0; s < stayCount; s++) {
        dayLegs.push([{ from: dest, to: dest, distance: 40, time: 1.5 }]);
      }
    }
  } else {
    // Pack greedily (max ~300km/day)
    let currentDay: typeof legs = [];
    let currentDist = 0;

    for (const leg of legs) {
      if (currentDist + leg.distance > 300 && currentDay.length > 0) {
        dayLegs.push(currentDay);
        currentDay = [];
        currentDist = 0;
      }
      currentDay.push(leg);
      currentDist += leg.distance;
    }
    if (currentDay.length > 0) dayLegs.push(currentDay);

    // Fill remaining days with stay days at last location
    const lastLoc = route[route.length - 1];
    while (dayLegs.length < numDays) {
      dayLegs.push([{ from: lastLoc, to: lastLoc, distance: 40, time: 1.5 }]);
    }
  }

  // Build day entries
  for (let i = 0; i < Math.min(dayLegs.length, numDays); i++) {
    const dl = dayLegs[i];
    const isFirst = i === 0;
    const isLast = i === numDays - 1;
    const isStay = dl.length === 1 && dl[0].from === dl[0].to;

    let totalDist = isStay ? 40 : dl.reduce((s, l) => s + l.distance, 0);
    let totalTime = isStay ? 1.5 : dl.reduce((s, l) => s + l.time, 0);

    // Build segment string
    const locs = [dl[0].from, ...dl.map(l => l.to)];
    const uniqueLocs = locs.filter((v, idx, a) => idx === 0 || v !== a[idx - 1]);
    let segStr = isStay ? `${dl[0].from} 周辺観光` : uniqueLocs.join(" → ");

    const notes: string[] = [];

    // Add pickup on first day (if not already handled by special rule)
    if (isFirst && !isLongDistanceStart && pickupPath && normStart !== BASE) {
      segStr = `迎車（${BASE} → ${normStart}）、${segStr}`;
      totalDist += pickupPath.distance;
      totalTime += pickupPath.time;
      notes.push("迎車含む");
    }

    // Add return on last day
    if (isLast && returnPath && normEnd !== BASE) {
      segStr = `${segStr}、回送（${normEnd} → ${BASE}）`;
      totalDist += returnPath.distance;
      totalTime += returnPath.time;
      notes.push("回送含む");
    }

    days.push({
      date: startDate ? formatDate(addDays(startDate, i), i) : `${i + 1 + extraDaysOffset}日目`,
      dateObj: addDays(startDate, i),
      segments: segStr,
      distance: totalDist,
      time: totalTime,
      notes,
      isStay,
    });
  }

  return days;
}

/**
 * Determine plan type based on total distance and days
 */
function determinePlanType(
  totalDistance: number,
  days: number
): { planType: "近郊プレミアム" | "広域グランド" | "超広域"; judgment: "OK" | "A" | "B" } {
  const kinkoLimit = KINKO_PREMIUM_LIMITS[days] ?? Infinity;
  const koikiLimit = KOIKI_GRAND_LIMITS[days] ?? Infinity;

  if (totalDistance <= kinkoLimit) {
    return { planType: "近郊プレミアム", judgment: "OK" };
  } else if (totalDistance <= koikiLimit) {
    return { planType: "広域グランド", judgment: "OK" };
  } else {
    return { planType: "超広域", judgment: "B" };
  }
}

/**
 * Check A judgment (single day overload)
 * A判定: 1日の走行距離300km超かつ走行時間6時間超、または走行時間のみ6時間超
 * ただし距離300km超でも走行時間6時間以内なら原則可（A判定しない）
 */
function checkAJudgment(days: DayItinerary[]): boolean {
  return days.some(d => {
    if (d.isStay || d.isPickup || d.isReturn) return false;
    // 距離300km超 AND 時間6時間超 → A判定
    if (d.distance > 300 && d.time > 6) return true;
    // 距離300km以内でも時間6時間超 → A判定（分散提案を優先）
    if (d.distance <= 300 && d.time > 6) return true;
    return false;
  });
}

/**
 * Calculate total distance including all days
 */
function calcTotalDistance(days: DayItinerary[]): number {
  let total = 0;
  for (const d of days) {
    total += d.distance;
  }
  return total;
}

/**
 * Generate markdown table for itinerary
 */
function generateMarkdownTable(days: DayItinerary[], totalDistance: number): string {
  let table = "| 日付 | 主な区間（迎車・回送含む） | 距離 | 走行時間の目安 |\n";
  table += "| --- | --- | ---: | --- |\n";
  for (const day of days) {
    const distStr = day.isStay ? "約30〜50km" : `${day.distance}km`;
    const timeStr = day.isStay ? "約1〜2時間" : formatTime(day.time);
    table += `| ${day.date} | ${day.segments} | ${distStr} | ${timeStr} |\n`;
  }
  table += `\n総走行距離の目安：${totalDistance}km前後\n\n`;
  table += "※実際の距離・時間は、当日の交通状況や立ち寄り内容により前後します。";
  return table;
}

/**
 * Generate alternative plan
 */
function generateAlternative(
  input: TripInput,
  altTitle: string,
  removedNice: string[],
  adjustmentNote: string,
  merit: string,
  caution: string
): AlternativePlan {
  const altInput: TripInput = {
    ...input,
    niceToVisit: input.niceToVisit.filter(v => !removedNice.includes(normalizeLocation(v))),
    _isAlternative: true,
  };
  const result = planItinerary(altInput);
  return {
    title: altTitle,
    adjustment: adjustmentNote,
    merit,
    caution,
    days: result.days,
    totalDistance: result.totalDistance,
    planType: result.planType,
    markdownTable: result.markdownTable,
  };
}

/**
 * Main itinerary planning function
 */
export function planItinerary(input: TripInput): ItineraryResult {
  const { startDate, endDate, startPoint, endPoint, mustVisit, niceToVisit } = input;
  const isAlternative = input._isAlternative === true;

  const normStart = normalizeLocation(startPoint);
  const normEnd = normalizeLocation(endPoint);

  // Calculate number of days
  let numDays = 1;
  if (startDate && endDate) {
    const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    numDays = Math.max(1, diff + 1);
  }

  const specialNotes: string[] = [];
  let extraDays = 0;

  // === Special Rules (processed before A/B) ===

  // 初日特例: Start at long-distance location
  const isLongDistanceStart = LONG_DISTANCE_STARTS.includes(normStart);
  if (isLongDistanceStart) {
    extraDays += 1;
    specialNotes.push("初日の合流を安全に行うため、前日移動を含む前提で概算しております。");
  }

  // Build route
  const route = buildRoute(normStart, normEnd, mustVisit, niceToVisit);

  // Calculate pickup/return distances
  // 開始場所がコロンボ/ネゴンボ/空港以外なら迎車あり
  const pickupPath = normStart !== BASE ? getShortestPath(BASE, normStart) : null;
  // 解散地点が拠点以外なら回送あり（拠点→解散地点）
  const returnPath = normEnd !== BASE ? getShortestPath(normEnd, BASE) : null;

  // 最後の滞在地から終着地への移動（終着地が拠点でも、最後の滞在地が終着地と異なる場合）
  // route の最後の要素が終着地と異なる場合は、その区間も含める
  // これは buildDayItineraries 内で route の最後 → normEnd として処理される

  // Build day itineraries
  const days = buildDayItineraries(
    route,
    numDays,
    startDate,
    isLongDistanceStart,
    pickupPath,
    returnPath,
    normStart,
    normEnd,
    isLongDistanceStart ? 1 : 0
  );

  // 最終日特例: 最終日の旅程＋回送が300km超の場合のみ発火
  if (returnPath && normEnd !== BASE) {
    const lastDay = days[days.length - 1];
    if (lastDay && lastDay.distance > 300) {
      extraDays += 1;
      specialNotes.push("回送が長距離となるため、1日分追加した前提で概算しております。");
    }
  }

  const totalDays = numDays + extraDays;

  // Calculate total distance
  const totalDistance = calcTotalDistance(days);

  // Determine plan type
  const { planType, judgment: baseJudgment } = determinePlanType(totalDistance, totalDays);

  // Check A judgment
  const hasAJudgment = checkAJudgment(days);
  let judgment: "OK" | "A" | "B" = baseJudgment;
  if (hasAJudgment && judgment !== "B") judgment = "A";

  // Generate judgment message
  let judgmentMessage = "";
  const needsAlternatives = judgment === "A" || judgment === "B";

  if (judgment === "A") {
    judgmentMessage = "ご希望の行程をベースにご案内自体は可能です。ただし、一部の日で移動時間が長くなりやすく、観光時間やお身体への負担が出やすい内容です。そのため、より無理なく回りやすい代替案を2案あわせてご提案いたします。";
  } else if (judgment === "B") {
    judgmentMessage = "ご希望の行程は移動範囲がかなり広く、このままの内容ではご案内が難しい状況です。安全面と観光時間を確保しやすくするため、行程を調整した代替案を2案ご提案いたします。";
  } else if (totalDistance > totalDays * 120) {
    judgmentMessage = "ご希望の行程をベースにご案内可能です。一方で、移動の流れを少し整えると、観光時間をより確保しやすくなります。参考として、より無理の少ない代替案もあわせてご提案いたします。";
  }

  const markdownTable = generateMarkdownTable(days, totalDistance);

  // Generate alternatives if needed
  let alternatives: AlternativePlan[] | undefined;
  if (needsAlternatives && !isAlternative) {
    if (niceToVisit.length > 0) {
      const normNice = niceToVisit.map(normalizeLocation);
      // Alt 1: Remove last nice-to-visit stop
      const alt1 = generateAlternative(
        input,
        "代替案1",
        [normNice[normNice.length - 1]],
        `「${normNice[normNice.length - 1]}」を今回は省略し、移動を分散した行程`,
        "1日あたりの移動負担が軽減され、各地での観光時間を確保しやすくなります。",
        "ご希望のスポットを1か所省略する必要があります。"
      );
      // Alt 2: Remove all nice-to-visit stops
      const alt2 = generateAlternative(
        input,
        "代替案2",
        normNice,
        "「できたら行きたい場所」を全て省略し、必須スポットのみに絞った行程",
        "移動距離が大幅に短縮され、各スポットでゆっくり過ごせます。",
        "希望スポットへの立ち寄りはできなくなります。"
      );
      alternatives = [alt1, alt2];
    } else {
      // No nice-to-visit to remove, suggest adding days
      const extInput1: TripInput = {
        ...input,
        endDate: input.endDate ? addDays(input.endDate, 2) : null,
        _isAlternative: true,
      };
      const extInput2: TripInput = {
        ...input,
        endDate: input.endDate ? addDays(input.endDate, 1) : null,
        _isAlternative: true,
      };
      const alt1Result = planItinerary(extInput1);
      const alt2Result = planItinerary(extInput2);
      alternatives = [
        {
          title: "代替案1",
          adjustment: "旅行日数を2日延長した行程",
          merit: "1日あたりの移動距離が分散され、観光時間を確保しやすくなります。",
          caution: "旅行日数の延長が必要です。",
          days: alt1Result.days,
          totalDistance: alt1Result.totalDistance,
          planType: alt1Result.planType,
          markdownTable: alt1Result.markdownTable,
        },
        {
          title: "代替案2",
          adjustment: "旅行日数を1日延長した行程",
          merit: "長距離移動を分割でき、移動負担を軽減できます。",
          caution: "旅行日数の延長が必要です。",
          days: alt2Result.days,
          totalDistance: alt2Result.totalDistance,
          planType: alt2Result.planType,
          markdownTable: alt2Result.markdownTable,
        },
      ];
    }
  }

  return {
    days,
    totalDistance,
    totalDays,
    planType,
    judgment,
    judgmentMessage,
    alternatives,
    specialNotes,
    extraDaysAdded: extraDays,
    markdownTable,
    route,
  };
}

/**
 * Format itinerary as full markdown output
 */
export function formatItineraryMarkdown(result: ItineraryResult, input: TripInput): string {
  const { days, totalDistance, planType, judgment, judgmentMessage, specialNotes, markdownTable, alternatives } = result;

  let md = "";

  // Special notes
  if (specialNotes.length > 0) {
    md += specialNotes.map(n => `> ⚠️ ${n}`).join("\n") + "\n\n";
  }

  // Judgment message
  if (judgmentMessage) {
    md += `**【ご案内】** ${judgmentMessage}\n\n`;
  }

  // Route overview
  const normStart = normalizeLocation(input.startPoint);
  const normEnd = normalizeLocation(input.endPoint);
  const mustStr = input.mustVisit.map(normalizeLocation).join(" → ");
  md += `## 旅程概要\n\n`;
  md += `- **出発地：** ${normStart}\n`;
  md += `- **終着地：** ${normEnd}\n`;
  if (mustStr) md += `- **必須スポット：** ${mustStr}\n`;
  if (input.niceToVisit.length > 0) md += `- **希望スポット：** ${input.niceToVisit.map(normalizeLocation).join("、")}\n`;
  md += `- **プランタイプ：** ${planType}\n\n`;

  // Distance table (main plan)
  md += "## 距離・時間表\n\n";
  md += markdownTable;
  md += "\n\n";

  // Day-by-day details
  md += "## 1日ごとの旅程\n\n";
  for (const day of days) {
    md += `### ${day.date}　${day.segments}\n\n`;
    const distStr = day.isStay ? "約30〜50km" : `${day.distance}km`;
    const timeStr = day.isStay ? "約1〜2時間" : formatTime(day.time);
    md += `走行距離：${distStr}　走行時間：${timeStr}\n\n`;
  }

  // Alternatives
  if (alternatives && alternatives.length > 0) {
    md += "---\n\n";
    for (const alt of alternatives) {
      md += `## 【${alt.title}】\n\n`;
      md += `**調整内容：** ${alt.adjustment}\n\n`;
      md += `**メリット：** ${alt.merit}\n\n`;
      md += `**注意点：** ${alt.caution}\n\n`;
      md += `**プランタイプ：** ${alt.planType}\n\n`;
      md += alt.markdownTable;
      md += "\n\n";
    }
  }

  return md;
}
