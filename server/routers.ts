import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Anthropic Claude Opus 4 を使用する
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaudeOpus4(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 16000,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt },
    ],
  });
  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error(`Claude Opus 4 response missing text: ${JSON.stringify(response).slice(0, 300)}`);
  }
  return block.text;
}

// スリランカ距離データ（プロンプト用）
const DISTANCE_DATA_FOR_PROMPT = `
【スリランカ地点間の距離・所要時間データ】
（双方向同一。コロンボ=バンダラナイケ国際空港=ネゴンボ）
コロンボ→アヌラーダプラ: 195km / 4.5h
コロンボ→シーギリヤ: 190km / 3.5h
コロンボ→ポロンナルワ: 230km / 4.5h
コロンボ→キャンディ: 120km / 3.0h
コロンボ→ヌワラエリヤ: 170km / 5.0h
コロンボ→アンブルワワタワー: 120km / 3.5h
コロンボ→ハットン: 120km / 4.0h
コロンボ→ホートンプレインズ: 180km / 5.5h
コロンボ→アダムスピーク: 140km / 4.5h
コロンボ→バンダラウェラ: 210km / 6.0h
コロンボ→ゴール: 130km / 2.5h
コロンボ→ベントータ: 80km / 2.0h
コロンボ→ヒッカドゥワ: 100km / 2.5h
コロンボ→ミリッサ: 160km / 2.5h
コロンボ→ウダワラウェ国立公園: 250km / 4.0h
コロンボ→エッラ: 310km / 5.0h
コロンボ→ヤーラ国立公園: 270km / 4.0h
コロンボ→トリンコマリー: 270km / 6.0h
コロンボ→ウィルパトゥ国立公園: 190km / 4.0h
アヌラーダプラ→ウィルパトゥ国立公園: 50km / 1.0h
アヌラーダプラ→シーギリヤ: 80km / 1.5h
アヌラーダプラ→ポロンナルワ: 110km / 2.5h
アヌラーダプラ→キャンディ: 150km / 3.5h
アヌラーダプラ→トリンコマリー: 110km / 2.5h
ポロンナルワ→シーギリヤ: 60km / 1.5h
ポロンナルワ→キャンディ: 140km / 3.5h
ポロンナルワ→ヌワラエリヤ: 210km / 5.0h
ポロンナルワ→エッラ: 190km / 4.5h
ポロンナルワ→ヤーラ国立公園: 260km / 5.5h
ポロンナルワ→トリンコマリー: 130km / 3.0h
シーギリヤ→キャンディ: 90km / 2.5h
シーギリヤ→ヌワラエリヤ: 170km / 5.0h
シーギリヤ→エッラ: 180km / 4.5h
シーギリヤ→ヤーラ国立公園: 300km / 6.0h
シーギリヤ→バンダラウェラ: 200km / 5.0h
シーギリヤ→ゴール: 280km / 5.0h
シーギリヤ→トリンコマリー: 100km / 2.0h
シーギリヤ→ミリッサ: 330km / 6.0h
キャンディ→ヌワラエリヤ: 80km / 3.0h
キャンディ→ハットン: 70km / 3.0h
キャンディ→エッラ: 140km / 4.0h
キャンディ→バンダラウェラ: 150km / 4.5h
キャンディ→アンブルワワタワー: 30km / 1.5h
キャンディ→ヤーラ国立公園: 250km / 6.0h
キャンディ→ウダワラウェ国立公園: 230km / 6.0h
キャンディ→ゴール: 230km / 5.0h
キャンディ→ホートンプレインズ: 100km / 4.0h
キャンディ→アダムスピーク: 90km / 3.5h
キャンディ→ミリッサ: 250km / 5.5h
キャンディ→トリンコマリー: 200km / 5.0h
ヌワラエリヤ→アダムスピーク: 70km / 3.0h
ヌワラエリヤ→ホートンプレインズ: 30km / 1.5h
ヌワラエリヤ→バンダラウェラ: 50km / 2.0h
ヌワラエリヤ→エッラ: 60km / 2.0h
ヌワラエリヤ→ハットン: 40km / 1.5h
ヌワラエリヤ→ウダワラウェ国立公園: 150km / 4.0h
ヌワラエリヤ→ヤーラ国立公園: 170km / 4.5h
ヌワラエリヤ→ゴール: 260km / 5.5h
ヌワラエリヤ→ミリッサ: 240km / 5.5h
エッラ→バンダラウェラ: 20km / 1.0h
エッラ→ヤーラ国立公園: 130km / 3.5h
エッラ→ゴール: 200km / 3.5h
エッラ→ウダワラウェ国立公園: 100km / 2.5h
エッラ→ミリッサ: 180km / 3.5h
エッラ→ホートンプレインズ: 50km / 2.0h
ヤーラ国立公園→ミリッサ: 130km / 2.5h
ヤーラ国立公園→ゴール: 150km / 2.5h
ヤーラ国立公園→トリンコマリー: 280km / 6.0h
ヤーラ国立公園→アルガムベイ: 110km / 2.5h
ウダワラウェ国立公園→ゴール: 140km / 2.5h
ウダワラウェ国立公園→ミリッサ: 120km / 2.0h
ゴール→ヒッカドゥワ: 20km / 1.0h
ゴール→ミリッサ: 50km / 1.0h
ゴール→ベントータ: 60km / 1.5h
ゴール→ウェリガマ: 30km / 1.0h
ゴール→アルガムベイ: 290km / 5.5h
`;

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // AI旅程分析エンドポイント
  ai: router({
    generateItinerary: publicProcedure
      .input(
        z.object({
          startPoint: z.string(),
          endPoint: z.string(),
          startDate: z.string().nullable(),
          endDate: z.string().nullable(),
          numDays: z.number(),
          mustVisit: z.array(z.string()),
          niceToVisit: z.array(z.string()),
        })
      )
      .mutation(async ({ input }) => {
        const { startPoint, endPoint, startDate, endDate, numDays, mustVisit, niceToVisit } = input;

        const mustVisitText = mustVisit.length > 0 ? mustVisit.join("、") : "なし";
        const niceToVisitText = niceToVisit.length > 0 ? niceToVisit.join("、") : "なし";
        const dateRangeText = startDate && endDate ? `${startDate}〜${endDate}（${numDays}日間）` : `${numDays}日間`;

        const systemPrompt = `あなたはスリランカ専門のドライバーガイド会社のシステムです。必ずjson形式のみで返答してください。
以下のルールに厳密に従い、日本語で旅程を生成してください。

【距離・時間計算】
- 距離・時間は下記の実測データのみを根拠にし、推測で作らない。
- 起点と終点が逆でも同一距離・同一時間。
- 表にない区間は既知区間の足し合わせで算出し、総距離最短を優先。同距離なら総時間が短い方。
- 空港／ネゴンボ＝コロンボ、シーギリヤ地域＝シーギリヤ、ティッサマハーラーマ＝ヤーラ国立公園。
- シーギリヤ〜ミリッサはシーギリヤ〜ゴール＋ゴール〜ミリッサで算出。
- 迎車（拠点→開始場所）と回送（解散地点→拠点）を必ず含める。
- 開始場所がコロンボ／ネゴンボ／空港以外なら拠点→開始場所の迎車を入れる。解散地点が拠点以外なら最終日に解散地点→拠点の回送を入れる。
- 都市間移動がない滞在日は30〜50km、約1〜2時間で扱い、0kmにしない。
- 鉄道移動中に専属ドライバーが荷物を目的地側へ移動する場合、その距離と時間を当日に含める。
- 距離表は必ず以下の4列Markdown表で出す（markdownTableフィールドに格納）：
  | 日付 | 主な区間（迎車・回送含む） | 距離 | 走行時間の目安 |
  - 開始日がある場合は「4/10」のような日付表示。開始日不明時のみ「1日目」。
  - 距離は「170km」、時間は「約4時間」「約1〜2時間」形式。
  - 表の直後に「総走行距離の目安：〇〇km前後」を入れる。
  - 「※実際の距離・時間は、当日の交通状況や立ち寄り内容により前後します。」を末尾に入れる。
  - 代替案を出す場合は案ごとに距離表と総走行距離を出す。

${DISTANCE_DATA_FOR_PROMPT}

【特例処理】
A/B判定より先に、初日特例・最終日特例・長時間拘束特例を処理する。特例発火時は各+1日し、複数発火時は合算。表示日数、料金参照日数、プラン判定日数を一致させる。
- 初日特例：開始場所がエッラ／ヌワラエリヤ／ヤーラ国立公園／アルガムベイ等の長距離地点で、同日に観光または都市間移動を含む場合。特にエッラ開始後に同日ヌワラエリヤ方面へ進む場合は必ず発火。本文案内は「初日の合流を安全に行うため、前日移動を含む前提で概算しております。」距離表の先頭を「前日移動：拠点→開始場所」とし、初日に迎車を重複させない。
- 最終日特例：最終日が拠点以外での解散で、最終日の旅程＋回送が300km超の場合のみ発火。本文案内は「回送が長距離となるため、1日分追加した前提で概算しております。」
- 長時間拘束特例：深夜帯出発、初日の観光立ち寄り＋都市間移動、翌日夜到着の3条件を満たす場合。本文案内は「深夜帯から翌日夜まで拘束が長くなるため、安全確保の観点から1日分追加した前提で概算しております。」

【A/B判定・代替案】
- A：1日の走行距離300km超、または走行時間6時間超の場合。ただし、距離300km超でも走行時間6時間以内なら原則可。距離300km以内でも走行時間6時間超なら分散提案を優先する。
- B：総距離が広域グランドの距離枠を超える場合。そのままではご案内が難しいと明確にし、必ず代替案2案。
- A/Bの判定数値は本文に出さない。
- A/B説明文は実際に該当する場合のみ使う。
- 代替案ごとに特例、A/B判定、日数、距離、プラン、料金を再計算し、元案の判定を引き継がない。
- A判定文：「ご希望の行程をベースにご案内自体は可能です。ただし、一部の日で移動時間が長くなりやすく、観光時間やお身体への負担が出やすい内容です。そのため、より無理なく回りやすい代替案を2案あわせてご提案いたします。」
- B判定文：「ご希望の行程は移動範囲がかなり広く、このままの内容ではご案内が難しい状況です。安全面と観光時間を確保しやすくするため、行程を調整した代替案を2案ご提案いたします。」
- 原案成立＋改善提案文：「ご希望の行程をベースにご案内可能です。一方で、移動の流れを少し整えると、観光時間をより確保しやすくなります。参考として、より無理の少ない代替案もあわせてご提案いたします。」
- 代替案は必ず以下の2案構成で出す。各案3〜5行以内。理由を繰り返さない。
  代替案1：日数はそのまま維持し、立ち寄りスポットを削減・順序を最適化して1日あたりの移動負担を軽減したプラン。調整内容／メリット／注意点を記載。
  代替案2：日数を1日延長し、移動を分散させてより余裕のある旅程にしたプラン。調整内容／メリット／注意点を記載。

【総距離上限】
近郊プレミアム：2日450km、3日540km、4日648km、5日720km、6日810km、7日945km、8日1080km、9日1215km、10日1350km、11日1485km、12日1620km、13日1755km、14日1890km、15日2025km。
広域グランド：1日270km、2日540km、3日594km、4日792km、5日900km、6日972km、7日1008km、8日1080km、9日1215km、10日1350km、11日1485km、12日1620km、13日1755km、14日1890km、15日2025km。
近郊内→近郊プレミアム。近郊超〜広域内→広域グランド。広域超→B。

【プラン判定】
- 対象行程が近郊プレミアムか広域グランドかを短く明記。内部の距離上限や判定数値は本文に出さない。
- 原案と代替案でプランが変わる場合は案ごとに別々に書く。
- Bの場合は原案のプラン名を無理に確定せず「このままではご案内が難しい」としたうえで代替案側を判定。

【出力形式】必ず以下のJSON形式のみで返すこと。他のキーを追加しないこと。マークダウンコードブロックなし。
{
  "days": [
    {
      "date": "日付ラベル（例: 7/15 または 1日目）",
      "segments": "移動区間（例: コロンボ → シーギリヤ）",
      "distance": 190,
      "time": 3.5,
      "notes": ["特記事項があれば"],
      "isPickup": false,
      "isReturn": false,
      "isStay": false
    }
  ],
  "totalDistance": 500,
  "specialNotes": ["特記事項（特例発火時の案内文など）"],
  "route": ["コロンボ", "シーギリヤ", "キャンディ", "コロンボ"],
  "judgment": "OK",
  "planName": "近郊プレミアム",
  "judgmentMessage": "ご希望の行程をベースにご案内可能です。",
  "markdownTable": "| 日付 | 主な区間（迎車・回送含む） | 距離 | 走行時間の目安 |\n| --- | --- | ---: | --- |\n| 7/15 | コロンボ → シーギリヤ | 190km | 約4時間 |\n\n総走行距離の目安：500km前後\n\n※実際の距離・時間は、当日の交通状況や立ち寄り内容により前後します。",
  "alternatives": [
    {
      "adjustment": "調整内容の説明",
      "merit": "この代替案のメリット",
      "caution": "注意点",
      "planName": "近郊プレミアム",
      "markdownTable": "| 日付 | 主な区間（迎車・回送含む） | 距離 | 走行時間の目安 |\n| --- | --- | ---: | --- |\n| 7/15 | コロンボ → キャンディ | 120km | 約3時間 |\n\n総走行距離の目安：400km前後\n\n※実際の距離・時間は、当日の交通状況や立ち寄り内容により前後します。",
      "route": ["コロンボ", "キャンディ", "コロンボ"]
    }
  ]
}

フィールド説明：
- routeは地図描画用の正規地名リスト。必ず出発地を先頭に、終着地を末尾に含めること。例：出発地がバンダラナイケ国際空港の場合は「コロンボ」、ネゴンボの場合も「コロンボ」として先頭に入れる。中間の経由地はすべて含める（出発地→経由地1→経由地2→…→終着地の順）
- isPickupは迎車日、isReturnは回送日、isStayは宿泊のみの日
- judgmentは「OK」「A」「B」のいずれか
- planNameは「近郊プレミアム」「広域グランド」のいずれか（B判定の原案は「-」）
- judgmentMessageは判定に応じた説明文（A判定文・B判定文・原案成立＋改善提案文・または空文字）
- markdownTableは原案の4列距離表（総走行距離・注釈含む）
- alternativesはA/B判定時のみ生成（最大2つ）、問題がない場合は空配列。各alternativeには必ずrouteフィールドを含めること（地図描画用の正規地名リスト、出発地→経由地→終着地の順）
- 上記のキー以外は絶対に追加しないこと`;

        const userPrompt = `以下の条件で旅程を生成してください。

- 旅行期間: ${dateRangeText}
- 出発地: ${startPoint}
- 終着地: ${endPoint}
- 必須スポット: ${mustVisitText}
- 希望スポット: ${niceToVisitText}`;

        const rawContent = await callClaudeOpus4(systemPrompt, userPrompt);
        const content = rawContent;

        let parsed: {
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
          specialNotes: string[];
          route: string[];
        alternatives: Array<{
          adjustment: string;
          merit: string;
          caution: string;
          markdownTable: string;
          route?: string[];
        }>;
          judgment?: string;
          planName?: string;
          judgmentMessage?: string;
          markdownTable?: string;
        };

        try {
          // マークダウンコードブロックを除去してからパース
          const cleanContent = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
          parsed = JSON.parse(cleanContent);
        } catch {
          throw new Error("AI旅程生成のJSON解析に失敗しました");
        }

        // AIが生成したmarkdownTableをそのまま使う（なければフォールバック生成）
        let markdownTable = parsed.markdownTable ?? "";
        if (!markdownTable) {
          markdownTable = "| 日付 | 主な区間（迎車・回送含む） | 距離 | 走行時間の目安 |\n";
          markdownTable += "| --- | --- | ---: | --- |\n";
          for (const day of parsed.days) {
            const distStr = day.isStay ? "約30〜50km" : `${day.distance}km`;
            const h = Math.floor(day.time);
            const m = Math.round((day.time - h) * 60);
            const timeStr = day.isStay ? "約1〜2時間" : (m > 0 ? `${h}時間${m}分` : `${h}時間`);
            markdownTable += `| ${day.date} | ${day.segments} | ${distStr} | ${timeStr} |\n`;
          }
          markdownTable += `\n総走行距離の目安：${parsed.totalDistance}km前後\n\n`;
          markdownTable += "※実際の距離・時間は、当日の交通状況や立ち寄り内容により前後します。";
        }

          return {
            days: parsed.days,
            totalDistance: parsed.totalDistance,
            totalDays: parsed.days.length,
            specialNotes: parsed.specialNotes,
            route: parsed.route,
            judgment: parsed.judgment ?? "OK",
            planName: parsed.planName ?? "",
            judgmentMessage: parsed.judgmentMessage ?? "",
            alternatives: parsed.alternatives ?? [],
            markdownTable,
          };
      }),

  }),
});

export type AppRouter = typeof appRouter;
