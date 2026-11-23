# Design: screens-board-top-bar-search

## Touching Nextcloud's search field

`screens-brand-block-top-bar` set the rule that the library never moves,
edits or removes a node Nextcloud drew in `#header`. Nextcloud offers no way
for an app to set the search field's line, so this change makes one narrow,
reversible exception, and only to text:

- It changes the TEXT of `.unified-search-input__label` and nothing else. It
  keeps Nextcloud's own text node when there is exactly one (so Nextcloud's
  renderer still holds the node it patches), and adds, moves or removes no
  element.
- The label is also the search button's accessible name, so screen readers
  hear the same line sighted users see.
- A `MutationObserver` on `#header` writes the line again when Nextcloud
  re-renders the field. It writes only when the text differs, so its own
  write never loops.
- On unmount it puts back the text Nextcloud drew.
- With no header, or a Nextcloud that names the label differently, it does
  nothing and the field keeps Nextcloud's line. The worst case of a Nextcloud
  update is the global line, never a broken field.

The search Nextcloud opens is unchanged; only the resting line differs.

## The brand block width

`DqKop` draws `<a style="width: 237px">` followed, 12px on, by the 1px
divider. The block is 250px. The link now has the 237px; the bar is as wide as
its content.
