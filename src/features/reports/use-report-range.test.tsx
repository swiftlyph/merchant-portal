import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useReportRange } from "./use-report-range";
import { DEFAULT_RANGE, resolvePreset } from "./date-range";

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={["/app/reports"]}>{children}</MemoryRouter>;
}

function wrapperWithQuery(query: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[`/app/reports?${query}`]}>{children}</MemoryRouter>;
  };
}

function RangeHarness() {
  const { range, setRange } = useReportRange();
  const [searchParams] = useSearchParams();
  return (
    <div>
      <span data-testid="range">{JSON.stringify(range)}</span>
      <span data-testid="qs">{searchParams.toString()}</span>
      <button onClick={() => setRange(resolvePreset("last-7-days"))}>set preset</button>
      <button onClick={() => setRange({ from: "2026-01-01", to: "2026-01-10" })}>set custom</button>
    </div>
  );
}

describe("useReportRange", () => {
  it("defaults to today when the URL has no from/to", () => {
    const { result } = renderHook(() => useReportRange(), { wrapper });
    expect(result.current.range).toEqual(DEFAULT_RANGE);
  });

  it("reads an existing range from the URL — refresh-proof", () => {
    const { result } = renderHook(() => useReportRange(), {
      wrapper: wrapperWithQuery("from=2026-09-01&to=2026-09-03"),
    });
    expect(result.current.range).toEqual({ from: "2026-09-01", to: "2026-09-03" });
  });

  it("a preset round-trips through the URL", () => {
    render(<RangeHarness />, { wrapper: MemoryRouter });

    const expected = resolvePreset("last-7-days");
    fireEvent.click(screen.getByText("set preset"));

    expect(screen.getByTestId("range").textContent).toBe(JSON.stringify(expected));
    expect(screen.getByTestId("qs").textContent).toBe(`from=${expected.from}&to=${expected.to}`);
  });

  it("a custom range round-trips through the URL", () => {
    render(<RangeHarness />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByText("set custom"));

    expect(screen.getByTestId("range").textContent).toBe(
      JSON.stringify({ from: "2026-01-01", to: "2026-01-10" }),
    );
    expect(screen.getByTestId("qs").textContent).toBe("from=2026-01-01&to=2026-01-10");
  });
});
