import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

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
    analyzeItinerary: publicProcedure
      .input(
        z.object({
          startPoint: z.string(),
          endPoint: z.string(),
          startDate: z.string().nullable(),
          endDate: z.string().nullable(),
          mustVisit: z.array(z.string()),
          niceToVisit: z.array(z.string()),
          markdownTable: z.string(),
          totalDistance: z.number(),
          totalDays: z.number(),
          judgment: z.enum(["OK", "A", "B"]),
          specialNotes: z.array(z.string()),
        })
      )
      .mutation(async ({ input }) => {
        const {
          startPoint,
          endPoint,
          startDate,
          endDate,
          mustVisit,
          niceToVisit,
          markdownTable,
          totalDistance,
          totalDays,
          judgment,
          specialNotes,
        } = input;

        const dateRange = startDate && endDate
          ? `${startDate} 〜 ${endDate}`
          : `${totalDays}日間`;

        const mustVisitText = mustVisit.length > 0
          ? mustVisit.join("、")
          : "なし";

        const niceToVisitText = niceToVisit.length > 0
          ? niceToVisit.join("、")
          : "なし";

        const judgmentLabel =
          judgment === "OK" ? "問題なし" :
          judgment === "A" ? "一部移動が長め（A判定）" :
          "移動範囲超過（B判定）";

        const specialNotesText = specialNotes.length > 0
          ? specialNotes.join("\n")
          : "なし";

        const systemPrompt = `あなたはスリランカ専門の旅行コンシェルジュです。
スリランカの道路事情・観光スポット・季節・文化に精通しており、旅行者に対して親切で実用的なアドバイスを提供します。
以下の旅程データをもとに、旅行者へのアドバイスと改善提案を日本語で提供してください。

【回答形式】
1. **旅程の総評**（2〜3文）
2. **各日程のポイント**（各日について1〜2文のコメント）
3. **スリランカ旅行のアドバイス**（道路状況、天候、文化的注意点など、3〜5項目）
4. **改善提案**（もし改善できる点があれば、具体的に2〜3点）

回答は具体的で実用的な内容にしてください。一般論ではなく、この旅程に特化したアドバイスをお願いします。`;

        const userPrompt = `以下の旅程を分析してください。

【旅程概要】
- 旅行期間: ${dateRange}（${totalDays}日間）
- 出発地: ${startPoint}
- 終着地: ${endPoint}
- 必須スポット: ${mustVisitText}
- 希望スポット: ${niceToVisitText}
- 総走行距離: ${totalDistance}km
- 判定: ${judgmentLabel}
- 特記事項: ${specialNotesText}

【1日ごとの旅程表】
${markdownTable}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: "gpt-4o",
          max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content;
        if (typeof content !== "string") {
          throw new Error("AI分析の応答が不正です");
        }

        return { analysis: content };
      }),
  }),
});

export type AppRouter = typeof appRouter;
