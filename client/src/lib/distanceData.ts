/**
 * Sri Lanka distance and travel time data
 * Source: 走行距離と時間(1).xlsx
 * All distances are bidirectional (same distance/time regardless of direction)
 *
 * Aliases:
 * - バンダラナイケ国際空港 / ネゴンボ / コロンボ → "コロンボ" (base)
 * - シーギリヤ地域 → "シーギリヤ"
 * - ヤーラ国立公園 / ティッサマハーラーマ → "ヤーラ国立公園"
 * - アフンガラ → "アルガムベイ"
 */

export interface DistanceEntry {
  from: string;
  to: string;
  distance: number; // km
  time: number; // hours
}

// Raw data from Excel
const RAW_DATA: DistanceEntry[] = [
  { from: "コロンボ", to: "アヌラーダプラ", distance: 195, time: 4.5 },
  { from: "コロンボ", to: "シーギリヤ", distance: 190, time: 3.5 },
  { from: "コロンボ", to: "ポロンナルワ", distance: 230, time: 4.5 },
  { from: "コロンボ", to: "ラトゥナプラ", distance: 90, time: 2.5 },
  { from: "コロンボ", to: "キャンディ", distance: 120, time: 3.0 },
  { from: "コロンボ", to: "ヌワラエリヤ", distance: 170, time: 5.0 },
  { from: "コロンボ", to: "アンブルワワタワー", distance: 120, time: 3.5 },
  { from: "コロンボ", to: "ハットン", distance: 120, time: 4.0 },
  { from: "コロンボ", to: "ホートンプレインズ", distance: 180, time: 5.5 },
  { from: "コロンボ", to: "アダムスピーク", distance: 140, time: 4.5 },
  { from: "コロンボ", to: "バンダラウェラ", distance: 210, time: 6.0 },
  { from: "コロンボ", to: "ゴール", distance: 130, time: 2.5 },
  { from: "コロンボ", to: "ベントータ", distance: 80, time: 2.0 },
  { from: "コロンボ", to: "ヒッカドゥワ", distance: 100, time: 2.5 },
  { from: "コロンボ", to: "アハンガマ", distance: 140, time: 2.5 },
  { from: "コロンボ", to: "ミリッサ", distance: 160, time: 2.5 },
  { from: "コロンボ", to: "ウダワラウェ国立公園", distance: 250, time: 4.0 },
  { from: "コロンボ", to: "エッラ", distance: 310, time: 5.0 },
  { from: "コロンボ", to: "ヤーラ国立公園", distance: 270, time: 4.0 },
  { from: "コロンボ", to: "トリンコマリー", distance: 270, time: 6.0 },
  { from: "コロンボ", to: "ウィルパトゥ国立公園", distance: 190, time: 4.0 },
  { from: "コロンボ", to: "ガンポーラ", distance: 130, time: 3.5 },
  { from: "アヌラーダプラ", to: "ウィルパトゥ国立公園", distance: 50, time: 1.0 },
  { from: "アヌラーダプラ", to: "シーギリヤ", distance: 80, time: 1.5 },
  { from: "アヌラーダプラ", to: "ポロンナルワ", distance: 110, time: 2.5 },
  { from: "アヌラーダプラ", to: "キャンディ", distance: 150, time: 3.5 },
  { from: "アヌラーダプラ", to: "ハットン", distance: 210, time: 5.5 },
  { from: "アヌラーダプラ", to: "ガンポーラ", distance: 160, time: 4.0 },
  { from: "アヌラーダプラ", to: "バンダラウェラ", distance: 250, time: 5.5 },
  { from: "アヌラーダプラ", to: "ラトゥナプラ", distance: 220, time: 4.5 },
  { from: "アヌラーダプラ", to: "トリンコマリー", distance: 110, time: 2.5 },
  { from: "ポロンナルワ", to: "シーギリヤ", distance: 60, time: 1.5 },
  { from: "ポロンナルワ", to: "キャンディ", distance: 140, time: 3.5 },
  { from: "ポロンナルワ", to: "ヌワラエリヤ", distance: 210, time: 5.0 },
  { from: "ポロンナルワ", to: "エッラ", distance: 190, time: 4.5 },
  { from: "ポロンナルワ", to: "ヤーラ国立公園", distance: 260, time: 5.5 },
  { from: "ポロンナルワ", to: "ガンポーラ", distance: 160, time: 4.0 },
  { from: "ポロンナルワ", to: "ハットン", distance: 210, time: 5.5 },
  { from: "ポロンナルワ", to: "バンダラウェラ", distance: 180, time: 4.5 },
  { from: "ポロンナルワ", to: "ラトゥナプラ", distance: 250, time: 5.0 },
  { from: "ポロンナルワ", to: "トリンコマリー", distance: 130, time: 3.0 },
  { from: "シーギリヤ", to: "キャンディ", distance: 90, time: 2.5 },
  { from: "シーギリヤ", to: "マータレー", distance: 70, time: 1.5 },
  { from: "シーギリヤ", to: "アンブルワワタワー", distance: 120, time: 3.5 },
  { from: "シーギリヤ", to: "ヌワラエリヤ", distance: 170, time: 5.0 },
  { from: "シーギリヤ", to: "エッラ", distance: 180, time: 4.5 },
  { from: "シーギリヤ", to: "ヤーラ国立公園", distance: 300, time: 6.0 },
  { from: "シーギリヤ", to: "バンダラウェラ", distance: 200, time: 5.0 },
  { from: "シーギリヤ", to: "ハットン", distance: 160, time: 4.5 },
  { from: "シーギリヤ", to: "ガンポーラ", distance: 110, time: 3.0 },
  { from: "シーギリヤ", to: "ラトゥナプラ", distance: 200, time: 4.5 },
  { from: "シーギリヤ", to: "ゴール", distance: 280, time: 5.0 },
  { from: "シーギリヤ", to: "アダムスピーク", distance: 180, time: 6.0 },
  { from: "シーギリヤ", to: "トリンコマリー", distance: 100, time: 2.0 },
  // シーギリヤ〜ミリッサ = シーギリヤ〜ゴール + ゴール〜ミリッサ = 280+50=330km, 5.0+1.0=6.0h
  { from: "シーギリヤ", to: "ミリッサ", distance: 330, time: 6.0 },
  { from: "キャンディ", to: "ラトゥナプラ", distance: 130, time: 4.0 },
  { from: "キャンディ", to: "ヌワラエリヤ", distance: 80, time: 3.0 },
  { from: "キャンディ", to: "ハットン", distance: 70, time: 3.0 },
  { from: "キャンディ", to: "ガンポーラ", distance: 20, time: 1.0 },
  { from: "キャンディ", to: "エッラ", distance: 140, time: 4.0 },
  { from: "キャンディ", to: "バンダラウェラ", distance: 150, time: 4.5 },
  { from: "キャンディ", to: "バドゥーラ", distance: 120, time: 3.5 },
  { from: "キャンディ", to: "アンブルワワタワー", distance: 30, time: 1.5 },
  { from: "キャンディ", to: "ヤーラ国立公園", distance: 250, time: 6.0 },
  { from: "キャンディ", to: "ウダワラウェ国立公園", distance: 230, time: 6.0 },
  { from: "キャンディ", to: "ゴール", distance: 230, time: 5.0 },
  { from: "キャンディ", to: "ホートンプレインズ", distance: 100, time: 4.0 },
  { from: "キャンディ", to: "アダムスピーク", distance: 90, time: 3.5 },
  { from: "キャンディ", to: "ベントータ", distance: 180, time: 4.5 },
  { from: "キャンディ", to: "ヒッカドゥワ", distance: 220, time: 5.0 },
  { from: "キャンディ", to: "ミリッサ", distance: 250, time: 5.5 },
  { from: "キャンディ", to: "タンガラ", distance: 280, time: 5.5 },
  { from: "キャンディ", to: "ウェリガマ", distance: 250, time: 5.0 },
  { from: "キャンディ", to: "トリンコマリー", distance: 200, time: 5.0 },
  { from: "キャンディ", to: "シンハラジャ森林保護区", distance: 165, time: 5.5 },
  { from: "ヌワラエリヤ", to: "アダムスピーク", distance: 70, time: 3.0 },
  { from: "ヌワラエリヤ", to: "ホートンプレインズ", distance: 30, time: 1.5 },
  { from: "ヌワラエリヤ", to: "バンダラウェラ", distance: 50, time: 2.0 },
  { from: "ヌワラエリヤ", to: "エッラ", distance: 60, time: 2.0 },
  { from: "ヌワラエリヤ", to: "デモダラ", distance: 60, time: 2.0 },
  { from: "ヌワラエリヤ", to: "ハットン", distance: 40, time: 1.5 },
  { from: "ヌワラエリヤ", to: "ウダワラウェ国立公園", distance: 150, time: 4.0 },
  { from: "ヌワラエリヤ", to: "ヤーラ国立公園", distance: 170, time: 4.5 },
  { from: "ヌワラエリヤ", to: "ゴール", distance: 260, time: 5.5 },
  { from: "ヌワラエリヤ", to: "ウェリガマ", distance: 240, time: 5.0 },
  { from: "ヌワラエリヤ", to: "ベントータ", distance: 210, time: 5.5 },
  { from: "ヌワラエリヤ", to: "ヒッカドゥワ", distance: 280, time: 5.5 },
  { from: "ヌワラエリヤ", to: "ミリッサ", distance: 240, time: 5.5 },
  { from: "ヌワラエリヤ", to: "タンガラ", distance: 200, time: 5.0 },
  { from: "ヌワラエリヤ", to: "トリンコマリー", distance: 290, time: 6.5 },
  { from: "ヌワラエリヤ", to: "シンハラジャ森林保護区", distance: 190, time: 5.5 },
  { from: "ホートンプレインズ", to: "シンハラジャ森林保護区", distance: 170, time: 5.0 },
  { from: "アダムスピーク", to: "シンハラジャ森林保護区", distance: 180, time: 6.0 },
  { from: "エッラ", to: "シンハラジャ森林保護区", distance: 190, time: 4.5 },
  { from: "ウダワラウェ国立公園", to: "シンハラジャ森林保護区", distance: 90, time: 3.0 },
  { from: "エッラ", to: "デモダラ", distance: 10, time: 0.5 },
  { from: "エッラ", to: "バンダラウェラ", distance: 20, time: 1.0 },
  { from: "エッラ", to: "ヤーラ国立公園", distance: 130, time: 3.5 },
  { from: "エッラ", to: "ゴール", distance: 200, time: 3.5 },
  { from: "エッラ", to: "ウダワラウェ国立公園", distance: 100, time: 2.5 },
  { from: "エッラ", to: "タンガラ", distance: 150, time: 3.0 },
  { from: "エッラ", to: "ミリッサ", distance: 180, time: 3.5 },
  { from: "エッラ", to: "ヒッカドゥワ", distance: 220, time: 4.0 },
  { from: "エッラ", to: "ベントータ", distance: 260, time: 4.5 },
  { from: "エッラ", to: "ウェリガマ", distance: 180, time: 3.5 },
  { from: "エッラ", to: "ホートンプレインズ", distance: 50, time: 2.0 },
  { from: "エッラ", to: "アダムスピーク", distance: 130, time: 4.5 },
  { from: "ヤーラ国立公園", to: "ヒッカドゥワ", distance: 180, time: 3.0 },
  { from: "ヤーラ国立公園", to: "タンガラ", distance: 90, time: 2.0 },
  { from: "ヤーラ国立公園", to: "ミリッサ", distance: 130, time: 2.5 },
  { from: "ヤーラ国立公園", to: "ゴール", distance: 150, time: 2.5 },
  { from: "ヤーラ国立公園", to: "ベントータ", distance: 210, time: 3.0 },
  { from: "ヤーラ国立公園", to: "ウェリガマ", distance: 130, time: 2.5 },
  { from: "ヤーラ国立公園", to: "トリンコマリー", distance: 280, time: 6.0 },
  { from: "ヤーラ国立公園", to: "アルガムベイ", distance: 110, time: 2.5 },
  { from: "ヤーラ国立公園", to: "アダムスピーク", distance: 220, time: 6.0 },
  { from: "ヤーラ国立公園", to: "ホートンプレインズ", distance: 170, time: 5.0 },
  { from: "ウダワラウェ国立公園", to: "ゴール", distance: 140, time: 2.5 },
  { from: "ウダワラウェ国立公園", to: "ヒッカドゥワ", distance: 160, time: 2.5 },
  { from: "ウダワラウェ国立公園", to: "タンガラ", distance: 80, time: 1.5 },
  { from: "ウダワラウェ国立公園", to: "ミリッサ", distance: 120, time: 2.0 },
  { from: "ウダワラウェ国立公園", to: "ベントータ", distance: 190, time: 3.0 },
  { from: "ウダワラウェ国立公園", to: "ウェリガマ", distance: 120, time: 2.0 },
  { from: "ゴール", to: "ヒッカドゥワ", distance: 20, time: 1.0 },
  { from: "ゴール", to: "タンガラ", distance: 80, time: 2.0 },
  { from: "ゴール", to: "ミリッサ", distance: 50, time: 1.0 },
  { from: "ゴール", to: "ベントータ", distance: 60, time: 1.5 },
  { from: "ゴール", to: "ウェリガマ", distance: 30, time: 1.0 },
  { from: "ゴール", to: "アルガムベイ", distance: 290, time: 5.5 },
  { from: "ゴール", to: "ホートンプレインズ", distance: 250, time: 5.5 },
  { from: "ゴール", to: "アダムスピーク", distance: 240, time: 6.0 },
  { from: "ゴール", to: "シンハラジャ森林保護区", distance: 80, time: 2.5 },
];

