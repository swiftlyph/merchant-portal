import { useEffect, useRef, useState } from "react";

/**
 * Ticks a server-given `waiting_seconds` baseline up locally, once a
 * second, between polls — so a ticket's timer moves smoothly rather than
 * jumping only every 15s when the queue refetches. The baseline itself
 * always comes from the server (see KitchenOrderResource); this hook only
 * adds elapsed *local* time on top of it, using the browser clock purely
 * as a stopwatch (measuring a duration since the baseline was received),
 * never to compute an absolute wait from `created_at`.
 *
 * Resets its local elapsed counter whenever the server baseline itself
 * changes (a new poll landed with an updated waiting_seconds) — the local
 * tick is discarded and restarted from the fresh value.
 */
export function useTickingSeconds(serverWaitingSeconds: number): number {
  const [displaySeconds, setDisplaySeconds] = useState(serverWaitingSeconds);
  const baselineRef = useRef({ value: serverWaitingSeconds, receivedAt: Date.now() });

  useEffect(() => {
    baselineRef.current = { value: serverWaitingSeconds, receivedAt: Date.now() };
    setDisplaySeconds(serverWaitingSeconds);
  }, [serverWaitingSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const { value, receivedAt } = baselineRef.current;
      const elapsedLocally = Math.floor((Date.now() - receivedAt) / 1000);
      setDisplaySeconds(value + elapsedLocally);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return displaySeconds;
}
