# header-action-href Delta: header-action-href

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-action-href](../../)

## Purpose

A header action that only opens another page is a real link, so the reader can middle-click it, open it in a new tab, copy its address or bookmark it.

## ADDED Requirements

### Requirement: A header action href resolves to a URL on this instance or an allowed scheme

An `http(s)://`, `mailto:` or `tel:` URL and a protocol-relative `//host/...` URL SHALL be used as written. A path starting with `/index.php/`, `/remote.php/`, `/public.php/` or `/ocs/` SHALL be prefixed with `getRootUrl()`, and SHALL be used as written when it already starts with the root followed by one of those entry points. Any other path starting with `/` SHALL go through `generateUrl()`. Anything else (`javascript:`, `data:`, a relative path, an upper-case scheme) SHALL resolve to nothing, with a one-time warning, and the entry SHALL render as a button without a link.

#### Scenario: An instance path

- **GIVEN** Nextcloud installed under `/nc`
- **WHEN** a header action has `href: "/apps/integriq/connections?app=stackiq"`
- **THEN** its link points at `/nc/index.php/apps/integriq/connections?app=stackiq`

#### Scenario: An entry point already under the root

- **GIVEN** Nextcloud installed under `/nc`
- **WHEN** a header action has `href: "/nc/remote.php/dav"`
- **THEN** its link points at `/nc/remote.php/dav`

#### Scenario: A script URL

- **WHEN** a header action has `href: "javascript:alert(1)"`
- **THEN** it renders without a link and a warning names its id

### Requirement: A header action with href is a link that runs and emits nothing

A `headerActions[]` entry with a non-empty string `href` SHALL render as an `<a href>` with the resolved URL, opening in place unless `target` is `"_blank"`, on every surface that renders header actions: the actions bar overflow menu and the board header's Actions menu and header buttons on an index page, the Actions menu and the quick and stage-primary buttons on a detail page, the header buttons on a dashboard page and the header buttons on a reports page. Clicking it SHALL run no handler and SHALL emit no `header-action` or `primary-action`. A function `handler` on such an entry (JS composition) SHALL be dropped with a one-time warning naming the id. A header action's `children[]` SHALL be resolved the same way where children render, which is the dashboard header.

#### Scenario: The same entry on every index page surface

- **GIVEN** an index page whose header action `{ id: "js", href: "/apps/x", handler: fn }` is also named by a header button
- **WHEN** the reader clicks it in the actions bar, the board header's Actions menu or the header button
- **THEN** each is an anchor to the resolved `/apps/x`, `fn` is not called and no `header-action` is emitted

#### Scenario: A link child on the dashboard header

- **GIVEN** a dashboard header action with a child `{ id: "docs", href: "/apps/x/docs" }`
- **THEN** the child renders as an anchor to the resolved URL in the action's dropdown
