/**
 * SpotSelector Component
 * Multi-select spot picker with badge display
 * Design: Tropical Cartography
 */

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LOCATIONS } from "@/lib/locations";

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
  exclude,
  color,
  placeholder,
}: SpotSelectorProps) {
  const [selectKey, setSelectKey] = useState(0);

  const available = LOCATIONS.filter(
    (loc) => !selected.includes(loc.label) && !exclude.includes(loc.label)
  );

  const handleAdd = (label: string) => {
    if (!selected.includes(label)) {
      onChange([...selected, label]);
      setSelectKey(k => k + 1);
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
              key={spot}
              className="text-xs py-1 px-2 flex items-center gap-1 cursor-default"
              style={{
                background: `${color}18`,
                color: color,
                border: `1px solid ${color}40`,
              }}
            >
              <span className="font-medium text-xs opacity-60 mr-0.5">{i + 1}</span>
              {spot.split("(")[0].trim()}
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

      {/* Add spot selector */}
      {available.length > 0 && (
        <Select key={selectKey} onValueChange={handleAdd}>
          <SelectTrigger
            className="w-full h-9 text-sm"
            style={{
              borderColor: `${color}40`,
              background: `${color}08`,
              color: "#8B6B4A",
            }}
          >
            <div className="flex items-center gap-1.5">
              <Plus size={13} style={{ color }} />
              <span>{placeholder}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {available.map((loc) => (
              <SelectItem key={loc.id} value={loc.label}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selected.length === 0 && available.length === 0 && (
        <p className="text-xs" style={{ color: "#A8896B" }}>追加できるスポットがありません</p>
      )}
    </div>
  );
}

