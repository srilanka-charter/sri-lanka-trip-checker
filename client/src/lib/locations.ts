/**
 * Sri Lanka location coordinates and display info
 */

export interface Location {
  id: string;
  label: string; // Display name (Japanese)
  labelEn: string; // English name
  lat: number;
  lng: number;
  canonical: string; // Normalized name for distance lookup
  description?: string;
}

export const LOCATIONS: Location[] = [
  {
    id: "airport",
    label: "バンダラナイケ国際空港",
    labelEn: "Bandaranaike International Airport",
    lat: 7.1808,
    lng: 79.8841,
    canonical: "コロンボ",
    description: "コロンボ郊外の国際空港",
  },
  {
    id: "negombo",
    label: "ネゴンボ (Negombo)",
    labelEn: "Negombo",
    lat: 7.2094,
    lng: 79.8358,
    canonical: "コロンボ",
    description: "空港近くのビーチリゾート",
  },
  {
    id: "colombo",
    label: "コロンボ (Colombo)",
    labelEn: "Colombo",
    lat: 6.9271,
    lng: 79.8612,
    canonical: "コロンボ",
    description: "スリランカの商業首都",
  },
  {
    id: "sigiriya",
    label: "シーギリヤ (Sigiriya)",
    labelEn: "Sigiriya",
    lat: 7.9570,
    lng: 80.7603,
    canonical: "シーギリヤ",
    description: "世界遺産の岩山要塞",
  },
  {
    id: "kandy",
    label: "キャンディ (Kandy)",
    labelEn: "Kandy",
    lat: 7.2906,
    lng: 80.6337,
    canonical: "キャンディ",
    description: "仏歯寺のある古都",
  },
  {
    id: "nuwaraeliya",
    label: "ヌワラエリヤ (Nuwara Eliya)",
    labelEn: "Nuwara Eliya",
    lat: 6.9497,
    lng: 80.7891,
    canonical: "ヌワラエリヤ",
    description: "紅茶の産地・高原リゾート",
  },
  {
    id: "ella",
    label: "エッラ (Ella)",
    labelEn: "Ella",
    lat: 6.8667,
    lng: 81.0466,
    canonical: "エッラ",
    description: "山岳トレッキングの拠点",
  },
  {
    id: "galle",
    label: "ゴール (Galle)",
    labelEn: "Galle",
    lat: 6.0535,
    lng: 80.2210,
    canonical: "ゴール",
    description: "世界遺産のオランダ要塞都市",
  },
  {
    id: "mirissa",
    label: "ミリッサ (Mirissa)",
    labelEn: "Mirissa",
    lat: 5.9483,
    lng: 80.4716,
    canonical: "ミリッサ",
    description: "ホエールウォッチングで有名",
  },
  {
    id: "yala",
    label: "ヤーラ (Yala)",
    labelEn: "Yala",
    lat: 6.3728,
    lng: 81.5197,
    canonical: "ヤーラ国立公園",
    description: "ヒョウが生息する国立公園",
  },
  {
    id: "trincomalee",
    label: "トリンコマリー (Trincomalee)",
    labelEn: "Trincomalee",
    lat: 8.5874,
    lng: 81.2152,
    canonical: "トリンコマリー",
    description: "北東部の港湾都市・ビーチ",
  },
  {
    id: "arugambay",
    label: "アフンガラ (Arugam Bay)",
    labelEn: "Arugam Bay",
    lat: 6.8403,
    lng: 81.8360,
    canonical: "アルガムベイ",
    description: "サーフィンの聖地",
  },
];

export const LOCATION_MAP = new Map<string, Location>(
  LOCATIONS.map(loc => [loc.id, loc])
);

export function getLocationById(id: string): Location | undefined {
  return LOCATION_MAP.get(id);
}

export function getLocationByCanonical(canonical: string): Location | undefined {
  return LOCATIONS.find(loc => loc.canonical === canonical);
}

// Coordinates for map markers (all unique canonical locations)
export const MAP_MARKERS: Record<string, { lat: number; lng: number; label: string }> = {
  コロンボ: { lat: 6.9271, lng: 79.8612, label: "コロンボ/空港/ネゴンボ" },
  シーギリヤ: { lat: 7.9570, lng: 80.7603, label: "シーギリヤ" },
  キャンディ: { lat: 7.2906, lng: 80.6337, label: "キャンディ" },
  ヌワラエリヤ: { lat: 6.9497, lng: 80.7891, label: "ヌワラエリヤ" },
  エッラ: { lat: 6.8667, lng: 81.0466, label: "エッラ" },
  ゴール: { lat: 6.0535, lng: 80.2210, label: "ゴール" },
  ミリッサ: { lat: 5.9483, lng: 80.4716, label: "ミリッサ" },
  ヤーラ国立公園: { lat: 6.3728, lng: 81.5197, label: "ヤーラ" },
  トリンコマリー: { lat: 8.5874, lng: 81.2152, label: "トリンコマリー" },
  アルガムベイ: { lat: 6.8403, lng: 81.8360, label: "アルガムベイ" },
  アヌラーダプラ: { lat: 8.3114, lng: 80.4037, label: "アヌラーダプラ" },
  ポロンナルワ: { lat: 7.9403, lng: 81.0188, label: "ポロンナルワ" },
};
