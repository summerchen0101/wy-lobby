import {
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  Physics,
  Skeleton,
  SkeletonJson,
  type TextureAtlas,
  type TrackEntry,
} from "@esotericsoftware/spine-core";
import {
  ResizeMode,
  SpineCanvas,
  type SpineCanvasApp,
} from "@esotericsoftware/spine-webgl";
import { useLayoutEffect, useRef } from "react";

export type TutorialSpinePhase = "enter" | "steps" | "exit";

/** Artboard size used by tutorial exports (see Tutorial_a.atlas BG_C bounds 720×1280). */
const DESIGN_W = 720;
const DESIGN_H = 1280;

/** Scale dialog + characters past safe bounds; edges may clip off-frame (by design). */
const VISUAL_ZOOM = 1.5;

const UI_ANIM_IN = "Tutorial_a_in";
const UI_ANIM_IDLE = "Tutorial_a_idle";
const UI_ANIM_OUT = "Tutorial_a_out";

const GIRL_ANIM_IN = "girl1_idle_in";
const GIRL_ANIM_IDLE = "girl1_idle";
const GIRL_ANIM_OUT = "girl1_idle_out";

const MAN_ANIM_IN = "man_Idle1_in";
const MAN_ANIM_IDLE = "man_Idle1";
const MAN_ANIM_OUT = "man_Idle1_out";

