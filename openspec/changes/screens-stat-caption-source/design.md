# Design: screens-stat-caption-source

- `captionSource` = `{ register?, schema?, metric?, field?, filter?, via?, zeroText? }`. Register and schema default
  to the tile's `source`; the read is the same aggregate (or list total) read the value uses, with the same filter
  tokens.
- `{count}` in `caption` is that count. `captionVariantWhen` tests that count instead of the tile's value, so the
  line turns red on what it says.
- Zero: the caption is left out, or reads `zeroText`. Not read, or failed: the caption is left out; it never shows a
  zero it did not count. The tile's own number is not affected.
- The count is read again whenever the value is (source change, page refresh).
