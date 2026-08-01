/**
 * SpotSelector Component
 * Free-text input for spots (must-visit / nice-to-visit)
 * Accepts any text; normalizeLocation maps known sightseeing names to nearby hubs
 * Design: Tropical Cartography
 */

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SpotSelectorProps {
  selected: string[];
  onChange: (spots: string[]) => void;
  exclude: string[];
  color: string;
  placeholder: string;
}

export default function SpotSelector({
  selected,
  onChange,
  exclude: _exclude,
  color,
  placeholder,
}: SpotSelectorProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (selected.includes(trimmed)) {
      setInputValue("");
      return;
    }
    onChange([...selected, trimmed]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (label: string) => {
    onChange(selected.filter((s) => s !== label));
  };

  return (
    <div className="space-y-2">
      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((spot, i) => (
            <Badge
              key={spot + i}
              className="text-xs py-1 px-2 flex items-center gap-1 cursor-default"
              style={{
                background: `${color}18`,
                color: color,
                border: `1px solid ${color}40`,
              }}
            >
              <span className="font-medium text-xs opacity-60 mr-0.5">{i + 1}</span>
              {spot}
              <button
                onClick={() => handleRemove(spot)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
              >
                <X size={11} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Free-text input row */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-9 text-sm flex-1"
          style={{
            borderColor: `${color}40`,
            background: `${color}08`,
            color: "#3D2B1F",
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="h-9 px-3 shrink-0"
          style={{
            background: inputValue.trim() ? color : `${color}40`,
            color: "white",
            border: "none",
          }}
        >
          <Plus size={14} />
        </Button>
      </div>
      <p className="text-xs" style={{ color: "#A8896B" }}>
        例：シーギリヤロック、キャンディ仏歯寺、アンブルワワタワー など
      </p>
    </div>
  );
}
