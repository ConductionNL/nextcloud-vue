# Proposal: lpvandaag-start-page

## Why

The LpVandaag board draws launchpad's start page in one screen. On 1440×900 and 1366×768 the page does not scroll. The
rows divide the height under the top bar, and long cards scroll inside themselves. The apps are tiles with a filter.
The page's actions sit behind one "Meer" button, in groups.

Launchpad builds its pages from library widgets, so the missing pieces belong in the library:

- The dashboard grid only grows with its content. It cannot fill the height it is given.
- The greeting header puts the greeting in the heading. The board's heading is "Vandaag", with the greeting, the date
  and the week on the line under it.
- There is no widget for the apps a person can open as tiles.
- There is no menu that lays a page's actions out in titled groups over two columns.

## What changes

- `CnDashboardGrid` takes `fillHeight` (and `fillMinWidth`, default 960). In view mode the layout rows divide the
  grid's height on CSS grid rows. A row whose items all set `fitRows: true` takes its content's height. Every other
  row takes an equal share of the rest, and a cell scrolls what does not fit. Edit mode and a narrower grid keep
  GridStack.
- `CnHeaderWidget` takes `greetingLine` and `showWeek`. The title stays the heading. The greeting, the date and the ISO
  week sit on one line under it.
- `CnAppTilesWidget`, registered as the `app-tiles` widget type. It draws Nextcloud's navigation apps (or a configured
  list) as tiles with a status dot, pinned apps first, an outage badge, a filter field and a "Most used" row.
- `CnGroupedMenu`: one "More" button whose menu holds titled groups over one or two columns, as a WAI-ARIA menu.

## Scope

nextcloud-vue only. Launchpad adopts the pieces in its own change (LpVandaag).
