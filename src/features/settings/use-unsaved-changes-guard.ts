import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * No existing dirty-state/unsaved-changes guard exists elsewhere in this
 * codebase to follow — this introduces the pattern for the profile form.
 * Blocks in-app navigation via react-router's data-router useBlocker
 * (available because the app router is a createBrowserRouter), and also
 * warns on a hard reload/tab close via the native beforeunload prompt.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return blocker;
}
