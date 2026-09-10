import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
} from "./alert-dialog";

/**
 * Regression test for the "Function components cannot be given refs" warning:
 * Radix's RemoveScroll (inside the underlying DialogOverlayImpl) renders our
 * AlertDialogOverlay wrapper through its own Slot, which clones a ref onto
 * it. AlertDialogOverlay must forward that ref rather than being a plain
 * function component. Visible via AlertDialogContent in order-detail-page.tsx.
 */
describe("AlertDialog", () => {
  it("renders an open alert dialog without a console.error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AlertDialog open>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
