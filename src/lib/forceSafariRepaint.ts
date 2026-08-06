import { isIOSWebKit } from "./iosGameFullscreen";

/** Remove legacy repaint hack transforms that break position:fixed descendants. */
export function clearStaleSafariRepaintTransform(): void {
  if (typeof document === "undefined") return;

  for (const el of [document.documentElement, document.body]) {
    const transform = el.style.webkitTransform || el.style.transform;
    if (!transform) continue;
    if (/translateZ\(0\)|translate3d\(0(px)?,\s*0(px)?,\s*0(px)?\)/i.test(transform)) {
      el.style.webkitTransform = "";
      el.style.transform = "";
    }
  }
}

/** iOS Safari may leave a black compositing layer after fixed backdrop modals unmount. */
export function forceSafariRepaint(): void {
  if (!isIOSWebKit() || typeof document === "undefined") return;

  clearStaleSafariRepaintTransform();

  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0.001;transform:translateZ(0);";
  document.body.appendChild(probe);
  void probe.offsetHeight;
  requestAnimationFrame(() => {
    probe.remove();
  });
}
