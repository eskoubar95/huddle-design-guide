import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium truncate hidden", // Hide default label when dropdowns are active
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-white/10 border-white/10 text-white absolute z-10", // Absolute to keep them on sides
        ),
        nav_button_previous: "left-1",
        nav_button_next: "right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-white/5 [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-white/10 hover:text-white text-foreground rounded-md m-0.5 focus:ring-primary"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-sm",
        day_today: "bg-white/5 text-white border border-primary/50 font-semibold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-white/5 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-white/5 aria-selected:text-white",
        day_hidden: "invisible",
        caption_dropdowns: "flex gap-2 items-center justify-center w-full px-8", // Center dropdowns, padding for arrows
        dropdown: "bg-transparent text-sm font-medium hover:bg-white/10 rounded px-1 py-0.5 cursor-pointer focus:outline-none text-foreground appearance-none text-center", // Clean styling
        dropdown_month: "relative z-10 [&>span]:hidden", // Hide "Month:" label
        dropdown_year: "relative z-10 [&>span]:hidden", // Hide "Year:" label
        dropdown_icon: "hidden", // Hide default arrow icon if possible
        vhidden: "hidden", // Hide screen reader labels visually
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