// Build bidirectional lookup map
const distanceMap = new Map<string, { distance: number; time: number }>();

function makeKey(a: string, b: string): string {
  return [a, b].sort().join("|||");
}

for (const entry of RAW_DATA) {
  const key = makeKey(entry.from, entry.to);
  if (!distanceMap.has(key)) {
    distanceMap.set(key, { distance: entry.distance, time: entry.time });
  }
}

/**
 * Normalize location names to canonical forms
 */
export function normalizeLocation(name: string): string {
  const aliases: Record<string, string> = {
    バンダラナイケ国際空港: "コロンボ",
    ネゴンボ: "コロンボ",
    "ネゴンボ(Negombo)": "コロンボ",
    "ネゴンボ (Negombo)": "コロンボ",
    "コロンボ(Colombo)": "コロンボ",
    "コロンボ (Colombo)": "コロンボ",
    "シーギリヤ(Sigiriya)": "シーギリヤ",
    "シーギリヤ (Sigiriya)": "シーギリヤ",
    "キャンディ(Kandy)": "キャンディ",
    "キャンディ (Kandy)": "キャンディ",
    "ヌワラエリヤ(Nuwara Eliya)": "ヌワラエリヤ",
    "ヌワラエリヤ (Nuwara Eliya)": "ヌワラエリヤ",
    "エッラ(Ella)": "エッラ",
    "エッラ (Ella)": "エッラ",
    "ゴール(Galle)": "ゴール",
    "ゴール (Galle)": "ゴール",
    "ミリッサ(Mirissa)": "ミリッサ",
    "ミリッサ (Mirissa)": "ミリッサ",
    "ヤーラ(Yala)": "ヤーラ国立公園",
    "ヤーラ (Yala)": "ヤーラ国立公園",
    ヤーラ: "ヤーラ国立公園",
    "トリンコマリー(Trincomalee)": "トリンコマリー",
    "トリンコマリー (Trincomalee)": "トリンコマリー",
    "アフンガラ(Arugam Bay)": "アルガムベイ",
    "アフンガラ (Arugam Bay)": "アルガムベイ",
    アフンガラ: "アルガムベイ",
    ティッサマハーラーマ: "ヤーラ国立公園",
  };
  // 観光地エイリアス：近くの拠点に換算するもの
  const sightseeingAliases: Record<string, string> = {
    // シーギリヤ地域
    シーギリヤロック: "シーギリヤ",
    "シーギリヤ・ロック": "シーギリヤ",
    "Sigiriya Rock": "シーギリヤ",
    ダンブッラ: "シーギリヤ",
    ダンブッラ石窟寺院: "シーギリヤ",
    ミンネリヤ国立公園: "シーギリヤ",
    // キャンディ地域
    キャンディ仏歯寺: "キャンディ",
    仏歯寺: "キャンディ",
    "Temple of the Tooth": "キャンディ",
    ペラデニヤ植物園: "キャンディ",
    ランギリダンブッラ: "キャンディ",
    // ヌワラエリヤ地域
    ホートンプレインズ国立公園: "ヌワラエリヤ",
    "World's End": "ヌワラエリヤ",
    ワールズエンド: "ヌワラエリヤ",
    グレゴリー湖: "ヌワラエリヤ",
    // エッラ地域
    エッラロック: "エッラ",
    ナインアーチブリッジ: "エッラ",
    "Nine Arch Bridge": "エッラ",
    // ゴール地域
    ゴール要塞: "ゴール",
    ゴールフォート: "ゴール",
    "Galle Fort": "ゴール",
    // ミリッサ地域
    ミリッサビーチ: "ミリッサ",
    ホエールウォッチング: "ミリッサ",
    // ヤーラ地域
    ヤーラ国立公園サファリ: "ヤーラ国立公園",
    ウダワラウェ: "ウダワラウェ国立公園",
    ウダワラウェサファリ: "ウダワラウェ国立公園",
    // コロンボ地域
    ガレフェイス: "コロンボ",
    コロンボ市内: "コロンボ",
    ピンナワラ象の孤児院: "コロンボ",
    // トリンコマリー地域
    ニラベリビーチ: "トリンコマリー",
    // アルガムベイ地域
    アルガムベイビーチ: "アルガムベイ",
    // 独立した立ち寄り地（拠点換算しない）
    // アンブルワワタワー → そのまま（distanceData内に存在）
    // ラトゥナプラ → そのまま（distanceData内に存在）
  };
  const combined = { ...aliases, ...sightseeingAliases };
  return combined[name] ?? name;
}

