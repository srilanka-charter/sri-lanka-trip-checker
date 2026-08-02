/**
 * SpotSelector Component - Redesigned
 * - 初期2行のプルダウン表示
 * - 「追加する＋」ボタンで行を追加
 * - 固定プルダウン選択肢（スリランカ主要スポット）
 * - 「その他」選択時はテキスト入力欄を表示
 * Design: Tropical Cartography
 */

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SPOT_OPTIONS = [
  "シーギリヤ・ロック",
  "ダンブッラ石窟寺院",
  "キャンディ（仏歯寺）",
  "ヌワラエリヤ",
  "エラ",
  "ヤーラ国立公園",
  "ゴール・フォート（ゴール旧市街）",
  "ミリッサ",
  "ポロンナルワ遺跡",
  "アヌラーダプラ遺跡",
  "その他",
];

interface SpotRow {
  id: number;
  selected: string; // "" = 未選択, "その他" = フリーテキスト, それ以外 = 確定値
  customText: string; // "その他" 選択時のフリーテキスト
}

interface SpotSelectorProps {
  selected: string[];
  onChange: (spots: string[]) => void;
  exclude: string[];
  color: string;
  placeholder: string;
}

let nextId = 1;

function makeRow(): SpotRow {
  return { id: nextId++, selected: "", customText: "" };
}

export default function SpotSelector({
  selected,
  onChange,
  exclude,
  color,
}: SpotSelectorProps) {
  const [rows, setRows] = useState<SpotRow[]>([makeRow(), makeRow()]);

  // rowsからselectedを再計算してonChangeを呼ぶ
  const syncToParent = (newRows: SpotRow[]) => {
    const values = newRows
      .map((r) => {
        if (r.selected === "その他") return r.customText.trim();
        return r.selected;
      })
      .filter((v) => v !== "");
    // 重複除去
    const unique = values.filter((v, i) => values.indexOf(v) === i);
    onChange(unique);
  };

  const handleSelectChange = (rowId: number, value: string) => {
    const newRows = rows.map((r) =>
      r.id === rowId ? { ...r, selected: value, customText: "" } : r
    );
    setRows(newRows);
    syncToParent(newRows);
  };

  const handleCustomTextChange = (rowId: number, text: string) => {
    const newRows = rows.map((r) =>
      r.id === rowId ? { ...r, customText: text } : r
    );
    setRows(newRows);
    syncToParent(newRows);
  };

  const handleRemoveRow = (rowId: number) => {
    const newRows = rows.filter((r) => r.id !== rowId);
    setRows(newRows);
    syncToParent(newRows);
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  // 既に選択済みの値（その行以外）とexcludeを合わせた除外リスト
  const getExcluded = (rowId: number) => {
    const otherSelected = rows
      .filter((r) => r.id !== rowId && r.selected !== "" && r.selected !== "その他")
      .map((r) => r.selected);
    return [...exclude, ...otherSelected];
  };

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => {
        const excluded = getExcluded(row.id);
        const availableOptions = SPOT_OPTIONS.filter(
          (opt) => opt === "その他" || !excluded.includes(opt)
        );

        return (
          <div key={row.id} className="space-y-1.5">
            <div className="flex gap-2 items-center">
              {/* 番号 */}
              <span
                className="text-xs font-bold w-5 text-center shrink-0"
                style={{ color }}
              >
                {idx + 1}
              </span>

              {/* プルダウン */}
              <Select
                value={row.selected}
                onValueChange={(v) => handleSelectChange(row.id, v)}
              >
                <SelectTrigger
                  className="flex-1 h-9 text-sm"
                  style={{
                    borderColor: `${color}40`,
                    background: `${color}08`,
                    color: row.selected ? "#3D2B1F" : "#A8896B",
                  }}
                >
                  <SelectValue placeholder="スポットを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 削除ボタン（2行以上のとき表示） */}
              {rows.length > 2 && (
                <button
                  onClick={() => handleRemoveRow(row.id)}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                  style={{ color: "#A8896B" }}
                  aria-label="削除"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* その他テキスト入力 */}
            {row.selected === "その他" && (
              <div className="ml-7">
                <Input
                  value={row.customText}
                  onChange={(e) => handleCustomTextChange(row.id, e.target.value)}
                  placeholder="スポット名を入力してください"
                  className="h-9 text-sm"
                  style={{
                    borderColor: `${color}40`,
                    background: `${color}08`,
                    color: "#3D2B1F",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* 追加ボタン */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="h-8 text-xs px-3 mt-1"
        style={{
          borderColor: `${color}50`,
          color: color,
          background: "transparent",
        }}
      >
        <Plus size={12} className="mr-1" />
        追加する
      </Button>
    </div>
  );
}
