export type NewbieTutorialStep = {
  /** BBCode: [b], [/b], [RRGGBB], [-] */
  textBbcode: string;
};

/**
 * Copy from design spec — DOM overlay inside Spine dialog bubble + dual characters.
 */
export const NEWBIE_TUTORIAL_STEPS: readonly NewbieTutorialStep[] = [
  {
    textBbcode: "Here we have [b]2 game modes:[/b]",
  },
  {
    textBbcode:
      "[b][FFCC00]Crown Coins Mode[-][/b]Spin & win for fun",
  },
  {
    textBbcode: "Let's play!",
  },
  {
    textBbcode:
      "AWESOME!\nLet's switch the toggle and discover our second mode",
  },
  {
    textBbcode:
      "Sweep coins Mode\nWhere you can [b]REDEEM[/b] your winnings into [b]REAL PRIZES![/b]",
  },
  {
    textBbcode:
      "[b]What a Win![/b] Let's go back to the [b]LOBBY[/b]",
  },
  {
    textBbcode: "Go to your [b]REDEEM[/b] center",
  },
  {
    textBbcode:
      "From here you can redeem your [b]SC[/b] winnings to [b]REAL PRIZES![/b]",
  },
  {
    textBbcode:
      "[b]Need More Coins?[/b] You can always get them at our [b]SHOP![/b]",
  },
  {
    textBbcode:
      "[b]You're all set![/b] Good luck spinning!",
  },
];

export function getNewbieTutorialSteps(): readonly NewbieTutorialStep[] {
  return NEWBIE_TUTORIAL_STEPS;
}
