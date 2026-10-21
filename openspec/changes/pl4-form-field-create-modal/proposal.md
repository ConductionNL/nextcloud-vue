# Proposal: a reference field names its create dialog, and a field can show a hint under it

## Why

pipelinq's lead form creates a client or a contact from the picker with the app's own dialogs: the client needs a server-minted contact, and the contact dialog carries the client already chosen on the lead. CnFormDialog could only open the dialog the index page of the referenced schema declares, without anything from the form, so the lead form stayed a bespoke component. The same form shows a line under a field that follows its value, which a generic form had no place for.

## What changes

- A field (or `fieldOverrides` entry) can declare `createModal`: the registry key of a `kind: 'modal'` dialog the select-or-create picker opens, ahead of the page that lists the referenced schema. `createModalProps` adds props, where `@answer.<key>` is another answer of the form.
- A select-or-create field can declare `pickerFilter`: filters its options are scoped by, with `@answer.<key>` tokens.
- A field can declare `hintWidget`: a registered component mounted under its control with `field`, `value` and `formData`. The slot `#field-{key}-hint` does the same from a host template and wins over the widget.
- Manifest schema 2.141.0 declares `createModal`, `createModalProps`, `pickerFilter` and `hintWidget` on a field override.

## Impact

Fields without these keys are unchanged. A `createModal` that is not a registered modal is ignored, and the picker creates as before.
