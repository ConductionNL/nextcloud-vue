# Proposal: status-badge-hue-tokens

## Why

A theme that names the NL Design System hue tints and pill text (`--nl-color-<hue>-light`, `--nl-color-<hue>-text`;
thematiq's workplace sets, with the boards' values) should colour every status tag the same way, whichever app draws
it. CnStatusBadge's tones read Nextcloud's role colours and two fixed board tones, so a dossiq status pill and a library
tag of the same tone could differ.

## What changes

The success, warning, error and info variants read `--nl-color-green|orange|red|blue-light` for their ground and
`-text` for their ink first, and fall back to the Nextcloud role colours as before. The purple and teal tones default
to the purple and teal tokens, with today's values as fallback. Nothing changes under a theme that names none.
