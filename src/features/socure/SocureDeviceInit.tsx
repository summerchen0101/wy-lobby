import { useEffect } from "react";
import { initSocureDevice } from "../../lib/socure/socureDevice";

/** One-time Socure DI SDK bootstrap for device data collection across the session. */
export function SocureDeviceInit() {
  useEffect(() => {
    initSocureDevice();
  }, []);
  return null;
}
