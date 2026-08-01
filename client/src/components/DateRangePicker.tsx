/**
 * DateRangePicker Component
 * Calendar-based date range selection
 * Design: Tropical Cartography - warm terracotta accent
 */

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartChange: (d: Date | null) => void;
  onEndChange: (d: Date | null) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: DateRangePickerProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const numDays =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Start Date */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8B6B4A" }}>
            開始日
          </label>
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-10 text-sm justify-start font-normal"
                style={{
                  borderColor: "#E8D5A3",
                  background: "#FAF7F0",
                  color: startDate ? "#3D2B1F" : "#A8896B",
                }}
              >
                <CalendarIcon size={14} className="mr-2 flex-shrink-0" style={{ color: "#C4622D" }} />
                {startDate ? format(startDate, "M/d (EEE)", { locale: ja }) : "選択"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate ?? undefined}
                onSelect={(d) => {
                  onStartChange(d ?? null);
                  if (d && endDate && d > endDate) onEndChange(null);
                  setStartOpen(false);
                }}
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8B6B4A" }}>
            終了日
          </label>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-10 text-sm justify-start font-normal"
                style={{
                  borderColor: "#E8D5A3",
                  background: "#FAF7F0",
                  color: endDate ? "#3D2B1F" : "#A8896B",
                }}
              >
                <CalendarIcon size={14} className="mr-2 flex-shrink-0" style={{ color: "#C4622D" }} />
                {endDate ? format(endDate, "M/d (EEE)", { locale: ja }) : "選択"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate ?? undefined}
                onSelect={(d) => {
                  onEndChange(d ?? null);
                  setEndOpen(false);
                }}
                disabled={(d) => {
                  const today = new Date(new Date().setHours(0,0,0,0));
                  if (d < today) return true;
                  if (startDate && d < startDate) return true;
                  return false;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {numDays !== null && (
        <div
          className="text-center py-2 rounded-lg text-sm font-semibold"
          style={{ background: "#FFF5EE", color: "#C4622D", border: "1px solid #F4C9A8" }}
        >
          {numDays}日間の旅程
        </div>
      )}
    </div>
  );
}
