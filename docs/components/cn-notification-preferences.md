---
title: CnNotificationPreferences
---

# CnNotificationPreferences

One screen where a person chooses what notifies them, and finds out why they
are getting what they are getting. Events down, channels across. The catalogue
is the host's, so the component never knows what a "term expires" event is.

## It never shows a setting that does not apply

This is the whole point of the screen, and the one way it can fail while
looking perfect: somebody switches a notification off, keeps receiving it, and
nothing on the page ever said why. Three cases, each handled rather than
hidden.

**A forced cell is locked, and says who forced it and why.** A forced channel
is an administrator saying this kind goes out over this channel whatever
anybody prefers, and OpenRegister applies it *above* the preference rather than
as another default. So it is a fourth level rather than a value in the third:

```
app default  →  group value  →  the person's own  →  FORCED
```

A toggle the person can move which then does nothing is worse than a locked
one, because they believe they have acted. Forcing is about removing the
choice, not about the answer being yes: a channel can be forced **off** as
well as on.

**A channel the instance has not configured is disabled with the reason** the
instance gave.

**A channel refused for this kind and recipient says the rule.** An internal
notice addressed to somebody outside the organisation comes back refused with a
reason. Rendering that as "not available" would read as a configuration gap
somebody should go and fix, when it is a rule working correctly. When a channel
is both unconfigured and refused, the refusal wins: it is the more specific
answer, and fixing the configuration would not change the outcome.

Every lock reason also goes into the toggle's accessible name. A disabled
checkbox with no name is a dead end for a screen reader.

## It is a real table

A grid of checkboxes with no row and column headers is unreadable: every cell
is "checkbox, checked" with no way to know which event or which channel. The
headers are `th` with scopes, the table has a caption, and each toggle is named
with both its event and its channel.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `Array` | `[]` | `{ id, label, group, groupLabel, immediate, appDefault }`, from the host's catalogue. |
| `channels` | `Array` | `[]` | `{ id, label, configured, unconfiguredReason }`. |
| `groupValues` | `Object` | `{}` | `{ [eventId]: { [channelId]: boolean } }` — what an administrator set for the group. |
| `personalValues` | `Object` | `{}` | Same shape — what this person set. An explicit `false` is a choice, not an absence. |
| `forcedValues` | `Object` | `{}` | `{ [eventId]: { [channelId]: { value, by, reason } } }` — a level above the person's own. |
| `refusals` | `Object` | `{}` | `{ [eventId]: { [channelId]: { reason } } }` — what the platform refuses for this recipient. |
| `adminMode` | `Boolean` | `false` | The group-defaults screen. Says a person's own value wins, so an administrator is not surprised when somebody does not get what they set. |

## Events

| Event | Payload | Description |
|---|---|---|
| `change` | `{ eventId, channelId, value }` | A cell was set. Never emitted for a locked cell: the `disabled` attribute is a rendering, the guard in `onToggle` is the rule. |

## What a cell says

| Level | The cell says |
|---|---|
| `app-default` | Follows the app default |
| `group` | Follows your group |
| `personal` | Your choice |
| `forced` | Set by *who*: *why*, and cannot be changed here |

## See also

- `utils/notificationPreference.js` — the four levels and the channel availability, as pure functions.
