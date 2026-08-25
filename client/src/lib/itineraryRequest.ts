export type TripFormValues = {
  startPoint: string;
  endPoint: string;
  startDate: Date | null;
  endDate: Date | null;
  mustVisit: string[];
  niceToVisit: string[];
};

export type ItineraryRequestSnapshot = {
  startPoint: string;
  endPoint: string;
  startDate: string | null;
  endDate: string | null;
  numDays: number;
  mustVisit: string[];
  niceToVisit: string[];
};

const formatDate = (date: Date | null) =>
  date ? `${date.getMonth() + 1}/${date.getDate()}` : null;

const cleanSpots = (spots: string[]) =>
  Array.from(new Set(spots.map(spot => spot.trim()).filter(Boolean)));

/**
 * フォームの現在値だけをリクエスト用に複製する。
 * 配列を複製するため、送信後のフォーム編集が進行中リクエストへ混入しない。
 */
export function createItineraryRequestSnapshot(values: TripFormValues): ItineraryRequestSnapshot {
  const numDays = values.startDate && values.endDate
    ? Math.max(1, Math.round((values.endDate.getTime() - values.startDate.getTime()) / 86_400_000) + 1)
    : 1;

  return {
    startPoint: values.startPoint.trim(),
    endPoint: values.endPoint.trim(),
    startDate: formatDate(values.startDate),
    endDate: formatDate(values.endDate),
    numDays,
    mustVisit: cleanSpots(values.mustVisit),
    niceToVisit: cleanSpots(values.niceToVisit),
  };
}
