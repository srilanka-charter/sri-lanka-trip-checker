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

// 修正⑤: 代替案生成ヘルパー（必須スポットを1つ削除）
function generateAlt_removeMust(
  input: TripInput,
  altTitle: string,
  removedMust: string[],
  adjustmentNote: string,
  merit: string,
  caution: string
): AlternativePlan {
  const altInput: TripInput = {
    ...input,
    mustVisit: input.mustVisit.filter(v => !removedMust.includes(normalizeLocation(v))),
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

  // 修正②: コロンボ/ネゴンボ/空港 → シーギリヤ＋キャンディ両方ある場合はシーギリヤを先に
  const isFromBase = normStart === BASE;
  const hasSigiriya = remaining.includes("シーギリヤ");
  const hasKandy = remaining.includes("キャンディ");
  if (isFromBase && hasSigiriya && hasKandy) {
    // Force Sigiriya before Kandy: move Sigiriya to front of remaining
    const sigIdx = remaining.indexOf("シーギリヤ");
    remaining.splice(sigIdx, 1);
    remaining.unshift("シーギリヤ");
  }

  // Greedy nearest-neighbor for must-visit (respecting forced order)
  let current = normStart;
  while (remaining.length > 0) {
    // Check if we have a forced first stop (シーギリヤ when coming from base with Kandy)
    let nextIdx = 0;
    if (current === normStart && isFromBase && hasSigiriya && hasKandy && remaining[0] === "シーギリヤ") {
      nextIdx = 0; // forced
    } else {
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const path = getShortestPath(current, remaining[i]);
        if (path && path.distance < bestDist) {
          bestDist = path.distance;
          nextIdx = i;
        }
      }
    }
    current = remaining[nextIdx];
    route.push(current);
    remaining.splice(nextIdx, 1);
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
    judgmentMessage = ""; // B判定文は formatItineraryMarkdown 内で特別処理
  } else if (totalDistance > totalDays * 120) {
    judgmentMessage = "ご希望の行程をベースにご案内可能です。一方で、移動の流れを少し整えると、観光時間をより確保しやすくなります。参考として、より無理の少ない代替案もあわせてご提案いたします。";
  }

  const markdownTable = generateMarkdownTable(days, totalDistance);

  // Generate alternatives if needed
  let alternatives: AlternativePlan[] | undefined;
  if (needsAlternatives && !isAlternative) {
    // 修正⑤: 代替案ロジック
    // 代替案1: 日程そのまま、必須スポットを1つ削る（最後の必須スポットを削除）
    // 代替案2: 1日延長して、できる限り必須スポットを巡る（難しければ必須スポットを削る）
    const normMust = mustVisit.map(normalizeLocation);

    // Alt 1: 日程そのまま、必須スポットを1つ削る
    let alt1: AlternativePlan;
    if (normMust.length > 0) {
      const removedMust = normMust[normMust.length - 1];
      const remainingMust = normMust.slice(0, -1);
      alt1 = generateAlt_removeMust(
        input,
        "代替案1",
        [removedMust],
        `「${removedMust}」を今回は省略し、日程はそのままで移動を分散した行程`,
        "日程を変えずに1日あたりの移動負担を軽減できます。各スポットでの観光時間を確保しやすくなります。",
        `「${removedMust}」への立ち寄りは今回は省略となります。${remainingMust.length > 0 ? `残りの必須スポット（${remainingMust.join("・")}）は全て含まれます。` : ""}`
      );
    } else {
      // 必須スポットなし → できたら行きたい場所を全て省略
      const normNice = niceToVisit.map(normalizeLocation);
      alt1 = generateAlternative(
        input,
        "代替案1",
        normNice,
        "「できたら行きたい場所」を全て省略し、移動を最小限に抑えた行程",
        "移動距離が大幅に短縮され、ゆっくり過ごせます。",
        "希望スポットへの立ち寄りはできなくなります。"
      );
    }

    // Alt 2: 1日延長して必須スポットを可能な限り巡る
    const extInput2: TripInput = {
      ...input,
      endDate: input.endDate ? addDays(input.endDate, 1) : null,
      niceToVisit: [], // できたら行きたい場所は削除（難しければ）
      _isAlternative: true,
    };
    const alt2Result = planItinerary(extInput2);
    // 1日延長でもB判定の場合は必須スポットを1つ削る
    let alt2: AlternativePlan;
    if (alt2Result.judgment === "B" && normMust.length > 1) {
      const removedMust = normMust[normMust.length - 1];
      const extInputReduced: TripInput = {
        ...input,
        endDate: input.endDate ? addDays(input.endDate, 1) : null,
        mustVisit: input.mustVisit.filter(v => normalizeLocation(v) !== removedMust),
        niceToVisit: [],
        _isAlternative: true,
      };
      const alt2ReducedResult = planItinerary(extInputReduced);
      alt2 = {
        title: "代替案2",
        adjustment: `1日延長し「${removedMust}」を省略した行程`,
        merit: "旅行日数を1日増やすことで移動が分散され、必須スポットをほぼ全て巡れます。",
        caution: `旅行日数の延長と「${removedMust}」の省略が必要です。`,
        days: alt2ReducedResult.days,
        totalDistance: alt2ReducedResult.totalDistance,
        planType: alt2ReducedResult.planType,
        markdownTable: alt2ReducedResult.markdownTable,
      };
    } else {
      alt2 = {
        title: "代替案2",
        adjustment: "1日延長し、必須スポットを全て巡る行程（できたら行きたい場所は省略）",
        merit: "旅行日数を1日増やすことで移動が分散され、必須スポットを全て無理なく巡れます。",
        caution: "旅行日数の延長が必要です。「できたら行きたい場所」は今回は省略となります。",
        days: alt2Result.days,
        totalDistance: alt2Result.totalDistance,
        planType: alt2Result.planType,
        markdownTable: alt2Result.markdownTable,
      };
    }

    alternatives = [alt1, alt2];
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
  const { days, totalDistance, judgment, judgmentMessage, specialNotes, markdownTable, alternatives } = result;

  let md = "";

  // 修正④: スリランカ悪路注意喚起（常に表示）
  md += "> ⚠️ スリランカは悪路が多いです。長時間の移動が続くと移動疲れにより観光に支障をきたすおそれがあります。\n\n";

  // Special notes
  if (specialNotes.length > 0) {
    md += specialNotes.map(n => `> ⚠️ ${n}`).join("\n") + "\n\n";
  }

  // Route overview
  const normStart = normalizeLocation(input.startPoint);
  const normEnd = normalizeLocation(input.endPoint);
  const mustStr = input.mustVisit.length > 0
    ? input.mustVisit.map(v => {
        const norm = normalizeLocation(v);
        return norm !== v ? `${v}（${norm}）` : v;
      }).join(" → ")
    : "";
  md += `## 旅程概要\n\n`;
  md += `- **出発地：** ${normStart}\n`;
  md += `- **終着地：** ${normEnd}\n`;
  if (mustStr) md += `- **必須スポット：** ${mustStr}\n`;
  if (input.niceToVisit.length > 0) {
    const niceStr = input.niceToVisit.map(v => {
      const norm = normalizeLocation(v);
      return norm !== v ? `${v}（${norm}）` : v;
    }).join("、");
    md += `- **希望スポット：** ${niceStr}\n`;
  }
  md += "\n";

  // 修正⑥: B判定の場合は特別な表示順序
  if (judgment === "B") {
    md += "**【ご案内】** ご希望の行程は移動範囲がかなり広く、このままの内容ではご案内が難しい状況です。\n\n";
    md += "## 距離・時間表\n\n";
    md += markdownTable;
    md += "\n\n";
    md += "走行距離が安全に運行できる上限を超過しています。また、このまま運行しても十分な観光な時間が取れず結果的にお客様の満足度が下がってしまいます。\n\n";
    md += "安全面と観光時間を確保しやすくするため、行程を調整した代替案を2案ご提案いたします。\n\n";
  } else {
    // A判定・OK判定の通常表示
    if (judgmentMessage) {
      md += `**【ご案内】** ${judgmentMessage}\n\n`;
    }
    md += "## 距離・時間表\n\n";
    md += markdownTable;
    md += "\n\n";
  }

  // B判定の場合は1日ごとの旅程を表示しない（運行が難しいため不要）
  if (judgment !== "B") {
    md += "## 1日ごとの旅程\n\n";
    for (const day of days) {
      md += `### ${day.date}　${day.segments}\n\n`;
      const distStr = day.isStay ? "約30〜50km" : `${day.distance}km`;
      const timeStr = day.isStay ? "約1〜2時間" : formatTime(day.time);
      md += `走行距離：${distStr}　走行時間：${timeStr}\n\n`;
    }
  }

  // Note: Alternatives are rendered as React cards in Home.tsx, not in markdown

  return md;
}
