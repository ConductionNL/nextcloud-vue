---
kind: code
---

# Proposal: zuiddrecht-pixel-gaps-3

## Summary

Round three of the Zuiddrecht pixel match. The round-three dossiq lane compared
the live dossiq pages on 2.65.0 with the DqDashboard, DqZaak and DqZaken boards
twice. Eleven differences remain that live in `@conduction/nextcloud-vue`. Five
are defects, fixed so that an app that sets nothing renders as before; the rest
are new opt-in keys whose default is today's look.

1. A ground greeting lines its view switch up with the heading (fix to round
   two's `content.ground`).
2. A week strip and a stacked bar can take the board's inset (`content.inset`).
3. The stages bar labels hold their line under a theme that restyles every
   button (fix): no label sits lower, a long label ends in an ellipsis.
4. A breadcrumb can name the record by a field and draw a text separator
   (`breadcrumb.currentField`, `breadcrumb.separator`).
5. A detail page can drop the widget Actions menu
   (`config.showWidgetActions`, a widget's `showActions`).
6. An empty field in a column `secondary` template takes its separator with it
   (fix).
7. Only the best-matching menu entry is active (fix): vue-router's own active
   check ignores the query and lit a second entry on the same route.
8. A long title keeps the header actions on its row (fix to round two's
   `headerWidget`).
9. An index page can take the board's header: `config.showTitleIcon`,
   `config.showCount` and `config.headerButtons`.
10. The next-step kicker stays a kicker under a theme that sizes every heading
    (fix).
11. The in-app capability comparison is deprecated (docs and a development
    warning; nothing is removed).

## Motivation

Ruben's standard: every app screen matches its design board, with Nextcloud's
top bar the only allowed difference, and every change optional so an app can
still render the Nextcloud way. Items 3 and 10 were invisible in the plain
Nextcloud theme and only showed under thematiq's nldesign sheet, which sets
button and heading styles with `!important`.

## Scope

`@conduction/nextcloud-vue` only. Minor release, manifest schema 2.47.0 to
2.48.0. Removing the capability comparison is a breaking change and waits for
a major version that needs Ruben's permission; this change only marks it.
