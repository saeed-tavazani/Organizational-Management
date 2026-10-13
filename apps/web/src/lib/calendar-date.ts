import {
  addMonths as addGregorianMonths,
  endOfMonth as endOfGregorianMonth,
  isSameMonth as isSameGregorianMonth,
  startOfMonth as startOfGregorianMonth,
  subMonths as subGregorianMonths,
} from "date-fns";
import {
  addMonths as addPersianMonths,
  endOfMonth as endOfPersianMonth,
  isSameMonth as isSamePersianMonth,
  startOfMonth as startOfPersianMonth,
  subMonths as subPersianMonths,
} from "date-fns-jalali";
import { i18n } from "./i18n";

export function usesPersianCalendar() {
  return (i18n.resolvedLanguage || i18n.language).startsWith("fa");
}

export function startOfCalendarMonth(date: Date) {
  return usesPersianCalendar()
    ? startOfPersianMonth(date)
    : startOfGregorianMonth(date);
}

export function endOfCalendarMonth(date: Date) {
  return usesPersianCalendar()
    ? endOfPersianMonth(date)
    : endOfGregorianMonth(date);
}

export function addCalendarMonths(date: Date, amount: number) {
  return usesPersianCalendar()
    ? addPersianMonths(date, amount)
    : addGregorianMonths(date, amount);
}

export function subCalendarMonths(date: Date, amount: number) {
  return usesPersianCalendar()
    ? subPersianMonths(date, amount)
    : subGregorianMonths(date, amount);
}

export function isSameCalendarMonth(date: Date, otherDate: Date) {
  return usesPersianCalendar()
    ? isSamePersianMonth(date, otherDate)
    : isSameGregorianMonth(date, otherDate);
}
