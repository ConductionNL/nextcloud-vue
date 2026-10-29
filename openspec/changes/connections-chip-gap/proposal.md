# Proposal: connections-chip-gap

## Why

pl4 on board PqIntegrations (16-18): the status chips stand 8px apart on the board and 11px on live. The chips are plain
buttons, and Nextcloud's server rule `button:not(.button-vue,[class^=vs__]):not(.app-navigation-entry-button)` gives
them `margin: 3px; margin-inline-start: 0`. Its specificity (0,2,1) beats the scoped chip rule (0,2,0), so the
component's `margin: 0` lost.

## What changes

The chip rule is written as `.cn-connections__chips .cn-connections__chip` (0,3,0 scoped), so its `margin: 0` wins and
the flex gap of 8px is the only space between chips.
