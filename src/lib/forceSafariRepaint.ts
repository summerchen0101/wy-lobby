import { isIOSWebKit } from "./iosGameFullscreen";

/** iOS Safari may leave a black compositing layer after fixed backdrop modals unmount. */
export function forceSafariRepaint(): void {
  if (!isIOSWebKit() || typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;
  const prevRootTransform = root.style.webkitTransform;
  const prevBodyTransform = body.style.webkitTransform;

  root.style.webkitTransform = "translateZ(0)";
  body.style.webkitTransform = "translateZ(0)";

  requestAnimationFrame(() => {
    root.style.webkitTransform = prevRootTransform;
    body.style.webkitTransform = prevBodyTransform;
  });
}
