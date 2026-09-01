export type LankamePayload = {
  type: "lankame:itinerary";
  version: 1;
  variant: "main" | "alternative";
  startPoint: string;
  endPoint: string;
  startDate: string;
  endDate: string;
  mustVisit: string[];
  niceToVisit: string[];
  route: string[];
  planName?: string;
  judgment?: string;
  itineraryText: string;
};

export type ItineraryPayloadInput = Omit<LankamePayload, "type" | "version">;

export type EmbedConfig = {
  PARENT_ORIGIN: string;
  IS_EMBED: boolean;
};

export function parseEmbedConfig(search: string): EmbedConfig {
  const params = new URLSearchParams(search);
  return {
    PARENT_ORIGIN: params.get("parent") || "*",
    IS_EMBED: params.get("embed") === "1",
  };
}

export function getEmbedConfig(): EmbedConfig {
  if (typeof window === "undefined") {
    return { PARENT_ORIGIN: "*", IS_EMBED: false };
  }
  return parseEmbedConfig(window.location.search);
}

export function createLankamePayload(input: ItineraryPayloadInput): LankamePayload {
  return {
    type: "lankame:itinerary",
    version: 1,
    ...input,
  };
}

export function sendToParent(payload: LankamePayload) {
  const { PARENT_ORIGIN } = getEmbedConfig();
  console.info("[lankame] postMessage payload", payload);

  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, PARENT_ORIGIN);
    return;
  }

  // iframe外で直接開かれた場合のフォールバック
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  window.location.href =
    "https://srilankataxicharterservice.com/ja/#lankame-trip=" + encodeURIComponent(b64);
}
