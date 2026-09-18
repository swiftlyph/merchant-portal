import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Toggles the whole page in and out of the browser's Fullscreen API. */
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => document.fullscreenElement != null,
  );

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
      onClick={toggleFullscreen}
    >
      {isFullscreen ? (
        // minimize icon
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9,3A1,1,0,0,0,8,4V8H4A1,1,0,0,0,4,10H9a1,1,0,0,0,1-1V4A1,1,0,0,0,9,3Z" />
          <path d="M15,3a1,1,0,0,0-1,1V9a1,1,0,0,0,1,1h5a1,1,0,0,0,0-2H16V4A1,1,0,0,0,15,3Z" />
          <path d="M4,14H9a1,1,0,0,1,1,1v5a1,1,0,0,1-2,0V16H4a1,1,0,0,1,0-2Z" />
          <path d="M15,14h5a1,1,0,0,1,0,2H16v4a1,1,0,0,1-2,0V15A1,1,0,0,1,15,14Z" />
        </svg>
      ) : (
        // maximize icon
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M4,10A1,1,0,0,0,5,9V5H9A1,1,0,0,0,9,3H4A1,1,0,0,0,3,4V9A1,1,0,0,0,4,10Z" />
          <path d="M20,3H15a1,1,0,0,0,0,2h4V9a1,1,0,0,0,2,0V4A1,1,0,0,0,20,3Z" />
          <path d="M9,19H5V15a1,1,0,0,0-2,0v5a1,1,0,0,0,1,1H9a1,1,0,0,0,0-2Z" />
          <path d="M20,14a1,1,0,0,0-1,1v4H15a1,1,0,0,0,0,2h5a1,1,0,0,0,1-1V15A1,1,0,0,0,20,14Z" />
        </svg>
      )}
    </Button>
  );
}
