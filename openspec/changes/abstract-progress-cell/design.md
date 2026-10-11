# Design: abstract-progress-cell

- Percentage: the cell value, else the first `fallbackFields` row field holding a number, scaled by `max` (default
  100), rounded, clamped to 0..100. No number: a dash, like every other empty cell.
- Tone: `thresholds` `{ good: 60, warn: 30 }` by default, the PqLeads board (70/62 green, 55/48/41 amber, 22/15 red).
  `lowerIsBetter` turns the scale around. The percentage is bold, so the tone is not the only signal.
- Badge: `badge.dateField` (default `@self.updated`) at least `afterDays` calendar days back (`ageInDays`, the age
  cell's day count), every `when` field equal or empty. The label is translated first, then `{days}` is filled.
  The stale threshold is a manifest value: an app whose threshold is a setting keeps its default in the manifest until
  cells read `@config` tokens.
- Look: bar 56 x 8, radius 4, `--color-background-dark` track; gap 8px; value 14px bold; badge 13px / 600, radius 12,
  padding 3px 10px. Colours: Nextcloud success/warning/error variables.
