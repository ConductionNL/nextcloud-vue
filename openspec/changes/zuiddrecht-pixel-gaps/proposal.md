---
kind: code
---

# Proposal: zuiddrecht-pixel-gaps

## Summary

The Zuiddrecht design boards (dossiq, pipelinq, decidiq, learniq) ask for
chrome the shared library draws and an app manifest cannot change. This change
closes those gaps additively: every item is an opt-in manifest key, a prop
whose default is today's behaviour, or a CSS hook a theme can set. No app
changes until it opts in.

1. A navigation primary action can run a page action (open-form, navigate,
   api-call) and can render as a solid full-width button.
2. A menu entry count can be the total of a filtered list, not only a whole
   schema.
3. A dashboard page can hide its header row.
4. A widget header can carry one text link instead of (or beside) the menu.
5. An index page can show its title, a count subtitle and header buttons from
   the manifest.
6. A table column can draw a secondary line under its value.
7. The audit-trail widget reads the app-wide feed when it has no object.
8. A detail page can drop the type eyebrow and show a breadcrumb line.
9. The navigation can carry a card above the footer and a help entry.
10. A resolved reference is not drawn in monospace as a uuid.
11. The brand block takes an emblem image distinct from the top-bar logo.
12. A greeting header can switch views with a segmented control.
13. A stat tile can colour its caption by a rule.
14. A tabs widget can render its strip as a segmented control.

## Motivation

Ruben's standard for the Zuiddrecht programme: every app screen matches its
design board pixel for pixel, with Nextcloud's top bar the only allowed
difference. The dossiq lane measured the live screens against the boards and
found ten gaps that live in `@conduction/nextcloud-vue` (items L1 to L10 in
its state file); the boards add the greeting switch, the stat caption rule,
the emblem and the segmented tab strip.

## Scope

`@conduction/nextcloud-vue` only. Minor release (2.63.0): additive, no
breaking change.
