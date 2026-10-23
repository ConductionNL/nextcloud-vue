# Proposal: record-list-group-action

## Why

DqZaakGerelateerd draws the planned follow-ups under a "Gepland vervolg" subheading, with "Vervolg plannen" as a tonal
pill at the end of that heading (34px, radius 17, primary-light, 13/600). The record list could only put its one
action under the list, as a secondary button, so live showed "Vervolgzaak plannen" in the card's footer.

## What changes

Two opt-in keys on `footerAction`:

- `group`: with `groupBy`, the action ends that group's heading instead of standing under the list. The heading is
  drawn even when no row carries that value, also under the empty text, so the place to plan a follow-up is always
  where the board puts it.
- `variant: "tonal"`: the action is drawn as a tonal pill (primary-light background, primary-light text, 34px high,
  fully rounded, 13px semibold). Without it the action stays a secondary button.
