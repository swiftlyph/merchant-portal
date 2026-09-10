import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";

/**
 * Regression test for the "Function components cannot be given refs" warning:
 * Radix's RemoveScroll (inside DialogOverlayImpl) renders our DialogOverlay
 * wrapper through its own Slot, which clones a ref onto it. DialogOverlay
 * must forward that ref rather than being a plain function component.
 */
describe("Dialog", () => {
  it("renders an open dialog without a console.error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    );

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
