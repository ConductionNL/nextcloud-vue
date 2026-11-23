# Proposal: saved-view-summary-reads-like-the-chips

## Why

"Weergaven in mijn menu" (DqPersoonlijkeInstellingen) showed under Woo-verzoeken "caseType 3c0f5a00-..., 
statusHiddenInLists nee, isDraft nee" (Ruben, 23 Oct). Two causes. The line named filters only from the page schema,
and a failed schema read was cached for the session, so every filter fell back to its raw key and a reference to its
uuid. And it listed every filter, also the working-list rules every view of the page carries (not a draft, status not
hidden in lists), which tell one view from another in nothing.

## What changes

- The line names a filter as the Active line does: the page's `filterLabels` entry first, then the schema.
- A `filterLabels` entry may say `hidden: true`; the menu settings line and the side panel's view summary leave that
  filter out. The Active line is unchanged.
- A failed schema read is forgotten, so the next opening asks again.

## Scope

savedViewSummary.js, CnSavedViewMenuSettings.vue, CnIndexPage.vue (`viewFilterSummary`, prop doc). No schema change:
`filterLabels` entries are free objects.
