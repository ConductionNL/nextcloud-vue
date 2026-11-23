---
kind: code
---

# Proposal: link-cards-page

## Summary

A manifest page type `links`: a page of link cards, grouped under captions.
Each card has a translated label and description, an optional icon, and a
route or an href. Rendered by `CnLinkCardsPage`. Also: `CnReportsPage` and the
other page components the renderer mounts are exported from the library
entry, and a detail page title wraps to two lines before it truncates.

## Motivation

pipelinq's simple menu moves 29 entries off the menu onto one page. No typed
page fits: `reports` is one per app and filters instead of grouping, the
`nav-card-grid` widget does not translate its labels and has no groups, and
the `links` and `quicklinks` widgets take fixed URLs. The app wrote a
`type: "custom"` page, which every app with a simple menu would then copy.

## Affected projects

- `nextcloud-vue`: new component and page type, schema, validator view, docs.
- Consumers: pipelinq first. Any app with a simple structure profile.

## Backward compatibility

Additive. A new enum value and a new component. Nothing existing changes
shape. The title change keeps short titles as they are.

## Theming

Nextcloud CSS variables only.
