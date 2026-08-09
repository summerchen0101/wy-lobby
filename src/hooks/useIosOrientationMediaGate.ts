import { useEffect, useState } from "react";
import { isIOSWebKit } from "../lib/iosGameFullscreen";
import { IOS_ORIENTATION_STABLE_EVENT } from "../lib/iosOrientationStabilizer";

/** False briefly after iOS orientationchange — defer lobby thumbs / heavy paints. */
export function useIosOrientationMediaGate(): boolean {
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    if (!isIOSWebKit()) return;

    const block = () => setAllowed(false);
    const allow = () => setAllowed(true);

    window.addEventListener("orientationchange", block);
    window.addEventListener(IOS_ORIENTATION_STABLE_EVENT, allow);
    return () => {
      window.removeEventListener("orientationchange", block);
      window.removeEventListener(IOS_ORIENTATION_STABLE_EVENT, allow);
    };
  }, []);

  return allowed;
}
