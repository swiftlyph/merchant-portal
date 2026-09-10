import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrintFrame } from "./print-frame";
import { PrintButton } from "./print-button";

describe("PrintFrame", () => {
  it("renders children inside the print-frame class", () => {
    render(
      <PrintFrame>
        <p>Receipt body</p>
      </PrintFrame>,
    );
    expect(screen.getByText("Receipt body").closest(".print-frame")).toBeInTheDocument();
  });
});

describe("PrintButton", () => {
  it("calls window.print on click, not a popup or new tab", () => {
    window.print = vi.fn();
    render(<PrintButton label="Print receipt" />);

    screen.getByRole("button", { name: "Print receipt" }).click();

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});

describe("print stylesheet", () => {
  it("hides app-shell chrome and the toaster under @media print", () => {
    const cssPath = join(process.cwd(), "src/index.css");
    const css = readFileSync(cssPath, "utf-8");

    expect(css).toMatch(/@media print/);
    const printBlock = css.slice(css.indexOf("@media print"));
    expect(printBlock).toMatch(/\.print-hide/);
    expect(printBlock).toMatch(/\[data-sonner-toaster\]/);
    expect(printBlock).toMatch(/\.print-frame/);
  });
});
