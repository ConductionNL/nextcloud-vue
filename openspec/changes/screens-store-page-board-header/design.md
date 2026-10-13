# Design: screens-store-page-board-header

- `.cn-look-board .cn-store-page:not(.cn-look-nextcloud *)` joins the frame rule: `padding: var(--cn-board-content-padding)`
  (24px 28px), `max-width: var(--cn-board-content-max-width)`, `margin-inline: 0`. That beats the page's scoped
  `padding: 16px; max-width: 1200px`.
- `.cn-store-page__header` joins the inset rules: `padding-inline-start: 0`, and `56px` under
  `.cn-look-board:has(.app-navigation--closed)`.
