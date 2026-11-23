# Design: abstract-sections-widget

- Children render through CnDetailWidgetHost with `chrome="bare"`, the same
  dispatch CnTabsWidget uses, so a child is the same widget in a section as in
  a tab.
- Emptiness is measured, not declared: a MutationObserver per host, content =
  non-blank text or an img/svg/canvas/table/form control (the rule dossiq's
  CaseSectionsWidget proved on live case pages). The host stays mounted while
  empty (`display: none` on the section), because a widget that is not mounted
  cannot fetch. `filled` is written only on a change, and first measured on the
  next tick, never inside the ref callback.
- `fit: false` is set on children that do not set `fit`: an object list fits
  its rows to its grid cell measured from where its table starts, which is
  wrong for a list stacked under another section (measured on dossiq: one of
  two objects did not render).
- Two columns when any section has `column: "side"`: `grid-template-columns:
  minmax(0, 1fr) minmax(280px, 418px)`, gap 20px (PtPortalInstellingen: main
  635px, side 417px, 21px apart at 1440). One column below 1024px.
- Cards use `--cn-board-card-radius` / `--cn-board-card-padding` under the board
  look, else the Nextcloud large radius and 16px 20px. Colours are Nextcloud
  variables.
- Registered `container: true`, `ownsTitle: true`, `surfaces: ['detail-page']`.
