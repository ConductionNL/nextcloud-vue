---
kind: code
---

# Proposal: app-root-page-ground

## Summary

CnAppRoot draws every app inside Nextcloud's content panel: NcContent and
NcAppContent paint `--color-main-background` (white in the light theme). A
dashboard app whose canvas is the page wants its grid on the page background
instead, the way Nextcloud's own Dashboard does, with each widget keeping its
own surface. An app cannot change that without overriding library CSS.

CnAppRoot gets an opt-in `pageGround` prop (default `false`). When true,
NcContent and NcAppContent paint no surface, so the page background shows
through: Nextcloud's background, or the page ground a theme such as thematiq
sets. No colour is introduced; the default is today's behaviour.

First consumer: launchpad (Ruben's review, 22 Nov 2026).
