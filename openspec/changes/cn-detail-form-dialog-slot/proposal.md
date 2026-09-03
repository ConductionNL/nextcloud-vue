# CnDetailPage form-dialog slot

## Why

`CnIndexPage` exposes a `form-dialog` slot, so an app can replace the
create/edit dialog and adjust the form it renders. `CnDetailPage` exposed no
equivalent seam: its two `CnFormDialog` children (the create archetype's empty
form and the record edit form) were hard-wired, and the only schema they could
ever render was the one the store returned.

The measured consequence is decidiq#1109. decidiq moved its decision types out
of the schema `enum` and into stored configuration served from
`GET /apps/decidiq/api/v1/decision-types` (decidiq#1099), which left the schema
enum deliberately empty. On index pages decidiq replaced the dialog through the
`form-dialog` slot and spliced the vocabulary back in client-side. On detail
pages there was nowhere to splice, so the user is shown an empty required
picker: a form that cannot be completed.

This is a class, not one app's instance. Any app whose form vocabulary is
runtime configuration rather than stored schema hits it on every detail page,
and today has no answer short of forking the component.

## What changes

Add a `form-dialog` scoped slot to `CnDetailPage` with the same name and the
same scope as `CnIndexPage`'s: `{ show, item, schema, confirm, close }`.

One slot covers both of the page's dialogs. They are mutually exclusive, since
create mode is by definition a page with no object id, so `item` is the record
when editing and `null` (or the route prefill) when creating, exactly as a null
`item` means "create" on `CnIndexPage`.

`confirm` additionally resolves to a `{ success: true, data }` / `{ error }`
result. `CnFormDialog` sets `loading` on submit and only `setResult` clears it,
with `no-close` bound to `loading`; a replacement holds no ref the host can
reach, so without a returned result its modal would stay locked open on both
success and failure. The two existing confirm handlers now return that result
in addition to everything they already did.

## Alternatives considered

**A `schemaTransform` / `formSchema` function prop applied before render.**
Rejected. It is strictly less capable than the slot (it can adjust the schema
but never replace the dialog), and it would be a second mechanism for a job the
slot already does. An app author would then have to learn one contract for
index pages and a different one for detail pages, and pick between them per
case. The transform case costs four lines under the slot: render `CnFormDialog`
inside it with a transformed copy of the schema, which is what the component
docs now show.

**Both.** Rejected for the same reason. The only argument for the prop was
brevity in the transform case, and the slot's version of that case is already
short.

## Impact

- Affected consumers: all. The slot is additive; a page that passes no slot
  renders the same two dialogs, wired the same way, with the same `v-if`
  conditions. The default children are unchanged and still bind their own
  `@confirm` / `@close`.
- Backward compatibility: no behaviour change on upgrade. The two confirm
  handlers gained return values that nothing on the default path reads.
- Theming: none.
