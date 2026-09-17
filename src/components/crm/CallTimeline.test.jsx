// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CallTimeline from "./CallTimeline";

const fixtures = vi.hoisted(() => ({
  messages: [
    { id: 1, created_at: "2026-09-16T08:00:00Z", message: "پیام اول" },
    { id: 2, created_at: "2026-09-16T09:00:00Z", message: "پیام دوم" },
    { id: 3, created_at: "2026-09-17T08:00:00Z", message: "پیام آخر" },
  ],
}));
vi.mock("@/lib/AuthContext", () => ({ useAuth: () => ({ employee: { id: 1 } }) }));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table) => ({ select: () => ({ eq: () => ({
      order: async () => ({ data: table === "customer_messages" ? fixtures.messages : [], error: null }),
    }) }) }),
  },
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test("opens at latest messages and preserves reading position during refresh", async () => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(500);
  const view = render(<CallTimeline customerId="1" customerName="مشتری" refreshKey={0} />);
  await screen.findByText("پیام آخر");
  const viewport = screen.getByRole("region", { name: "پیام‌ها و گزارش‌های مشتری" });
  expect(viewport.scrollTop).toBe(2000);
  viewport.scrollTop = 100;
  fireEvent.scroll(viewport);
  view.rerender(<CallTimeline customerId="1" customerName="مشتری" refreshKey={1} />);
  await waitFor(() => expect(viewport.getAttribute("aria-busy")).toBe("false"));
  expect(viewport.scrollTop).toBe(100);
  view.rerender(<CallTimeline customerId="2" customerName="مشتری دیگر" refreshKey={1} />);
  await waitFor(() => expect(viewport.scrollTop).toBe(2000));
});

test("shows one centered Persian date per day, leaving only time on messages", async () => {
  render(<CallTimeline customerId="1" customerName="مشتری" />);
  await screen.findByText("پیام آخر");
  const dates = screen.getAllByRole("separator");
  expect(dates).toHaveLength(2);
  const date = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" });
  expect(dates.map((el) => el.textContent)).toEqual([
    date.format(new Date(fixtures.messages[0].created_at)),
    date.format(new Date(fixtures.messages[2].created_at)),
  ]);
  const time = new Intl.DateTimeFormat("fa-IR", { timeStyle: "short" });
  expect(screen.getByText(time.format(new Date(fixtures.messages[1].created_at)))).toBeTruthy();
});