/**
 * Get direct distance between two locations
 */
export function getDirectDistance(
  from: string,
  to: string
): { distance: number; time: number } | null {
  const normFrom = normalizeLocation(from);
  const normTo = normalizeLocation(to);
  if (normFrom === normTo) return { distance: 0, time: 0 };
  const key = makeKey(normFrom, normTo);
  return distanceMap.get(key) ?? null;
}

// All known nodes in the graph
const ALL_NODES = [
  "コロンボ",
  "アヌラーダプラ",
  "シーギリヤ",
  "ポロンナルワ",
  "ラトゥナプラ",
  "キャンディ",
  "ヌワラエリヤ",
  "アンブルワワタワー",
  "ハットン",
  "ホートンプレインズ",
  "アダムスピーク",
  "バンダラウェラ",
  "ゴール",
  "ベントータ",
  "ヒッカドゥワ",
  "アハンガマ",
  "ミリッサ",
  "ウダワラウェ国立公園",
  "エッラ",
  "ヤーラ国立公園",
  "トリンコマリー",
  "ウィルパトゥ国立公園",
  "ガンポーラ",
  "マータレー",
  "バドゥーラ",
  "タンガラ",
  "ウェリガマ",
  "アルガムベイ",
  "デモダラ",
  "シンハラジャ森林保護区",
];

