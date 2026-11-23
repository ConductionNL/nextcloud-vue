---
kind: code
---

# Proposal: index-header-open-form

## Summary

The shillinq boards put "Nieuwe factuur" in the header of a list, and the button opens the create form over the list.
An index page's `headerActions` already accept the typed action (`$defs/action`, `type: "open-form"`), which a detail
page and the navigation's primary action run through CnActionButtons. On an index page the entry only emitted
`header-action`: no form opened.

CnIndexPage now hands the header actions of `type: "open-form"` and `type: "open-modal"` (without a `handler`) to a
CnActionButtons instance that draws nothing and owns the dialog, as CnDetailPage does. A header button
(`headerButtons[].action` naming the entry), the header Actions menu and the actions bar's menu all run it. After a
create the list reloads.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: `dialogHeaderActions`, `onHeaderAction`, `onHeaderActionCreated`.
- No schema change: `headerActions[]` is `$defs/action`, which already lists `open-form` and `open-modal`.
- Entries with a `handler`, and every other type, behave as before. `header-action` is still emitted on every click.
