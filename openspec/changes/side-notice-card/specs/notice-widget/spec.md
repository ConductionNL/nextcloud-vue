# notice-widget Delta: side-notice-card

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [side-notice-card](../../)

## Purpose

Draw a toned notice beside a record, as the boards do.

## ADDED Requirements

### Requirement: A notice card for the side column

Widget type `notice` SHALL render CnNoticeWidget: one box with `role="note"`, the tone and icon of `content.variant` (`info` by default, `warning`, `error`, `success`; any other value reads as `info`), `content.icon` replacing the variant's icon, and `content.title` in bold followed by `content.text`, both through the host translate. Without a title and a text it SHALL render nothing. In a detail page's side column it SHALL show only while its `visibleWhen` holds.

#### Scenario: Special category data

- **GIVEN** a case page whose side column holds a `notice` with `variant: "warning"`, a title and a text, and `visibleWhen` on the case type's special categories
- **WHEN** a youth care case renders
- **THEN** one amber box shows the warning icon, the bold title and the text, and on a permit case it is absent