/**
 * Dijkstra-based shortest path (by distance, tiebreak by time)
 */
export function getShortestPath(
  from: string,
  to: string
): { distance: number; time: number; path: string[] } | null {
  const normFrom = normalizeLocation(from);
  const normTo = normalizeLocation(to);
  if (normFrom === normTo) return { distance: 0, time: 0, path: [normFrom] };

  // Check direct first
  const direct = getDirectDistance(normFrom, normTo);
  if (direct) {
    return { ...direct, path: [normFrom, normTo] };
  }

  // Dijkstra
  const dist = new Map<string, number>();
  const time = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  for (const node of ALL_NODES) {
    dist.set(node, Infinity);
    time.set(node, Infinity);
  }
  dist.set(normFrom, 0);
  time.set(normFrom, 0);

  const queue = new Set(ALL_NODES);

  while (queue.size > 0) {
    // Find min dist node
    let u: string | null = null;
    let minDist = Infinity;
    for (const node of Array.from(queue)) {
      const d = dist.get(node) ?? Infinity;
      if (d < minDist) {
        minDist = d;
        u = node;
      }
    }
    if (u === null || u === normTo) break;
    queue.delete(u);
    visited.add(u);

    // Check all neighbors
    for (const v of ALL_NODES) {
      if (visited.has(v)) continue;
      const edge = getDirectDistance(u, v);
      if (!edge) continue;
      const newDist = (dist.get(u) ?? Infinity) + edge.distance;
      const newTime = (time.get(u) ?? Infinity) + edge.time;
      const curDist = dist.get(v) ?? Infinity;
      const curTime = time.get(v) ?? Infinity;
      if (
        newDist < curDist ||
        (newDist === curDist && newTime < curTime)
      ) {
        dist.set(v, newDist);
        time.set(v, newTime);
        prev.set(v, u);
      }
    }
  }

  const finalDist = dist.get(normTo);
  const finalTime = time.get(normTo);
  if (finalDist === undefined || finalDist === Infinity) return null;

  // Reconstruct path
  const path: string[] = [];
  let cur: string | undefined = normTo;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur);
  }

  return { distance: finalDist, time: finalTime ?? 0, path };
}

/**
 * Format time as Japanese string
 */
export function formatTime(hours: number): string {
  if (hours === 0) return "0時間";
  if (hours < 1) return "約30分";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `約${h}時間`;
  if (m === 30) return `約${h}〜${h + 1}時間`;
  return `約${h}時間${m}分`;
}

export { distanceMap, ALL_NODES };
