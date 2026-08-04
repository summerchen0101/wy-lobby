import { useEffect, useRef } from "react";
import { forceSafariRepaint } from "../../lib/forceSafariRepaint";
import { useDailyLoginActivity } from "./dailyLoginContext";
import { DailyLoginModal } from "./DailyLoginModal";

export function DailyLoginModalHost() {
  const { modalOpen } = useDailyLoginActivity();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (wasOpenRef.current && !modalOpen) {
      forceSafariRepaint();
    }
    wasOpenRef.current = modalOpen;
  }, [modalOpen]);

  return <DailyLoginModal open={modalOpen} />;
}
