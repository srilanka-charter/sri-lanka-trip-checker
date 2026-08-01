import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// gpt-5はBUILT_IN_FORGE_API_URL経由で動作する（api.manus.imは外部トークン不可）
async function callGpt5(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiBase = (process.env.BUILT_IN_FORGE_API_URL ?? "https://forge.manus.ai").replace(/\/$/, "");
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";

  const res = await fetch(`${apiBase}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`gpt-5 API error: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`gpt-5 response missing content: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return content;
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

【ルール】
1. 出発地・終着地は必ず指定された場所にすること
2. 必須スポットは必ず全て含めること
3. 希望スポットは距離・時間の余裕があれば含めること
4. 1日の走行距離の目安は最大300km前後
5. コロンボ/空港/ネゴンボ以外の場所から出発する場合は、前日にコロンボから迎車が必要（0日目として追加）
6. コロンボ/空港/ネゴンボ以外の場所に終着する場合は、翌日コロンボへの回送が必要（最終日+1として追加）
7. コロンボから出発してシーギリヤとキャンディ両方を訪れる場合は、シーギリヤを先にすること
8. 1日の走行時間が6時間を超える日がある場合、または総距離が日数×150kmを大幅に超える場合は、代替案を提案すること
9. 距離・時間は必ず下記の実測データを使用すること（推測しないこと）

${DISTANCE_DATA_FOR_PROMPT}

【代替案について】
- 1日の走行時間が6時間を超える日がある場合、または総距離が日数×150kmを大幅に超える場合のみ、alternativesを生成すること
- 問題がない場合はalternativesは空配列にすること
- 代替案は最大2つまで
- 各代替案は「スポットを1つ削減」「宿泊地を変更」「順序を変更」などの具体的な調整を提案すること

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
  "specialNotes": ["特記事項"],
  "route": ["コロンボ", "シーギリヤ", "キャンディ", "コロンボ"],
  "alternatives": [
    {
      "adjustment": "調整内容の説明",
      "merit": "この代替案のメリット",
      "caution": "注意点",
      "markdownTable": "| 日付 | 主な区間 | 距離 | 走行時間の目安 |\n| --- | --- | ---: | --- |\n| 1日目 | コロンボ → キャンディ | 120km | 3時間 |"
    }
  ]
}

routeは地図描画用の正規地名リスト（出発地→経由地→終着地の順）。isPickupは迎車日、isReturnは回送日、isStayは宿泊のみの日。alternativesは問題がある場合のみ生成し、問題がない場合は空配列。上記のキー以外は絶対に追加しないこと。`;

        const userPrompt = `以下の条件で旅程を生成してください。

- 旅行期間: ${dateRangeText}
- 出発地: ${startPoint}
- 終着地: ${endPoint}
- 必須スポット: ${mustVisitText}
- 希望スポット: ${niceToVisitText}`;

        const rawContent = await callGpt5(systemPrompt, userPrompt);
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
          }>;
        };

        try {
          // マークダウンコードブロックを除去してからパース
          const cleanContent = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
          parsed = JSON.parse(cleanContent);
        } catch {
          throw new Error("AI旅程生成のJSON解析に失敗しました");
        }

        // markdownTableを生成
        let markdownTable = "| 日付 | 主な区間（迎車・回送含む） | 距離 | 走行時間の目安 |\n";
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

          return {
            days: parsed.days,
            totalDistance: parsed.totalDistance,
            totalDays: parsed.days.length,
            specialNotes: parsed.specialNotes,
            route: parsed.route,
            alternatives: parsed.alternatives ?? [],
            markdownTable,
          };
      }),

  }),
});

export type AppRouter = typeof appRouter;
