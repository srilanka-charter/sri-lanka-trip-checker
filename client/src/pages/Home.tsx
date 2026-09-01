/**
 * Sri Lanka Trip Checker - Main Page
 * Design: Tropical Cartography - warm vintage map aesthetic
 * Colors: Terracotta #C4622D, Deep Green #2D5A27, Sand #E8D5A3, Cream #FAF7F0
 * Layout: Left form panel (sticky) + Right column (map → result scrollable)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Calendar, Navigation, Star, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import TripMap from "@/components/TripMap";
import DateRangePicker from "@/components/DateRangePicker";
import SpotSelector from "@/components/SpotSelector";
import { createItineraryRequestSnapshot } from "@/lib/itineraryRequest";
import { createLankamePayload, getEmbedConfig, sendToParent, type LankamePayload } from "@/lib/embedMessaging";

type AlternativePlan = {
  adjustment: string;
  merit: string;
  caution: string;
  markdownTable: string;
  planName?: string;
  route?: string[];
  days?: Array<{ date: string; segments: string; distance: number; time: number }>;
};

type ContactPayloadContext = Omit<LankamePayload, "type" | "version" | "variant" | "route" | "planName" | "judgment" | "itineraryText">;

function formatPayloadDate(date: Date | null): string {
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
import { LOCATIONS, MAP_MARKERS } from "@/lib/locations";
import { normalizeLocation } from "@/lib/distanceData";

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  const [startPoint, setStartPoint] = useState<string>("");
  const [endPoint, setEndPoint] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [mustVisit, setMustVisit] = useState<string[]>([]);
  const [niceToVisit, setNiceToVisit] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [itineraryResult, setItineraryResult] = useState<{
    days: Array<{
      date: string;
      segments: string;
      distance: number;
      time: number;
      notes: string[];
      isPickup?: boolean;
      isReturn?: boolean;
      isStay?: boolean;
    }>;
    totalDistance: number;
    totalDays: number;
    specialNotes: string[];
    route: string[];
    markdownTable: string;
    alternatives: Array<{
      adjustment: string;
      merit: string;
      caution: string;
      markdownTable: string;
      planName?: string;
    }>;
    judgment?: string;
    planName?: string;
    judgmentMessage?: string;
  } | null>(null);
  const [routeLocations, setRouteLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [submittedPayloadContext, setSubmittedPayloadContext] = useState<ContactPayloadContext | null>(null);
  const markdownTableRef = useRef<string>("");
  const activeGenerationIdRef = useRef(0);
  const { PARENT_ORIGIN, IS_EMBED } = getEmbedConfig();

  useEffect(() => {
    if (!IS_EMBED || window.parent === window) return;
    const send = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "lankame:height", version: 1, height }, PARENT_ORIGIN);
    };
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    send();
    return () => observer.disconnect();
  }, [IS_EMBED, PARENT_ORIGIN]);

  const generateItinerary = trpc.ai.generateItinerary.useMutation();

  const handleGenerate = useCallback(() => {
    const errs: string[] = [];
    if (!startPoint) errs.push("出発地を選択してください");
    if (!endPoint) errs.push("終着地を選択してください");
    if (!startDate || !endDate) errs.push("旅行期間を選択してください");
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    const submitted = createItineraryRequestSnapshot({
      startPoint,
      endPoint,
      startDate,
      endDate,
      mustVisit,
      niceToVisit,
    });
    const payloadContext: ContactPayloadContext = {
      startPoint: submitted.startPoint,
      endPoint: submitted.endPoint,
      startDate: formatPayloadDate(startDate),
      endDate: formatPayloadDate(endDate),
      mustVisit: [...submitted.mustVisit],
      niceToVisit: [...submitted.niceToVisit],
    };
    const generationId = activeGenerationIdRef.current + 1;
    activeGenerationIdRef.current = generationId;

    setErrors([]);
    setIsLoading(true);
    setResult(null);
    setItineraryResult(null);
    setRouteLocations([]);
    setSubmittedPayloadContext(payloadContext);
    setShowResult(false);

    generateItinerary.mutate(submitted, {
      onSuccess: (data) => {
        if (generationId !== activeGenerationIdRef.current) return;
        setItineraryResult(data);
        markdownTableRef.current = data.markdownTable;
        const normalizedRoute = data.route
          .map((loc: string) => normalizeLocation(loc))
          .filter((loc: string) => loc in MAP_MARKERS);
        const normStart = normalizeLocation(submitted.startPoint);
        const normEnd = normalizeLocation(submitted.endPoint);
        const routeWithEnds = [...normalizedRoute];
        if (normStart in MAP_MARKERS && (routeWithEnds.length === 0 || routeWithEnds[0] !== normStart)) {
          routeWithEnds.unshift(normStart);
        }
        if (normEnd in MAP_MARKERS && (routeWithEnds.length === 0 || routeWithEnds[routeWithEnds.length - 1] !== normEnd)) {
          routeWithEnds.push(normEnd);
        }
        setRouteLocations(routeWithEnds);
        const specialNotesSection = data.specialNotes.length > 0
          ? `\n\n**特記事項**\n${data.specialNotes.map(n => `- ${n}`).join("\n")}`
          : "";
        setResult(`## 旅程表\n\n${data.markdownTable}${specialNotesSection}`);
        setShowResult(true);
        setIsLoading(false);
        setTimeout(() => document.getElementById("result-area")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      },
      onError: (error) => {
        if (generationId !== activeGenerationIdRef.current) return;
        console.error("旅程生成エラー:", error);
        setResult("旅程の生成中にエラーが発生しました。しばらく後にお試しください。");
        setShowResult(true);
        setIsLoading(false);
      },
    });
  }, [startPoint, endPoint, startDate, endDate, mustVisit, niceToVisit]);

  const handleReset = () => {
    setStartPoint("");
    setEndPoint("");
    setStartDate(null);
    setEndDate(null);
    setMustVisit([]);
    setNiceToVisit([]);
    setResult(null);
    setRouteLocations([]);
    setShowResult(false);
    setErrors([]);
    setItineraryResult(null);
    setSubmittedPayloadContext(null);
    setCopied(false);
    markdownTableRef.current = "";
  };

  const handleCopyItinerary = useCallback(async (itineraryText = markdownTableRef.current) => {
    const text = itineraryText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, []);

  const isJudgmentB = itineraryResult?.judgment === "B";

  return (
    <div className={IS_EMBED ? "" : "min-h-screen"} style={{ background: "#FFFFFF", fontFamily: "'Noto Sans JP', sans-serif" }}>
      {/* Header */}
      {!IS_EMBED && <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          borderColor: "#E5E7EB",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src="/manus-storage/sri-lanka-logo_f44c2263.png"
            alt="Logo"
            className="w-9 h-9 object-contain"
          />
          <div>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', serif", color: "#111827" }}
            >
              スリランカ旅程提案チェッカー
            </h1>
            <p className="text-xs" style={{ color: "#374151" }}>
              Sri Lanka Trip Planner
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs hidden sm:flex"
              style={{ borderColor: "#3B5BDB", color: "#3B5BDB" }}
            >
              距離データ準拠
            </Badge>
          </div>
        </div>
      </header>}

      {/* Main Layout: Left form (sticky) + Right scrollable content */}
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row">
        {/* Left: Form Panel (sticky on desktop) */}
        <div
          className="lg:w-[420px] xl:w-[460px] flex-shrink-0"
          style={{ borderRight: "1px solid #E5E7EB" }}
        >
          <div
            className={IS_EMBED ? "" : "lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-60px)] lg:overflow-y-auto"}
          >
            <div className={`px-5 pb-5 space-y-5 ${IS_EMBED ? "pt-0" : "pt-5"}`}>
              {/* Hero text */}
              <div
                className="rounded-xl p-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #3B5BDB 0%, #2D4FC0 100%)",
                  color: "white",
                }}
              >
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-80 mb-1">TRIP PLANNER</p>
                  <h2
                    className="text-lg font-bold leading-snug"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    旅程を入力して<br />最適ルートを確認
                  </h2>
                  <p className="text-xs mt-2 opacity-75">
                    地図上にルートを描画し、1日ごとの距離・時間を自動計算します
                  </p>
                </div>
                <div
                  className="absolute right-3 bottom-2 text-6xl opacity-10 font-bold"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  SL
                </div>
              </div>

              {/* Date Range */}
              <FormSection icon={<Calendar size={16} />} title="旅行期間">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartChange={setStartDate}
                  onEndChange={setEndDate}
                />
              </FormSection>

              {/* Start / End Points */}
              <FormSection icon={<Navigation size={16} />} title="出発地・終着地">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#374151" }}>
                      出発地（Start Point）
                    </label>
                    <LocationSelect
                      value={startPoint}
                      onChange={setStartPoint}
                      placeholder="出発地を選択"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#374151" }}>
                      終着地（End Point）
                    </label>
                    <LocationSelect
                      value={endPoint}
                      onChange={setEndPoint}
                      placeholder="終着地を選択"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Must Visit */}
              <FormSection icon={<MapPin size={16} />} title="必須で行きたい場所">
               <SpotSelector
                 selected={mustVisit}
                 onChange={setMustVisit}
                 exclude={[startPoint, endPoint, ...niceToVisit]}
                 color="#3B5BDB"
                 placeholder=""
               />
                <p className="text-xs mt-3 leading-relaxed" style={{ color: "#374151" }}>
                  紅茶列車に乗車したい場合、現在の運行区間のヌワラエリヤ、エッラを選択してください。問い合わせ後に乗車区間や予約法についてご案内申し上げます。
                </p>
              </FormSection>

              {/* Nice to Visit */}
              <FormSection icon={<Star size={16} />} title="できたら行きたい場所">
                <SpotSelector
                  selected={niceToVisit}
                  onChange={setNiceToVisit}
                  exclude={[startPoint, endPoint, ...mustVisit]}
                  color="#3B5BDB"
                  placeholder=""
                />
              </FormSection>

              {/* Errors */}
              {errors.length > 0 && (
                <div
                  className="rounded-lg p-3 text-sm space-y-1"
                  style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626" }}
                >
                  {errors.map((e, i) => (
                    <p key={i}>• {e}</p>
                  ))}
                </div>
              )}

              {/* Generate Button */}
              <Button
                className="w-full h-12 text-base font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: "#00CC88",
                  color: "white",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,204,136,0.3)",
                }}
                onClick={handleGenerate}
                disabled={isLoading || generateItinerary.isPending}
              >
                {isLoading || generateItinerary.isPending ? (
                  <><Loader2 size={18} className="animate-spin mr-2" />回答を作成中...</>
                ) : (
                  <>旅程を生成する</>
                )}
              </Button>

              {showResult && (
                <Button
                  variant="outline"
                  className="w-full h-10 text-sm"
                  style={{ borderColor: "#D1D5DB", color: "#6B7280" }}
                  onClick={handleReset}
                >
                  リセット
                </Button>
              )}

            </div>
          </div>
        </div>

        {/* Right: Map + Result (scrollable) */}
        <div className="flex-1 flex flex-col" id="result-area">
          {/* Map - aspect-ratio based height */}
          <div
            style={{
              aspectRatio: "4 / 3",
              minHeight: "320px",
              maxHeight: "600px",
              width: "100%",
              position: "relative",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <TripMap routeLocations={routeLocations} warningMode={isJudgmentB && showResult} />
          </div>

          {/* Result Area - below map */}
          {showResult && result ? (
            <div
              className="flex-1 p-6"
              style={{ background: "#FFFFFF" }}
            >
              {/* Result Header */}
              <div
                className="flex items-center justify-between mb-5 pb-3"
                style={{ borderBottom: "1px solid #E5E7EB" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ background: "#3B5BDB" }}
                  />
                  <h3
                    className="text-xl font-bold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#111827" }}
                  >
                    旅程提案結果
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  style={{ color: "#6B7280", fontSize: "12px" }}
                >
                  リセット
                </Button>
              </div>

              {/* Markdown Result */}
              <div
                className="prose prose-sm max-w-none"
                style={{
                  "--tw-prose-body": "#111827",
                  "--tw-prose-headings": "#111827",
                  "--tw-prose-links": "#3B5BDB",
                  "--tw-prose-bold": "#111827",
                  "--tw-prose-tables": "#111827",
                  "--tw-prose-th-borders": "#E5E7EB",
                  "--tw-prose-td-borders": "#E5E7EB",
                } as React.CSSProperties}
              >
              <Streamdown>{result}</Streamdown>
              </div>

              {/* 旅程表直下：問い合わせボタン＋注意書き（遂行可能時） */}
              {!isJudgmentB && (
                <div
                  className="mt-6 rounded-2xl p-6 space-y-4"
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <button
                    onClick={() => {
                      void handleCopyItinerary();
                      if (!itineraryResult || !submittedPayloadContext) return;
                      sendToParent(createLankamePayload({
                        ...submittedPayloadContext,
                        variant: "main",
                        route: itineraryResult.route,
                        planName: itineraryResult.planName,
                        judgment: itineraryResult.judgment,
                        itineraryText: markdownTableRef.current,
                      }));
                    }}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.97]"
                    style={{
                      background: "#00CC88",
                      border: "none",
                      color: "white",
                      boxShadow: "0 4px 12px rgba(0,204,136,0.3)",
                    }}
                  >
                    <MessageCircle size={16} />
                    この旅程で金額を問い合わせる
                  </button>
                  <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>
                    ※あくまで自動で算出される簡易的なモデルコースです。お問い合わせいただいた際に他にご要望があればお伝えください。カスタマーサポートから詳細と金額について、ご案内させていただきます。
                  </p>
                  {/* 過密日警告：AまたはBのどちらか一方のみ満たす日がある場合 */}
                 {(() => {
                   if (!itineraryResult?.days) return null;
                   // A = 距離300km以上、B = 時間6時間以上
                  // AとBの両方を満たす日 → 遂行不可能（A判定）なので対象外
                  // AまたはBのいずれか一方のみを満たす日 → 遂行可能だが過密 → 警告表示
                   const busyDays = itineraryResult.days.filter(day => {
                     if (day.isStay) return false;
                     // 遂行不可能（distance>300 かつ time>6）は除外
                     if (day.distance > 300 && day.time > 6) return false;
                     // A（距離300km以上）またはB（時間6時間以上）のどちらか一方以上を満たす日が過密
                      // A = 301km以上（distance > 300）、B = 6時間超（time > 6）
                      return day.distance > 300 || day.time > 6;
                    });
                    if (busyDays.length === 0) return null;
                    const dateList = busyDays.map(d => d.date).join("・");
                    return (
                      <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: "#FFF7F7", border: "1px solid #FECACA" }}>
                        <p style={{ color: "#374151" }}>
                          遂行可能でありますが、<span style={{ color: "#DC2626", fontWeight: "bold" }}>上記のプランは「無理のない観光旅程」とは言えません。</span>特に{dateList}が過密です。お問い合わせいただいた時に現実的に無理なく旅行を最大限楽しめるプランについてもご案内させていただきます。
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* judgmentMessage（代替案提案の説明文）を代替案の前に表示 */}
              {itineraryResult?.judgmentMessage && (
                <div
                  className="mt-6 p-4 rounded-xl text-sm leading-relaxed"
                  style={{
                    background: "#F0F4FF",
                    border: "1px solid #C7D2FE",
                    color: "#1E3A8A",
                  }}
                >
                  {itineraryResult.judgmentMessage}
                </div>
              )}

              {/* Alternative Plans - rendered as rich cards */}
              {itineraryResult?.alternatives && itineraryResult.alternatives.length > 0 && submittedPayloadContext && (
                <AlternativePlansSection
                  alternatives={itineraryResult.alternatives}
                  startPoint={startPoint}
                  endPoint={endPoint}
                  contactPayloadContext={submittedPayloadContext}
                  onCopyItinerary={handleCopyItinerary}
                />
              )}

            </div>
          ) : (
            /* Placeholder when no result */
            <div
              className="flex-1 flex flex-col items-center justify-center p-10 text-center"
              style={{ minHeight: "300px" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "#EFF6FF" }}
              >
                <MapPin size={28} style={{ color: "#3B5BDB" }} />
              </div>
              <p
                className="text-base font-medium mb-2"
                style={{ color: "#374151", fontFamily: "'Playfair Display', serif" }}
              >
                旅程を入力して生成してください
              </p>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                左のフォームに旅行期間・出発地・終着地を入力し、<br />
                「旅程を生成する」ボタンを押すと地図上にルートが描画されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "white",
        border: "1px solid #D1D5DB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "#3B5BDB" }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: "#111827" }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function LocationSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="w-full h-10 text-sm"
        style={{
          borderColor: "#D1D5DB",
          background: "#FFFFFF",
          color: value ? "#111827" : "#9CA3AF",
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {LOCATIONS.map((loc) => (
          <SelectItem key={loc.id} value={loc.label}>
            <span className="flex items-center gap-2">
              <MapPin size={12} style={{ color: "#3B5BDB" }} />
              {loc.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ===== Alternative Plans Section =====

function AlternativePlansSection({
  alternatives,
  startPoint,
  endPoint,
  contactPayloadContext,
  onCopyItinerary,
}: {
  alternatives: AlternativePlan[];
  startPoint: string;
  endPoint: string;
  contactPayloadContext: ContactPayloadContext;
  onCopyItinerary: (itineraryText: string) => Promise<void>;
}) {
  return (
    <div className="mt-8">
      <div
        className="flex items-center gap-2 mb-5 pb-3"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <div className="w-1 h-6 rounded-full" style={{ background: "#3B5BDB" }} />
        <h3
          className="text-xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: "#111827" }}
        >
          代替案のご提案
        </h3>
      </div>
      <div className="space-y-6">
        {alternatives.map((alt, idx) => (
          <AlternativePlanCard key={idx} alt={alt} index={idx + 1} startPoint={startPoint} endPoint={endPoint} contactPayloadContext={contactPayloadContext} onCopyItinerary={onCopyItinerary} />
        ))}
      </div>
    </div>
  );
}

function AlternativePlanCard({
  alt,
  index,
  startPoint,
  endPoint,
  contactPayloadContext,
  onCopyItinerary,
}: {
  alt: AlternativePlan;
  index: number;
  startPoint: string;
  endPoint: string;
  contactPayloadContext: ContactPayloadContext;
  onCopyItinerary: (itineraryText: string) => Promise<void>;
}) {
  // 代替案のrouteを正規化して地図用に構築
  const altRoute = (() => {
    const base: string[] = (alt.route ?? [])
      .map((loc: string) => normalizeLocation(loc))
      .filter((loc: string) => loc in MAP_MARKERS);
    const normStart = normalizeLocation(startPoint);
    const normEnd = normalizeLocation(endPoint);
    const r = [...base];
    if (normStart in MAP_MARKERS && (r.length === 0 || r[0] !== normStart)) r.unshift(normStart);
    if (normEnd in MAP_MARKERS && (r.length === 0 || r[r.length - 1] !== normEnd)) r.push(normEnd);
    return r;
  })();

  const allColors = [
    { bg: "#EFF4FF", border: "#3B5BDB", accent: "#3B5BDB", badge: "#D0DCFF" },
    { bg: "#F0F9FF", border: "#0284C7", accent: "#0284C7", badge: "#BAE6FD" },
    { bg: "#F5F3FF", border: "#7C3AED", accent: "#7C3AED", badge: "#DDD6FE" },
  ];
  const c = allColors[(index - 1) % 3];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `2px solid ${c.border}`,
        background: c.bg,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      {/* Card Header */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ background: c.border }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
        >
          {index}
        </div>
        <h4
          className="text-base font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: "white" }}
        >
          代替案 {index}
        </h4>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Adjustment / Merit / Caution */}
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoChip label="調整内容" text={alt.adjustment} color={c.accent} bgColor={c.badge} />
          <InfoChip label="メリット" text={alt.merit} color="#1A6B1A" bgColor="#D4EDD0" />
          <InfoChip label="注意点" text={alt.caution} color="#8B4513" bgColor="#FFE8D4" />
        </div>

        {/* 代替案の地図 */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #E5E7EB", height: "280px" }}
        >
          <TripMap routeLocations={altRoute} compact />
        </div>

        {/* Distance Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #E5E7EB" }}
        >
          <div
            className="px-4 py-2 text-xs font-semibold"
            style={{ background: "#F3F4F6", color: "#374151" }}
          >
            距離・時間表
          </div>
          <div
            className="p-4 prose prose-sm max-w-none"
            style={{
              background: "white",
              "--tw-prose-body": "#111827",
              "--tw-prose-headings": c.accent,
              "--tw-prose-th-borders": "#E5E7EB",
              "--tw-prose-td-borders": "#E5E7EB",
            } as React.CSSProperties}
          >
            <Streamdown>{alt.markdownTable}</Streamdown>
          </div>
        </div>

       {/* 代替案ごとのコピー＆問い合わせボタン */}
        <ContactSection
          days={alt.days}
          itineraryText={alt.markdownTable}
          planName={alt.planName}
          variant="alternative"
          route={alt.route ?? altRoute}
          contactPayloadContext={contactPayloadContext}
          onCopyItinerary={onCopyItinerary}
        />
      </div>
    </div>
  );
}

function InfoChip({ label, text, color, bgColor }: { label: string; text: string; color: string; bgColor: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: bgColor, border: `1px solid ${color}22` }}
    >
      <p className="text-xs font-bold mb-1" style={{ color }}>
        {label}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>
        {text}
      </p>
    </div>
  );
}

// ===== Contact Section =====

function ContactSection({
  days,
  itineraryText,
  planName,
  variant,
  route,
  contactPayloadContext,
  onCopyItinerary,
}: {
  days?: Array<{ date: string; segments: string; distance: number; time: number }>;
  itineraryText: string;
  planName?: string;
  variant: "alternative";
  route: string[];
  contactPayloadContext: ContactPayloadContext;
  onCopyItinerary: (itineraryText: string) => Promise<void>;
}) {
  // 過密日警告：A（301km以上）またはB（6時間超）のどちらか一方のみを満たす日がある場合
  const busyDays = (days ?? []).filter(day => {
    // 遂行不可能（distance>300 かつ time>6）は除外
    if (day.distance > 300 && day.time > 6) return false;
    return day.distance > 300 || day.time > 6;
  });
  const dateList = busyDays.map(d => d.date).join("・");

  return (
    <div
      className="mt-8 rounded-2xl p-6 space-y-4"
      style={{
        background: "white",
        border: "1px solid #E5E7EB",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <button
        onClick={() => {
          void onCopyItinerary(itineraryText);
          sendToParent(createLankamePayload({
            ...contactPayloadContext,
            variant,
            route,
            planName,
            itineraryText,
          }));
        }}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.97]"
        style={{
          background: "#00CC88",
          border: "none",
          color: "white",
          boxShadow: "0 4px 12px rgba(0,204,136,0.3)",
        }}
      >
        <MessageCircle size={16} />
        この旅程で金額を問い合わせる
      </button>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "#6B7280" }}
      >
        ※この結果は不完全な場合もあります。追加でご要望等があればお問い合わせ時に追記してください。カスタマーサポートから詳細と金額について、ご案内させていただきます。
      </p>
      {busyDays.length > 0 && (
        <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: "#FFF7F7", border: "1px solid #FECACA" }}>
          <p style={{ color: "#374151" }}>
            遂行可能でありますが、<span style={{ color: "#DC2626", fontWeight: "bold" }}>上記のプランは「無理のない観光旅程」とは言えません。</span>特に{dateList}が過密です。お問い合わせいただいた時に現実的に無理なく旅行を最大限楽しめるプランについてもご案内させていただきます。
          </p>
        </div>
      )}
    </div>
  );
}
