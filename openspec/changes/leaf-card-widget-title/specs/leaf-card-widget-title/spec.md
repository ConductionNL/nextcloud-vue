# leaf-card-widget-title Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [leaf-card-widget-title](../../)

## Purpose

A leaf card is titled as the manifest titles its widget.

## ADDED Requirements

### Requirement: A leaf card carries the widget's title

When a detail page's integration widget has a `title`, CnDetailWidgetHost SHALL hand the leaf that title through the
host's translate as both `title` and `titleLabel`, in component mode and in mount mode. A widget without a title SHALL
leave the leaf its own default.

#### Scenario: DqZaakBetrokkenen "Partijen"

- **GIVEN** a case page whose contacts integration widget is titled "Parties", in Dutch
- **THEN** the card is titled "Partijen", not "Contacts"
