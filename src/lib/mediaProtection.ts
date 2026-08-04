/** Block drag-save and system menus on decorative images and autoplay videos site-wide. */
export function registerMediaProtection(): void {
  if (typeof document === "undefined") return;

  const isEditableTarget = (el: Element): boolean =>
    el.closest("input, textarea, select, [contenteditable='true']") !== null;

  const isMediaTarget = (el: Element): boolean =>
    el instanceof HTMLImageElement ||
    el instanceof HTMLVideoElement ||
    el.closest("picture") !== null;

  document.addEventListener(
    "contextmenu",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (isEditableTarget(target)) return;
      if (isMediaTarget(target)) event.preventDefault();
    },
    { capture: true },
  );

  document.addEventListener(
    "selectstart",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (isEditableTarget(target)) return;
      if (isMediaTarget(target)) event.preventDefault();
    },
    { capture: true },
  );

  const applyImageAttrs = (img: HTMLImageElement) => {
    img.draggable = false;
  };

  const applyVideoAttrs = (video: HTMLVideoElement) => {
    video.draggable = false;
    video.disablePictureInPicture = true;
    if (!video.controls) {
      video.setAttribute(
        "controlsList",
        "nodownload nofullscreen noremoteplayback",
      );
    }
  };

  const scanNode = (node: Node) => {
    if (node instanceof HTMLImageElement) applyImageAttrs(node);
    if (node instanceof HTMLVideoElement) applyVideoAttrs(node);
    if (node instanceof HTMLElement) {
      node.querySelectorAll("img").forEach((img) => applyImageAttrs(img));
      node.querySelectorAll("video").forEach((video) => applyVideoAttrs(video));
    }
  };

  scanNode(document.documentElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) scanNode(node);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
