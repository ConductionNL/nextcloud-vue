# Proposal: board-index-ink-under-theme

## Why

A theme that forces the body ink onto every span (thematiq's element overrides) reads that ink from
`--nldesign-color-on-surface`. Three index-page controls in the board look put their label in a span on a tinted
ground without handing that property their own ink, so the label drew in the body ink: the Save view label
(DqZaken, DqWooVerzoeken, DqPersoonlijkeInstellingen "Weergave opslaan": #234a78 on the boards, #1b1c1d live), the
active filter chips (DqWooVerzoeken, DqPersoonlijkeInstellingen "Zaaktype: Woo-verzoek") and the idle chip counts.

## What changes

The Save view button and the active filter chip set `--nldesign-color-on-surface` to the light primary ink, the idle
chip count to the soft text ink. Plain Nextcloud theming does not read the property, so nothing changes there.
