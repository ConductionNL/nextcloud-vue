# Proposal: create-form-widget

## Why

Board PqLoyaliteit draws an "Aanmelding loyaliteit" card beside the reporting: a customer, a programme, the terms
version accepted, the customer's opt-in with a link to the programme terms, and "Loyaliteitsaccount aanmaken". The
library had form-shaped widgets (CnFormWidgetBase, the interaction form) but none that creates an object from fields a
manifest declares, so the only way to draw the card was an app-specific widget, which the custom-widget ratchet
(ADR-049) forbids.

## What changes

A `create-form` dashboard widget (CnCreateFormWidget) on CnFormWidgetBase. Its `content` names the register and schema
and lists the fields: text, select (options from `optionsFrom`), reference (a search over a schema) and checkbox. A
field may be required (a checkbox then has to be ticked), may take its default from a page filter
(`@workspace.<key>`), and a checkbox or reference field may carry a link to a value of the option chosen in a select.
`values` are written with every create after token resolution (`@now`). `optionsFrom.keepFields` lets an option carry
values of its row along for that link.

## Scope

New widget, its registration and export, `optionsFrom.keepFields` (util and schema). No existing widget changes.
