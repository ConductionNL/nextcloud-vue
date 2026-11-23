---
kind: code
---

# Proposal: one-follow-control

## Summary

Following and favourites are one feature now (OpenRegister `merge-follow-and-favourites`, decided by Ruben on 2026-10-09 while reviewing the dossiq board DqMijnWerk). A favourite is a follow with notifications off. This change gives the library one Follow control with a notifications switch, drops the star from `CnDetailPage` and `CnIndexPage`, and folds the Favourites lens into Following.

## What changes

- `CnFollowToggle` is the one control: the Follow toggle (eye icon, "Follow" / "Following"), and while following a bell that turns the follow's notifications on or off (`PUT .../watch` with `{"notify": bool}`), bound to `@self.watchNotify`. A `compact` mode draws the toggle as an icon only, for a list column. The bell is not offered when the register sends no change notifications (`notifies` false).
- `CnDetailPage` renders only `CnFollowToggle` beside the title. Its `favourite` prop is deprecated and ignored, so a manifest that still sets `config.favourite` stays valid.
- `CnIndexPage` gains `showFollowColumn` (a compact `CnFollowToggle` per row, bound to `@self.watching`); `showFavouriteColumn` is a deprecated alias of it.
- `personalLenses`: one Following lens (`watching`, `_watching`). `favourite` is a deprecated alias of it; asking for both gives one tab. The Favourites tab is gone.
- `setWatching()` and the interactions store's `watch()` take `{ notify }`. `setFavourite()`, the store's `favourite()` / `unfavourite()` and `CnFavouriteToggle` are deprecated; they keep working because OpenRegister answers the favourite routes as a quiet follow for one release.

## Versioning

A minor release. No prop, export or manifest key is removed: the star props and keys are deprecated and either ignored (`favourite`) or aliased (`showFavouriteColumn`, the `favourite` lens). The only visible change is that the star no longer renders, which is the decision.

## Out of scope

- Removing `CnFavouriteToggle` and the deprecated props: the next major, with Ruben's permission.
- keepiq's private secret favourites and Task's own watchers (named in the OpenRegister proposal as later candidates).
