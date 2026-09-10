import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("shows a skeleton while pending, not the value or an error", () => {
    const { container } = render(
      <StatCard label="Pending in kitchen" value={5} isPending isError={false} />,
    );
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("renders the value once loaded", () => {
    render(<StatCard label="Pending in kitchen" value={5} isPending={false} isError={false} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders a non-numeric value (e.g. 'None waiting') as-is", () => {
    render(<StatCard label="Longest wait" value="None waiting" isPending={false} isError={false} />);
    expect(screen.getByText("None waiting")).toBeInTheDocument();
  });

  it("shows its own error and retry action, independent of loading/value state", async () => {
    const onRetry = vi.fn();
    render(
      <StatCard
        label="Orders today"
        value={5}
        isPending={false}
        isError
        errorMessage="Couldn't load."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Couldn't load.")).toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("wraps the whole card in a link when href is given", () => {
    render(
      <MemoryRouter>
        <StatCard label="Revenue today" value="₱123.45" isPending={false} isError={false} href="/app/reports" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/app/reports");
    expect(link).toHaveTextContent("₱123.45");
  });

  it("clicking retry inside a linked card does not also navigate", async () => {
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <StatCard
          label="Revenue today"
          value="₱123.45"
          isPending={false}
          isError
          errorMessage="Couldn't load."
          onRetry={onRetry}
          href="/app/reports"
        />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