function syncCanvasBackingStore(canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function tutorialExportPrefix(): string {
  const base = import.meta.env.BASE_URL;
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}tutorial/Export/`;
}

function loadSkeletonPair(
  assetManager: SpineCanvas["assetManager"],
  atlasFile: string,
  jsonFile: string,
): { skeleton: Skeleton; animationState: AnimationState } {
  const atlas = assetManager.require(atlasFile) as TextureAtlas;

  const attachmentLoader = new AtlasAttachmentLoader(atlas);
  const skeletonJson = new SkeletonJson(attachmentLoader);
  const skeletonData = skeletonJson.readSkeletonData(
    assetManager.require(jsonFile),
  );
  const skeleton = new Skeleton(skeletonData);
  skeleton.setToSetupPose();
  skeleton.updateWorldTransform(Physics.reset);

  const stateData = new AnimationStateData(skeleton.data);
  const animationState = new AnimationState(stateData);
  return { skeleton, animationState };
}

function queueIdleLoops(state: AnimationState, idleName: string) {
  state.setAnimation(0, idleName, true);
}

function onceOnComplete(entry: TrackEntry, onDone: () => void) {
  entry.listener = {
    complete: () => {
      onDone();
    },
  };
}

type Props = {
  phase: TutorialSpinePhase;
  className?: string;
  onLoadError?: (message: string) => void;
  /** After girl/man/ui *_in clips finish (idle queued). */
  onEnterComplete?: () => void;
  /** After all *_out clips finish. */
  onExitComplete?: () => void;
};

/** Girl + man + Tutorial_a dialog art; phase-driven enter / idle / exit. */
export function TutorialSpineCanvas({
  phase,
  className,
  onLoadError,
  onEnterComplete,
  onExitComplete,
}: Props) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const driveRef = useRef({
    phase,
    onEnterComplete,
    onExitComplete,
  });
  const onLoadErrorRef = useRef(onLoadError);

  useLayoutEffect(() => {
    driveRef.current = { phase, onEnterComplete, onExitComplete };
    onLoadErrorRef.current = onLoadError;
  }, [phase, onEnterComplete, onExitComplete, onLoadError]);

  useLayoutEffect(() => {
    const canvas = canvasElRef.current;
    if (!canvas) return;

    syncCanvasBackingStore(canvas);
    const ro = new ResizeObserver(() => syncCanvasBackingStore(canvas));
    ro.observe(canvas);

    let loadFailed = false;

    const assets = {
      uiAtlas: "Tutorial_a.atlas",
      uiJson: "Tutorial_a.json",
      girlAtlas: "Tutorial_girl1.atlas",
      girlJson: "Tutorial_girl1.json",
      manAtlas: "Tutorial_man1.atlas",
      manJson: "Tutorial_man1.json",
    };

    let skeletonUi!: Skeleton;
    let stateUi!: AnimationState;
    let skeletonGirl!: Skeleton;
    let stateGirl!: AnimationState;
    let skeletonMan!: Skeleton;
    let stateMan!: AnimationState;

    let skeletonsReady = false;
    let exitQueued = false;

    let introRemain = 0;
    const bumpIntro = () => {
      introRemain--;
      if (introRemain <= 0) {
        driveRef.current.onEnterComplete?.();
      }
    };

    let exitRemain = 0;
    const bumpExit = () => {
      exitRemain--;
      if (exitRemain <= 0) {
        driveRef.current.onExitComplete?.();
      }
    };

    function applyIdleOnly() {
      queueIdleLoops(stateGirl, GIRL_ANIM_IDLE);
      queueIdleLoops(stateMan, MAN_ANIM_IDLE);
      queueIdleLoops(stateUi, UI_ANIM_IDLE);
    }

    function applyEnter() {
      introRemain = 3;

      const gIn = stateGirl.setAnimation(0, GIRL_ANIM_IN, false);
      onceOnComplete(gIn, bumpIntro);
      stateGirl.addAnimation(0, GIRL_ANIM_IDLE, true, 0);

      const mIn = stateMan.setAnimation(0, MAN_ANIM_IN, false);
      onceOnComplete(mIn, bumpIntro);
      stateMan.addAnimation(0, MAN_ANIM_IDLE, true, 0);

      const uIn = stateUi.setAnimation(0, UI_ANIM_IN, false);
      onceOnComplete(uIn, bumpIntro);
      stateUi.addAnimation(0, UI_ANIM_IDLE, true, 0);
    }

    function applyExit() {
      exitQueued = true;
      exitRemain = 3;

      const ge = stateGirl.setAnimation(0, GIRL_ANIM_OUT, false);
      onceOnComplete(ge, bumpExit);

      const me = stateMan.setAnimation(0, MAN_ANIM_OUT, false);
      onceOnComplete(me, bumpExit);

      const ue = stateUi.setAnimation(0, UI_ANIM_OUT, false);
      onceOnComplete(ue, bumpExit);
    }

    const app: SpineCanvasApp = {
      loadAssets(sc) {
        const am = sc.assetManager;
        am.loadTextureAtlas(assets.uiAtlas);
        am.loadJson(assets.uiJson);
        am.loadTextureAtlas(assets.girlAtlas);
        am.loadJson(assets.girlJson);
        am.loadTextureAtlas(assets.manAtlas);
        am.loadJson(assets.manJson);
      },
      initialize(sc) {
        const am = sc.assetManager;
        try {
          const ui = loadSkeletonPair(am, assets.uiAtlas, assets.uiJson);
          skeletonUi = ui.skeleton;
          stateUi = ui.animationState;

          const girl = loadSkeletonPair(am, assets.girlAtlas, assets.girlJson);
          skeletonGirl = girl.skeleton;
          stateGirl = girl.animationState;

          const man = loadSkeletonPair(am, assets.manAtlas, assets.manJson);
          skeletonMan = man.skeleton;
          stateMan = man.animationState;
        } catch (e) {
          loadFailed = true;
          onLoadErrorRef.current?.(
            e instanceof Error ? e.message : "Failed to create Spine skeletons.",
          );
          return;
        }

        skeletonsReady = true;

        const vpW =
          sc.renderer.camera.viewportWidth || canvas.width || DESIGN_W;
        const vpH =
          sc.renderer.camera.viewportHeight || canvas.height || DESIGN_H;
        /** Fit portrait design then zoom 1.5×; overflow clips at framebuffer edges. */
        const layoutScale =
          Math.min(vpW / DESIGN_W, vpH / DESIGN_H, 1.06) * 0.74 * VISUAL_ZOOM;

        skeletonGirl.scaleX = layoutScale;
        skeletonGirl.scaleY = layoutScale;
        skeletonGirl.x = vpW * 0.22;
        skeletonGirl.y = -vpH * 0.21;

        skeletonMan.scaleX = layoutScale;
        skeletonMan.scaleY = layoutScale;
        skeletonMan.x = -vpW * 0.22;
        skeletonMan.y = -vpH * 0.2;

        /** Tutorial_a dialog above characters; nudge down vs viewport top safe area */
        skeletonUi.scaleX = layoutScale;
        skeletonUi.scaleY = layoutScale;
        skeletonUi.x = 0;
        skeletonUi.y = vpH * 0.27;

        const ph = driveRef.current.phase;
        if (ph === "enter") {
          applyEnter();
        } else if (ph === "steps") {
          applyIdleOnly();
        } else {
          applyExit();
        }
      },
      update(_sc, delta) {
        if (loadFailed || !skeletonsReady) return;

        const ph = driveRef.current.phase;
        if (ph === "exit" && !exitQueued) {
          applyExit();
        }

        stateUi.update(delta);
        stateUi.apply(skeletonUi);
        skeletonUi.update(delta);
        skeletonUi.updateWorldTransform(Physics.update);

        stateGirl.update(delta);
        stateGirl.apply(skeletonGirl);
        skeletonGirl.update(delta);
        skeletonGirl.updateWorldTransform(Physics.update);

        stateMan.update(delta);
        stateMan.apply(skeletonMan);
        skeletonMan.update(delta);
        skeletonMan.updateWorldTransform(Physics.update);
      },
      render(sc) {
        if (loadFailed || !skeletonsReady) return;
        sc.gl.viewport(0, 0, canvas.width, canvas.height);
        sc.clear(0, 0, 0, 0);
        const renderer = sc.renderer;
        renderer.resize(ResizeMode.Expand);
        renderer.begin();

        renderer.drawSkeleton(skeletonGirl, false);
        renderer.drawSkeleton(skeletonMan, false);
        renderer.drawSkeleton(skeletonUi, false);
        renderer.end();
      },
      error(_sc, errors) {
        const msg = Object.entries(errors)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ");
        onLoadErrorRef.current?.(msg || "Spine asset load failed.");
      },
      dispose() {},
    };

    const spine = new SpineCanvas(canvas, {
      app,
      pathPrefix: tutorialExportPrefix(),
      webglConfig: {
        alpha: true,
        premultipliedAlpha: false,
      },
    });

    return () => {
      ro.disconnect();
      spine.dispose();
    };
  }, []);

  return (
    <canvas ref={canvasElRef} className={className} aria-hidden />
  );
}
