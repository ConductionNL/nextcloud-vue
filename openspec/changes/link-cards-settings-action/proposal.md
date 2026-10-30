---
kind: code
screens: [PqGeavanceerdHub]
---

# Proposal: link-cards-settings-action

## Summary

Board PqGeavanceerdHub closes its Beheerder group with a "Persoonlijke instellingen" card ("Alleen voor jou"). Personal
settings live in the app's user settings dialog, not on a page, so the card cannot be a route or a URL. A link card gets
`action: "user-settings"`, the action a menu entry already takes, and opens that dialog.

The same board draws the panel's "Alleen beheerders" badge in the purple tone, 21px high with a 14px icon, and puts each
card's chevron at the top of the card, beside the title.

## What changes

- `card.action: "user-settings"`: the card opens the user settings dialog through the injected `cnOpenUserSettings`, on a
  click or on the space key, and carries `role="button"`. Outside a host that offers the dialog the card is left out, as a
  card whose route does not resolve is. `action` is exclusive with `route` and `href`.
- `panel.badge.tone`: `primary` (default) or `purple`. The badge sits on a normal line with a 14px icon.
- Board look: the trailing icon keeps to the top of the card (`align-self: flex-start`); the icon library's own
  `align-self: center` centred it.
