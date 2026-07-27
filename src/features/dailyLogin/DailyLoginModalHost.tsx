import { useDailyLoginActivity } from "./dailyLoginContext";
import { DailyLoginModal } from "./DailyLoginModal";

export function DailyLoginModalHost() {
  const { modalOpen } = useDailyLoginActivity();
  return <DailyLoginModal open={modalOpen} />;
}
