"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Cake,
  Calendar as CalendarIcon,
  MessageCircle,
} from "lucide-react";
import Avatar from "./Avatar";
import type { Profile } from "@/lib/types";

interface BirthdayCalendarProps {
  members: Profile[];
}

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function safeDate(y: number, m: number, d: number) {
  if (m === 1 && d === 29 && !isLeapYear(y)) return new Date(y, 1, 28);
  return new Date(y, m, d);
}

export default function BirthdayCalendar({ members }: BirthdayCalendarProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Build a map of month-day → members with birthdays
  const birthdayMap = useMemo(() => {
    const map = new Map<string, Profile[]>();
    members.forEach((m) => {
      if (!m.birth_date) return;
      const d = new Date(m.birth_date + "T00:00:00");
      const key = `${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return map;
  }, [members]);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  // Upcoming birthdays (next 60 days)
  const upcoming = useMemo(() => {
    const result: { member: Profile; date: Date; daysUntil: number }[] = [];
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    members.forEach((m) => {
      if (!m.birth_date) return;
      const bd = new Date(m.birth_date + "T00:00:00");
      let next = safeDate(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < todayStart) {
        next = safeDate(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
      }
      // Use date-only diff to avoid time-of-day rounding issues
      const diff = Math.round(
        (next.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff <= 60) {
        result.push({ member: m, date: next, daysUntil: diff });
      }
    });
    return result.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [members, today]);

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-accent" />
            <h3 className="text-base font-bold text-primary">
              Birthday Calendar
            </h3>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-text-light" />
          </button>
          <button
            onClick={goToday}
            className="text-sm font-semibold text-primary hover:text-accent transition-colors cursor-pointer"
          >
            {monthName}
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 text-text-light" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-semibold text-text-light/60 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="h-8" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const key = `${viewMonth}-${d}`;
            const birthdayMembers = birthdayMap.get(key);
            const hasBirthday = !!birthdayMembers;
            const isToday =
              d === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();

            return (
              <div
                key={d}
                className={`h-8 flex items-center justify-center text-xs rounded-lg relative transition-colors ${
                  hasBirthday
                    ? "bg-accent text-white font-bold cursor-default"
                    : isToday
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-text-light hover:bg-muted/50"
                }`}
                title={
                  hasBirthday
                    ? birthdayMembers
                        .map((m) => m.full_name + "'s birthday")
                        .join(", ")
                    : undefined
                }
              >
                {d}
                {hasBirthday && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-accent" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming birthdays list */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cake className="h-5 w-5 text-accent" />
            <h3 className="text-base font-bold text-primary">
              Upcoming Birthdays
            </h3>
          </div>
          <div className="space-y-2">
            {upcoming.slice(0, 5).map(({ member, date, daysUntil }) => {
              const bd = new Date(member.birth_date + "T00:00:00");
              const age = date.getFullYear() - bd.getFullYear();
              const wishMsg = encodeURIComponent(
                daysUntil === 0
                  ? `Happy Birthday, ${member.full_name}! 🎂🎉 Wishing you an amazing day!${age > 0 ? ` Welcome to ${age}!` : ""}`
                  : `Hey ${member.full_name}! Just wanted to let you know — your birthday is coming up${daysUntil === 1 ? " tomorrow" : ` in ${daysUntil} days`}! Can't wait to celebrate with you! 🎉`
              );
              const waPhone = member.phone?.replace(/[^+\d]/g, "") || "";
              const waUrl = waPhone
                ? `https://wa.me/${waPhone}?text=${wishMsg}`
                : `https://wa.me/?text=${wishMsg}`;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-background border border-border"
                >
                  <Avatar
                    src={member.avatar_url}
                    name={member.full_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-text-light">
                      {date.toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                      {age > 0 && ` — turning ${age}`}
                    </p>
                  </div>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors cursor-pointer"
                    title={`Send birthday wish to ${member.full_name}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      daysUntil === 0
                        ? "bg-accent text-white"
                        : daysUntil <= 7
                        ? "bg-accent/10 text-accent"
                        : "bg-muted text-text-light"
                    }`}
                  >
                    {daysUntil === 0
                      ? "Today!"
                      : daysUntil === 1
                      ? "Tomorrow"
                      : `${daysUntil}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
