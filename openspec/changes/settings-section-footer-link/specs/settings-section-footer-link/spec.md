# settings-section-footer-link Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-section-footer-link](../../)

## Purpose

A settings card can say where its list is managed.

## ADDED Requirements

### Requirement: A settings section can end with a link

With `footerLink: { label, href }` CnSettingsSection SHALL draw the label as a link to the href at the end of the card,
after its content. Without a label or an href, or with an href that is not safe, it SHALL draw no link.

#### Scenario: Leges beheren in shillinq

- **GIVEN** the fee rules section with `footerLink: { label: "Leges beheren in shillinq", href: "/apps/shillinq/..." }`
- **THEN** the card ends with that link
