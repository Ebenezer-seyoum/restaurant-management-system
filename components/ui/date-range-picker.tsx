"use client";

import { CalendarDays, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (value?: DateRange) => void;
  className?: string;
};

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : "All dates";

  return (
    <div className={cn("ui-date-range-wrap", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="ui-date-range-trigger">
            <CalendarDays size={16} />
            <span>{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="ui-date-range-popover">
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {value?.from ? (
        <Button variant="ghost" size="icon" onClick={() => onChange(undefined)} aria-label="Clear date range">
          <X size={15} />
        </Button>
      ) : null}
    </div>
  );
}
