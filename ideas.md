# スリランカ旅程提案チェッカー デザイン方針

## 3つのアプローチ案

### アプローチ1: Tropical Cartography（選択）
スリランカの地図・旅行・自然をテーマにした、地図帳・旅行雑誌的なデザイン。温かみのある砂色・テラコッタ・深緑を基調に、手書き風の地図要素とセリフ体フォントで旅情を演出。確率: 0.07

### アプローチ2: Clean Dashboard
ホワイト基調のシンプルなダッシュボード。確率: 0.02

### アプローチ3: Dark Explorer
ダークモードのエクスプローラー風。確率: 0.01

---

## 選択: Tropical Cartography

### Design Movement
Vintage Travel Cartography × Modern Functional UI

### Core Principles
1. 地図帳・旅行雑誌の温かみと機能的なUIの融合
2. スリランカの自然色（緑・テラコッタ・砂・海）を基調
3. 情報密度を高めつつ、視覚的な余白で読みやすさを確保
4. 地図が主役、フォームは脇役として設計

### Color Philosophy
- Primary: テラコッタ #C4622D（スリランカの赤土・シーギリヤ岩）
- Secondary: 深緑 #2D5A27（茶畑・ジャングル）
- Accent: 砂色 #E8D5A3（ビーチ・古地図）
- Background: クリーム #FAF7F0（古い紙）
- Text: ダークブラウン #3D2B1F

### Layout Paradigm
左側にフォームパネル（スクロール可能）、右側に地図（固定）という2カラムレイアウト。モバイルでは上下に切り替え。

### Signature Elements
1. 地図上のルートライン（アニメーション付き）
2. 各スポットにピン（テラコッタ色）
3. 旅程表はカード形式で日付ごとに展開

### Typography System
- Display: Playfair Display（セリフ体、見出し）
- Body: Noto Sans JP（本文・UI）
- Accent: Lora（副見出し）

### Brand Essence
「スリランカ旅行を、もっとスマートに計画する」— 旅行会社スタッフ向けの実用ツール

### Signature Brand Color
テラコッタ #C4622D

## Style Decisions
- フォームはカード形式でセクションを分割
- 地図は全高固定でスクロールしない
- 旅程表はMarkdown形式でレンダリング
- A/B判定の警告はオレンジ/赤のバナーで表示
