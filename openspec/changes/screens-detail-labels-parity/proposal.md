---
kind: code
---

# Proposal: screens-detail-labels-parity

## Summary

Detail page labels from the round 6 app lanes that stay English for a Dutch
user (round6/dossiq/library-gaps.md 14, round6/portaliq/library-gaps.md and the
coordinator's PtAccount note):

1. dossiq DqZaak: the body tab strip reads "Overview, Documents, Contact,
   Tasks, History" although the app catalogue holds "Overzicht, Documenten".
   CnTabsWidget prints `tab.label` (and the child widget's title) as written.
2. portaliq PtAccount: the side History card reads "Auditlogboek" although the
   manifest titles the widget "Historie". The detail widget host hands a
   self-titled card (audit trail) its content but not the manifest title, so
   the card falls back to its own default "Audit trail".
3. Library strings on detail pages have no Dutch: "Show all {count} fields",
   "Show less", "No audit entries yet", "No meetings", "Open in Calendar" and
   the rest of the calendar card, the object-list widget's empty and footer
   lines, the required-app set-up state.
4. The boards name the activity "Historie"; the library's Dutch for "History"
   read "Geschiedenis".

## What changes

1. A tab label (authored, or the child widget's title) goes through the host's
   translate (`cnTranslate`). The library's own History stays a library string.
2. Under the board look, a self-titled card renderer that declares a `title`
   prop gets the manifest title through the host's translate, or History for
   an untitled activity widget. `content.title` still wins; a tab panel (bare)
   and a renderer without a `title` prop get nothing.
3. An integration card's title goes through the host's translate (CnDetailCard
   prints its title as given).
4. Dutch and English catalogue entries for the strings in point 3; "History"
   reads "Historie" in Dutch.

Translation fixes apply in both looks; the card title is board look only.

## Not in this change

- dossiq 15: the "Core case data / Woo publication / Handled elsewhere"
  headings are dossiq's own CaseSectionsWidget (`{{ section.label }}`), app work.
- "(optional)" in form dialogs: PR #1456.
