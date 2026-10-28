# create-form-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [create-form-widget](../../)

## Purpose

A dashboard card can create one object from fields its manifest declares.

## ADDED Requirements

### Requirement: A dashboard card can create an object from declared fields

The `create-form` widget SHALL draw the fields its `content.fields` declares (text, select, reference, checkbox) and
SHALL create one object in `content.register` / `content.schema` from them and the resolved `content.values`. It SHALL
not create while a required field is empty or a required checkbox is not ticked. A field default MAY be a
`@workspace.<key>` token and SHALL follow the page filter while the reader has not changed the field. A checkbox or
reference field MAY link to the value at `link.from.path` of the option chosen in the select `link.from.field`. After a
create the fields SHALL return to their defaults.

#### Scenario: PqLoyaliteit Aanmelding loyaliteit

- **GIVEN** fields Klant (reference, required), Programma (select from the programmes, default `@workspace.programme`), Geaccepteerde versie van de voorwaarden (default `2026-1`) and the opt-in (required checkbox linking to the programme's `termsUrl`)
- **WHEN** the reader picks a customer, ticks the opt-in and clicks "Loyaliteitsaccount aanmaken"
- **THEN** a customerLoyaltyAccount is created with the customer, the page's programme, the terms version, the opt-in and the declared values (`status: active`, `optInTimestamp: @now`)

#### Scenario: No opt-in, no account

- **GIVEN** the same card with a customer picked and the opt-in not ticked
- **THEN** "Loyaliteitsaccount aanmaken" is disabled and nothing is created
