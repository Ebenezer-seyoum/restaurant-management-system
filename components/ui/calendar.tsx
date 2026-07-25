"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("ui-calendar", className)}
      classNames={{
        months: "ui-calendar-months",
        month: "ui-calendar-month",
        month_caption: "ui-calendar-caption",
        caption_label: "ui-calendar-caption-label",
        nav: "ui-calendar-nav",
        button_previous: "ui-calendar-nav-button",
        button_next: "ui-calendar-nav-button",
        month_grid: "ui-calendar-table",
        weekdays: "ui-calendar-head-row",
        weekday: "ui-calendar-head-cell",
        week: "ui-calendar-row",
        day: "ui-calendar-cell",
        day_button: "ui-calendar-day",
        range_start: "range-start",
        range_end: "range-end",
        selected: "selected",
        today: "today",
        outside: "outside",
        disabled: "disabled",
        range_middle: "range-middle",
        hidden: "hidden",
        ...classNames
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
