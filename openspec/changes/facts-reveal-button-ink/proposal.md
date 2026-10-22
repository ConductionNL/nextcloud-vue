# Proposal: facts-reveal-button-ink

## Why

DqContact draws the facts widget's reveal button ("BSN tonen") with its label in the main text colour. The button set no
colour of its own, so Nextcloud's plain button rule painted it in the deep primary.

## What changes

`.cn-facts-widget__inline-button` takes `--color-main-text`.

## Reach

Every facts widget row with `reveal`. No props, no schema change.
