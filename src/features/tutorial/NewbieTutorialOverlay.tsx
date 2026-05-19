import "./NewbieTutorialOverlay.css";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { renderBbcodeTutorial } from "./bbcodeTutorial";
import { NEWBIE_TUTORIAL_STEPS } from "./newbieTutorialSteps";
import { markNewbieTutorialDone } from "./tutorialStorage";
import {
  TutorialSpineCanvas,
  type TutorialSpinePhase,
} from "./TutorialSpineCanvas";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewbieTutorialOverlay({ open, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spineError, setSpineError] = useState<string | null>(null);
  const [phase, setPhase] = useState<TutorialSpinePhase>("enter");

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setSpineError(null);
    setPhase("enter");
  }, [open]);

  const step = NEWBIE_TUTORIAL_STEPS[stepIndex];
  const lastStep = stepIndex >= NEWBIE_TUTORIAL_STEPS.length - 1;

  const afterExitClose = useCallback(() => {
    markNewbieTutorialDone();
    onClose();
  }, [onClose]);

  /** Starts Spine *_out; `afterExitClose` runs when exits finish. */
  const requestDismissWithExit = useCallback(() => {
    if (spineError) {
      afterExitClose();
      return;
    }
    setPhase((p) => (p === "exit" ? p : "exit"));
  }, [spineError, afterExitClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestDismissWithExit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestDismissWithExit]);

  const onSpineLoadError = useCallback((msg: string) => {
    setSpineError(msg);
  }, []);

  const navLocked = phase === "exit" || phase === "enter";

  const onPrimary = useCallback(() => {
    if (lastStep) {
      requestDismissWithExit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, NEWBIE_TUTORIAL_STEPS.length - 1));
  }, [lastStep, requestDismissWithExit]);

  const onBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!open || !step) return null;

  const backDisabled = stepIndex === 0 || navLocked;

  return createPortal(
    <div
      className="newbie-tutorial-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="New player tutorial">
      <div className="newbie-tutorial-overlay__stage">
        <TutorialSpineCanvas
          className="newbie-tutorial-overlay__canvas"
          phase={phase}
          onLoadError={onSpineLoadError}
          onEnterComplete={() =>
            setPhase((current) => (current === "enter" ? "steps" : current))
          }
          onExitComplete={afterExitClose}
        />
        <div className="newbie-tutorial-overlay__bubble">
          <div className="newbie-tutorial-overlay__bubble-body">
            {spineError ? (
              <p className="newbie-tutorial-overlay__error" role="alert">
                Could not load tutorial animations ({spineError}). Ensure
                atlas textures exist next to the .atlas files, e.g.{" "}
                <code className="newbie-tutorial-overlay__code">
                  Tutorial_a.png
                </code>
                , under{" "}
                <code className="newbie-tutorial-overlay__code">
                  public/tutorial/Export/
                </code>
                .
              </p>
            ) : (
              <div className="newbie-tutorial-overlay__text">
                {renderBbcodeTutorial(step.textBbcode)}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="newbie-tutorial-overlay__chrome">
        <p className="newbie-tutorial-overlay__progress" aria-live="polite">
          Step {stepIndex + 1} of {NEWBIE_TUTORIAL_STEPS.length}
        </p>
        <div className="newbie-tutorial-overlay__footer-nav">
          <button
            type="button"
            className="newbie-tutorial-overlay__skip"
            disabled={phase === "exit"}
            onClick={requestDismissWithExit}>
            Skip
          </button>
          <button
            type="button"
            className="newbie-tutorial-overlay__back"
            disabled={backDisabled}
            onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="newbie-tutorial-overlay__next"
            disabled={navLocked}
            onClick={onPrimary}>
            {lastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
