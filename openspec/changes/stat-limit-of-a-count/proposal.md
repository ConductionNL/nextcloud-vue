# Proposal: stat-limit-of-a-count

## Why

pl4 on board PqWachtrij: the third tile reads "Binnen de termijn 9 van 12", the open queue tickets within their deadline
out of all of them, in one headline. A stat tile's limit comes from a static `limit` or a field of an endpoint payload,
and draws as a quieter "/ 12" that turns the tile amber when the value reaches it. A count of other records cannot be
the limit, and "9 van 12" is not a capacity.

## What changes

- `content.limitSource` (`{ register?, schema?, metric?, field?, filter?, via? }`, register and schema default to the
  tile's source): the limit is that count, read beside the value. A failed read leaves the limit out.
- `content.limitStyle: "of"`: the value and the limit draw as one headline, "9 of 12" (nl "9 van 12"), and reaching
  the limit does not tint the tile.
- Without these keys a tile is as before.
