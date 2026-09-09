import { useCallback, useEffect, useRef, useState } from "react";

const RESET_TIMEOUT_MS = 1500;
const REQUIRED_CLICKS = 3;

/**
 * The completion gesture: three clicks/presses on a ticket fire `onComplete`
 * on the third — no confirm dialog, the gesture IS the confirmation (per
 * the coffee shop's existing muscle memory). `progress` (0-3) is exposed so
 * the UI can show 1/3 -> 2/3 as visible feedback, which is what teaches the
 * gesture to someone who doesn't already know it, rather than leaving it
 * hidden.
 *
 * A stalled sequence (no next click within RESET_TIMEOUT_MS) resets to 0
 * rather than accumulating forever, so an accidental single click hours
 * apart can never combine into a completion.
 *
 * This hook only tracks the click count and progress; it does not disable
 * itself while a completion is pending — callers should gate `register`
 * behind their own `!isPending` check so a ticket already being completed
 * can't be triple-clicked again mid-flight.
 */
export function useTripleClick(onComplete: () => void) {
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearResetTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearResetTimer(), [clearResetTimer]);

  const register = useCallback(() => {
    setProgress((current) => {
      const next = current + 1;

      if (next >= REQUIRED_CLICKS) {
        clearResetTimer();
        onCompleteRef.current();
        return 0;
      }

      clearResetTimer();
      timeoutRef.current = setTimeout(() => {
        setProgress(0);
      }, RESET_TIMEOUT_MS);

      return next;
    });
  }, [clearResetTimer]);

  const reset = useCallback(() => {
    clearResetTimer();
    setProgress(0);
  }, [clearResetTimer]);

  return { progress, requiredClicks: REQUIRED_CLICKS, register, reset };
}
