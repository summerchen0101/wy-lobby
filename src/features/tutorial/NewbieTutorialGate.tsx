import { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { setLobbyBgmSuppressed } from "../../lib/lobbySound";
import { NewbieVideoTutorialOverlay } from "./NewbieVideoTutorialOverlay";
import { isNewbieTutorialMarkedDone } from "./tutorialStorage";

export function NewbieTutorialGate() {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !user || isNewbieTutorialMarkedDone()) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [ready, user]);

  useEffect(() => {
    setLobbyBgmSuppressed(open);
    return () => setLobbyBgmSuppressed(false);
  }, [open]);

  return (
    <NewbieVideoTutorialOverlay open={open} onClose={() => setOpen(false)} />
  );
}
