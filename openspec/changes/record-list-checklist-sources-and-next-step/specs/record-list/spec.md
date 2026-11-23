# record-list-checklist-sources-and-next-step Delta: record-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-checklist-sources-and-next-step](../../)

## ADDED Requirements

### Requirement: A checklist row can say where it comes from

In `presentation: "checklist"` the record list SHALL draw a row's `meta` as a 13px muted line under its title, or with `content.metaAt: "end"` at the row's end. While a row is not done and `content.missingText` is set, that line SHALL read `missingText` instead.

### Requirement: A checklist can mark the next step

`content.next: { when, label?, action?: { labelField?, hrefField? } }` SHALL mark the rows where the local condition `when` holds: the row spans every column on the primary-light ground, its title at 600 with a primary pill `label` (default "Next step") after it, and, when the row carries a label at `labelField` (default `action.label`), a primary button at the row's end that opens the row's `hrefField` (default `action.href`), or dispatches the row's `action` when it has no href.

### Requirement: A record list's header can carry a pill from the answer

`content.headerPillFrom: { path, labels?, colorMap? }` SHALL read the value at `path` of the endpoint's answer (sharing its request) and report it to the card as the header `pill`, its label through `labels` and its tone through `colorMap`, as a row pill reads. Without a value no pill SHALL be reported.

### Requirement: A record list can end with several actions side by side

`content.footerActions` SHALL draw a row of buttons under the list, one per entry `{ label, icon?, variant?, visibleWhen?, ...action }` whose `visibleWhen` (a local condition over the page's record) holds; the first is primary and the others secondary unless `variant` says otherwise. A click SHALL dispatch the entry as `footerAction` does.
