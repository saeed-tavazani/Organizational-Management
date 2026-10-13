import { eachDayOfInterval, isAfter, isBefore, startOfDay } from "date-fns";
import { endOfCalendarMonth, startOfCalendarMonth } from "@/lib/calendar-date";
import type { PackableTask } from "./month-grid-model";

export type AgendaDay<TTask extends PackableTask> = {
  day: Date;
  tasks: TTask[];
};

/**
 * Days of `visibleMonth` that have at least one task scheduled on them, in
 * order. A multi-day task appears under every day it spans, like a schedule
 * view, so each day reads on its own.
 */
export function buildMonthAgenda<TTask extends PackableTask>(
  visibleMonth: Date,
  tasks: TTask[],
): Array<AgendaDay<TTask>> {
  const days = eachDayOfInterval({
    start: startOfCalendarMonth(visibleMonth),
    end: endOfCalendarMonth(visibleMonth),
  });

  return days
    .map((day) => ({
      day,
      tasks: tasks.filter(
        (task) =>
          !isAfter(startOfDay(task.scheduleStart), day) &&
          !isBefore(startOfDay(task.scheduleEnd), day),
      ),
    }))
    .filter((entry) => entry.tasks.length > 0);
}
