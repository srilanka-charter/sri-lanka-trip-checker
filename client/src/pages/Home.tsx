/**
 * Sri Lanka Trip Checker - Main Page
 * Design: Tropical Cartography - warm vintage map aesthetic
 * Colors: Terracotta #C4622D, Deep Green #2D5A27, Sand #E8D5A3, Cream #FAF7F0
 * Layout: Left form panel (sticky) + Right column (map → result scrollable)
 */

import { useState, useCallback, useRef } from "react";
import { MapPin, Calendar, Navigation, Star, Loader2, Copy, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import TripMap from "@/components/TripMap";
import DateRangePicker from "@/components/DateRangePicker";
import SpotSelector from "@/components/SpotSelector";

type AlternativePlan = {
  adjustment: string;
  merit: string;
  caution: string;
  markdownTable: string;
  planName?: string;
  route?: string[];
};
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
  const markdownTableRef = useRef<string>("");

  // ChatGPT旅程生成
  const generateItinerary = trpc.ai.generateItinerary.useMutation({
    onSuccess: (data) => {
      setItineraryResult(data);
      markdownTableRef.current = data.markdownTable;
      // routeの各地名をMAP_MARKERSのキーに正規化し、未知の地名はスキップ
      const normalizedRoute = data.route
        .map((loc: string) => normalizeLocation(loc))
        .filter((loc: string) => loc in MAP_MARKERS);
      // 出発地・終着地が含まれていない場合は先頭・末尾に補完
      const normStart = normalizeLocation(startPoint);
      const normEnd = normalizeLocation(endPoint);
      const routeWithEnds = [...normalizedRoute];
      if (normStart in MAP_MARKERS && (routeWithEnds.length === 0 || routeWithEnds[0] !== normStart)) {
        routeWithEnds.unshift(normStart);
      }
      if (normEnd in MAP_MARKERS && (routeWithEnds.length === 0 || routeWithEnds[routeWithEnds.length - 1] !== normEnd)) {
        routeWithEnds.push(normEnd);
      }
      setRouteLocations(routeWithEnds);
      // markdownTableを使って結果表示用テキストを構築
      // 判定メッセージとプラン名
      const judgmentSection = data.judgmentMessage
        ? `\n\n${data.judgmentMessage}`
        : "";
      const planSection = data.planName && data.planName !== "-"
        ? `\n\n**対象プラン：${data.planName}**`
        : "";
      const specialNotesSection = data.specialNotes.length > 0
        ? `\n\n**特記事項**\n${data.specialNotes.map(n => `- ${n}`).join("\n")}`
        : "";
      const markdown = `## 旅程表\n\n${data.markdownTable}${specialNotesSection}${planSection}${judgmentSection}`;
      setResult(markdown);
      setShowResult(true);
      setIsLoading(false);
      setTimeout(() => {
        const el = document.getElementById("result-area");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: (error) => {
      console.error("旅程生成エラー:", error);
      setResult("旅程の生成中にエラーが発生しました。しばらく後にお試しください。");
      setShowResult(true);
      setIsLoading(false);
    },
  });

  const handleGenerate = useCallback(() => {
    const errs: string[] = [];
    if (!startPoint) errs.push("出発地を選択してください");
    if (!endPoint) errs.push("終着地を選択してください");
    if (!startDate || !endDate) errs.push("旅行期間を選択してください");
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setIsLoading(true);
    // 日数計算
    const diff = startDate && endDate
      ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1;

    generateItinerary.mutate({
      startPoint,
      endPoint,
      startDate: startDate ? `${startDate.getMonth() + 1}/${startDate.getDate()}` : null,
      endDate: endDate ? `${endDate.getMonth() + 1}/${endDate.getDate()}` : null,
      numDays: diff,
      mustVisit,
      niceToVisit,
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
    setCopied(false);
    markdownTableRef.current = "";
  };

  const handleCopyItinerary = useCallback(async () => {
    const text = markdownTableRef.current;
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
    <div className="min-h-screen" style={{ background: "#FAF7F0", fontFamily: "'Noto Sans JP', sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(250,247,240,0.97)",
          backdropFilter: "blur(12px)",
          borderColor: "#E8D5A3",
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
              style={{ fontFamily: "'Playfair Display', serif", color: "#C4622D" }}
            >
              スリランカ旅程提案チェッカー
            </h1>
            <p className="text-xs" style={{ color: "#8B6B4A" }}>
              Sri Lanka Trip Planner
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs hidden sm:flex"
              style={{ borderColor: "#C4622D", color: "#C4622D" }}
            >
              距離データ準拠
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Layout: Left form (sticky) + Right scrollable content */}
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row">
        {/* Left: Form Panel (sticky on desktop) */}
        <div
          className="lg:w-[420px] xl:w-[460px] flex-shrink-0"
          style={{ borderRight: "1px solid #E8D5A3" }}
        >
          <div
            className="lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-60px)] lg:overflow-y-auto"
          >
            <div className="p-5 space-y-5">
              {/* Hero text */}
              <div
                className="rounded-xl p-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #C4622D 0%, #A0522D 100%)",
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
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8B6B4A" }}>
                      出発地（Start Point）
                    </label>
                    <LocationSelect
                      value={startPoint}
                      onChange={setStartPoint}
                      placeholder="出発地を選択"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8B6B4A" }}>
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
                  color="#C4622D"
                  placeholder="必須スポットを追加"
                />
              </FormSection>

              {/* Nice to Visit */}
              <FormSection icon={<Star size={16} />} title="できたら行きたい場所">
                <SpotSelector
                  selected={niceToVisit}
                  onChange={setNiceToVisit}
                  exclude={[startPoint, endPoint, ...mustVisit]}
                  color="#2D5A27"
                  placeholder="希望スポットを追加"
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
                  background: "linear-gradient(135deg, #C4622D 0%, #A0522D 100%)",
                  color: "white",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(196,98,45,0.3)",
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
                  style={{ borderColor: "#E8D5A3", color: "#8B6B4A" }}
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
          {/* Map - fixed height */}
          <div
            style={{
              height: "70vh",
              minHeight: "500px",
              width: "100%",
              position: "relative",
              borderBottom: "2px solid #E8D5A3",
            }}
          >
            <TripMap routeLocations={routeLocations} warningMode={isJudgmentB && showResult} />
          </div>

          {/* Result Area - below map */}
          {showResult && result ? (
            <div
              className="flex-1 p-6"
              style={{ background: "#FAF7F0" }}
            >
              {/* Result Header */}
              <div
                className="flex items-center justify-between mb-5 pb-3"
                style={{ borderBottom: "2px solid #E8D5A3" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ background: "#C4622D" }}
                  />
                  <h3
                    className="text-xl font-bold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#C4622D" }}
                  >
                    旅程提案結果
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  style={{ color: "#8B6B4A", fontSize: "12px" }}
                >
                  リセット
                </Button>
              </div>

              {/* Markdown Result */}
              <div
                className="prose prose-sm max-w-none"
                style={{
                  "--tw-prose-body": "#3D2B1F",
                  "--tw-prose-headings": "#C4622D",
                  "--tw-prose-links": "#C4622D",
                  "--tw-prose-bold": "#3D2B1F",
                  "--tw-prose-tables": "#3D2B1F",
                  "--tw-prose-th-borders": "#E8D5A3",
                  "--tw-prose-td-borders": "#E8D5A3",
                } as React.CSSProperties}
              >
                <Streamdown>{result}</Streamdown>
              </div>

              {/* Alternative Plans - rendered as rich cards */}
              {itineraryResult?.alternatives && itineraryResult.alternatives.length > 0 && (
                <AlternativePlansSection
                  alternatives={itineraryResult.alternatives}
                  startPoint={startPoint}
                  endPoint={endPoint}
                />
              )}

              {/* コピー＆問い合わせボタン（B判定以外：元プランの下） */}
              {!isJudgmentB && (
                <ContactSection
                  onCopy={handleCopyItinerary}
                  copied={copied}
                />
              )}

              {/* コピー＆問い合わせボタン（B判定：代替案の下） */}
              {isJudgmentB && itineraryResult?.alternatives && itineraryResult.alternatives.length > 0 && (
                <ContactSection
                  onCopy={handleCopyItinerary}
                  copied={copied}
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
                style={{ background: "#F0E8D8" }}
              >
                <MapPin size={28} style={{ color: "#C4622D" }} />
              </div>
              <p
                className="text-base font-medium mb-2"
                style={{ color: "#8B6B4A", fontFamily: "'Playfair Display', serif" }}
              >
                旅程を入力して生成してください
              </p>
              <p className="text-sm" style={{ color: "#A8896B" }}>
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
        border: "1px solid #E8D5A3",
        boxShadow: "0 1px 4px rgba(196,98,45,0.06)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "#C4622D" }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>
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
          borderColor: "#E8D5A3",
          background: "#FAF7F0",
          color: value ? "#3D2B1F" : "#A8896B",
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {LOCATIONS.map((loc) => (
          <SelectItem key={loc.id} value={loc.label}>
            <span className="flex items-center gap-2">
              <MapPin size={12} style={{ color: "#C4622D" }} />
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
}: {
  alternatives: AlternativePlan[];
  startPoint: string;
  endPoint: string;
}) {
  return (
    <div className="mt-8">
      <div
        className="flex items-center gap-2 mb-5 pb-3"
        style={{ borderBottom: "2px solid #E8D5A3" }}
      >
        <div className="w-1 h-6 rounded-full" style={{ background: "#2D5A27" }} />
        <h3
          className="text-xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: "#2D5A27" }}
        >
          代替案のご提案
        </h3>
      </div>
      <div className="space-y-6">
        {alternatives.map((alt, idx) => (
          <AlternativePlanCard key={idx} alt={alt} index={idx + 1} startPoint={startPoint} endPoint={endPoint} />
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
}: {
  alt: AlternativePlan;
  index: number;
  startPoint: string;
  endPoint: string;
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
    { bg: "#EFF6EE", border: "#2D5A27", accent: "#2D5A27", badge: "#D4EDD0" },
    { bg: "#FFF8F0", border: "#C4622D", accent: "#C4622D", badge: "#FFE8D4" },
    { bg: "#EFF4FF", border: "#2D4FA3", accent: "#2D4FA3", badge: "#D0DCFF" },
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
          style={{ border: "1px solid #E8D5A3", height: "280px" }}
        >
          <TripMap routeLocations={altRoute} compact />
        </div>

        {/* Distance Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #E8D5A3" }}
        >
          <div
            className="px-4 py-2 text-xs font-semibold"
            style={{ background: "#E8D5A3", color: "#3D2B1F" }}
          >
            距離・時間表
          </div>
          <div
            className="p-4 prose prose-sm max-w-none"
            style={{
              background: "white",
              "--tw-prose-body": "#3D2B1F",
              "--tw-prose-headings": c.accent,
              "--tw-prose-th-borders": "#E8D5A3",
              "--tw-prose-td-borders": "#E8D5A3",
            } as React.CSSProperties}
          >
            <Streamdown>{alt.markdownTable}</Streamdown>
          </div>
        </div>
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
      <p className="text-xs leading-relaxed" style={{ color: "#3D2B1F" }}>
        {text}
      </p>
    </div>
  );
}

// ===== Contact Section =====

function ContactSection({
  onCopy,
  copied,
}: {
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="mt-8 rounded-2xl p-6 space-y-4"
      style={{
        background: "white",
        border: "1px solid #E8D5A3",
        boxShadow: "0 2px 8px rgba(196,98,45,0.08)",
      }}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* コピーボタン */}
        <button
          onClick={onCopy}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.97]"
          style={{
            background: copied ? "#2D5A27" : "#FAF7F0",
            border: `2px solid ${copied ? "#2D5A27" : "#C4622D"}`,
            color: copied ? "white" : "#C4622D",
          }}
        >
          {copied ? (
            <><Check size={16} />コピーしました</>
          ) : (
            <><Copy size={16} />この旅程をコピー</>
          )}
        </button>
        {/* 問い合わせボタン */}
        <button
          onClick={() => {
            // TODO: 問い合わせ遷移先を設定
          }}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #C4622D 0%, #A0522D 100%)",
            border: "none",
            color: "white",
            boxShadow: "0 4px 12px rgba(196,98,45,0.3)",
          }}
        >
          <MessageCircle size={16} />
          この旅程をコピーして問い合わせへ
        </button>
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "#8B6B4A" }}
      >
        ※この結果は不完全な場合もあります。詳細と金額についてはお問い合わせ後にご案内させていただきます。
      </p>
    </div>
  );
}
