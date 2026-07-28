"use client";

import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function MiniMonth({
  viewDate,
  weekDates,
  today,
}: {
  viewDate: Date;
  weekDates: Date[];
  today: Date | null;
}) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // segunda = 0
  const diasNoMes = new Date(year, month + 1, 0).getDate();

  const celulas: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(new Date(year, month, d));
  while (celulas.length % 7 !== 0) celulas.push(null);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <span
            key={i}
            className="text-center text-[10px] font-medium uppercase text-subtle"
          >
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d, i) => {
          if (!d) return <span key={i} />;
          const isToday = today ? sameDay(d, today) : false;
          const naSemana = weekDates.some((w) => sameDay(w, d));
          return (
            <span
              key={i}
              className={cn(
                "tabular flex h-7 items-center justify-center rounded-md text-xs",
                isToday
                  ? "bg-brand font-semibold text-brand-foreground"
                  : naSemana
                    ? "bg-brand-muted text-foreground"
                    : "text-muted-foreground"
              )}
            >
              {d.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}
