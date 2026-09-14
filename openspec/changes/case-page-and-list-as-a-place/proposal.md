---
kind: code
---

# Proposal: case-page-and-list-as-a-place

## Summary

A handler working a queue of four hundred cases navigates, opens, reads,
goes back and loses their place. Make the list and the case a place they
stay in: the list and one open case side by side, next and previous
inside the list, the active tab in the URL, a preview on a reference, and
a product that remembers what each person last used.

Round 4 discovery cluster 58, "The case page and the list as a place"
(`procest/_round4/discovery/build-plan.md` in
ConductionNL/market-intelligence, 2026-09-14). Owner nextcloud-vue, size
M, no decision blocks it. The cluster's mechanism line: extend
nextcloud-vue `saved-view-as-a-place` and the list components; dossiq
consumes. Two other nextcloud-vue clusters depend on this one, cluster 3
and cluster 15, which is why it is first in the wave.

## Candidates

Seventeen, all of them. dossiq fails fourteen.

| candidate | relevance | driven passers | dossiq |
|---|---|---|---|
| C-search-30 list and case side by side, scroll position kept | should | openproject | no |
| C-search-25 next and previous inside the list | should | frappe-helpdesk | no |
| C-case-core-36 active tab in the URL, so a tab is linkable | could | opencase | no |
| C-search-4 preview card on a reference, without leaving the page | could | openproject, tuleap | no |
| C-search-19 manual ordering of list items, held | could | forgejo, gitea, gitlab | no |
| C-search-14 per-user ordering of the shared lists | could | zammad | no |
| C-search-34 last used view remembered per user and record type | could | taiga | no |
| C-search-40 absolute or relative date display, chosen by the user | could | tuleap | no |
| C-search-24 results as cards rather than rows | could | none, decos-join documented | no |
| C-configuration-27 personal landing screen and pinned navigation | could | freescout, gitlab | no |
| C-configuration-55 per user interface preferences | could | glpi, otobo, valtimo, znuny | partial |
| C-configuration-35 per user override of a product setting | could | otobo | no |
| C-configuration-68 switch personal customisation off instance wide | could | xxllnc-zaken | no |
| C-case-core-9 case renamed after creation | could | freescout | yes |
| C-access-and-privacy-4 skip link to the primary case action | could | xxllnc-zaken | unread |
| C-access-and-privacy-37 high contrast marking on a widget | could | valtimo | no |
| C-access-and-privacy-78 WCAG conformance stated by the supplier | should | none, atabix documented | partial |

The cluster reads 17 passers, 15 driven and 2 documented, proving system
otobo.

## The decisions it rests on

- **D6**, relevance-led promotion. The cluster carries no `must`, and
  every member enters on its driven passers.
- **D21**, documented-only candidates are admitted and labelled.
  C-search-24 and C-access-and-privacy-78 have no driven passer. Both are
  labelled documented wherever they appear.
- **D17**, a broad market including MKB, so nothing here is dropped for
  being small. Two members are not component work at all and say so below
  rather than being quietly dropped.

## The proving passers

- **OpenProject** is the split view, measured: the work package list at
  `/work_packages/:id/split_view` with a `with_split_view` concern, and
  hover cards at `/work_packages/:id/hover_card`, `/users/:id/hover_card`
  and `/project_phases/:id/hover_card`.
- **Frappe Helpdesk** is next and previous, measured:
  `get_navigation_tickets`, `get_navigation_filters` and
  `get_navigation_order_by` in `hd_ticket/api.py`. The navigation knows
  which list you came from, which is the part that is easy to get wrong.
- **OTOBO** is the preferences surface: `AgentPreferences.pm`,
  `CustomerPreferences.pm`, and a per-user override of a product setting
  in `AdminSystemConfigurationUser.pm`.
- **Tuleap** lets a person choose absolute or relative dates at
  `/account/appearance` and `/account/dates-display`. The municipal
  reason is in the candidate note: "3 dagen geleden" against a statutory
  term is a real reading hazard.
- **Zammad** orders the shared lists per agent
  (`config/routes/user_overview_sortings.rb`).
- **Taiga** remembers the last used view per user and record type
  (`user-project-settings`).
- **xxllnc Zaken** switches personal dashboard customisation off for the
  whole instance, from Configuratie, Gebruikers.

## What nextcloud-vue builds

- **Split view.** The list and one open record side by side, the list
  keeping its scroll position and its selection. A narrow screen falls
  back to the full page, and the same route works in both.
- **Next and previous inside the list you came from.** The detail page
  knows the list, its filter and its sort, and steps through it without
  going back.
- **The active tab in the URL.** A link points at a tab of a record, not
  at the record.
- **A preview card on a reference.** Hovering or focusing a reference to
  another record shows its summary in place. Focus, not only hover, so it
  works from a keyboard.
- **Manual ordering, held.** A list the user drags into an order keeps
  it, per user, per list.
- **Per-user ordering of the shared lists** in the navigation.
- **Last used view remembered**, per user and per record type.
- **A date display choice**, absolute or relative, per user.
- **A personal landing page and pinned navigation entries**, and an
  instance switch that turns personal customisation off.
- **A skip link to the primary action** on a detail page, and a widget
  that declares high contrast.

## How dossiq consumes it

dossiq turns the split view on for `#Cases` and `#Queue`, declares the
tab key on `#CaseDetail` and declares the reference preview for its case
and party links. Renaming a case already works
(`src/manifest.json#CaseDetail`, one of the twenty candidates the sweep
overturned against `development`), so that member is a `yes` this change
keeps rather than builds. The preferences live in Nextcloud's own
personal settings, which dossiq already partly uses
(`src/personalSettings.js`), so the component reads them and does not
store them.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, `CnDetailPage`, the manifest router and
  navigation builders, `useListView`, `useDetailView`, a new
  `CnReferencePreview` and a preferences store plugin.
- Consumers: all five named in `openspec/config.yaml`, and every app with
  a list and a detail page.

## Backward compatibility

Every key is additive with a default. A page declaring none of them
renders exactly as it does today: a full-page list, a full-page detail,
no split, no preview and no remembered view.

## Theming

Nextcloud CSS variables only. The high contrast marking on a widget is a
declared flag the theme reads, not a colour the component picks.

## Existing specs it extends

`index-page` (the list, its scroll and its selection), `use-detail-view`
and `use-list-view` (the navigation between them), `detail-page-grid`
(the tabs), `saved-view-as-a-place` (the route a view already owns) and
`wcag-a11y-anchor` (the skip link and the focus path).

## Size

M. Seventeen members, but nine of them are one preference each over a
store the library already has.

## Dependencies

None blocking. `saved-view-as-a-place` (#1154) is on `development` and
gives the list a route the split view and the preferences hang off.
Cluster 3 and cluster 15 both depend on this change, so it goes first.

## Out of scope, and why

- **C-access-and-privacy-78, stating WCAG conformance as a supplier.**
  This is a procurement claim about Conduction, not a component. It
  belongs in the fleet's accessibility statement, and the fleet already
  gates on WCAG AA. Recorded here, built nowhere, labelled documented.
- **C-configuration-68, switching personal customisation off instance
  wide.** The switch is an admin setting in the consuming app. The
  library reads it and obeys it; it does not own it.
- Storing the preferences. Nextcloud's personal settings own them.
- The layout of a case page per case type. That is buildiq, cluster CT-6.
