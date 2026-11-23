# Design: screens-admin-settings-board-header

- `ownLookClass`: `cn-look-board` on the shell root only when the shell's own `look` prop is `board`. Under a CnAppRoot
  that provides the look, an ancestor already carries the class, so nothing changes there. The four rules that style
  the shell element itself (frame, grid, children spanning, cards) gain a `.cn-look-board.cn-admin-settings-shell`
  variant. Every other board rule matches descendants, and the root class reaches those.
- `breadcrumbs: [{ label, href? }]` draws, in place of the description, a `<nav aria-label="Breadcrumb">` of the
  crumbs with `/` separators (`aria-hidden`), the last crumb `aria-current="page"`, then `·` and `breadcrumbNote`.
  Values from the board: 15px, `--color-text-maxcontrast`, gaps 8px (line) and 6px (crumbs), links in the primary
  colour, underlined.
- Under the board look, `.settings-section.cn-settings-section--wide` gets `width: auto; max-width: none`, and its
  `__name` / `__desc` get `max-width: none`. That holds also where the section is the whole page rather than a grid
  card. The nextcloud look keeps NcSettingsSection's width. CnSettingsPage passes `section.wide`, so a nextcloud-look
  settings page is unchanged.
