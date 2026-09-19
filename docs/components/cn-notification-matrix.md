---
title: CnNotificationMatrix
---

# CnNotificationMatrix

One screen where a person chooses what notifies them, and finds out why they
are getting what they are getting. Events down, channels across. The catalogue
is the host's, so the component never knows what a "term expires" event is.

## It is not `CnNotificationPreferences`, and does not replace it

[`CnNotificationPreferences`](cn-notification-preferences.md) is a
self-contained settings pane. It takes no props, fetches for itself, scopes to
the app whose settings modal is open, and `CnAppRoot` mounts it as the default
of its `#user-settings` slot. Nothing has to be passed to it and nothing has to
change for it to keep working.

This is the full screen, for a host that has a catalogue of its own: four
levels rather than two, a channel axis, scopes, a digest and a test send. It
renders what it is given and fetches nothing by itself.

Use `CnNotificationPreferences` when you want the pane an app gets for free.
Use this when the host owns the catalogue and can answer for the layers.

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

## A preference is set globally, or for one kind of case

"Tell me when a term expires" is usually too much, and never is too little, so
somebody chooses never and then misses the one that mattered. A row can be
narrowed to one case domain or record type: the event row is the global one,
and scoped rows sit indented under it.

**The narrower row wins, and only where it applies.** A scoped row is not a
different preference. It is the same preference asked a narrower question, so a
notification about an objection reads the objection row and everything else
still reads the global one. A scope that replaced the global row would silence
every other domain the moment somebody narrowed one.

**An absent scoped cell is an unanswered question, not a no.** It falls through
to the global row, and the cell says so, because the checkbox shows the same
state either way.

**The global row is always rendered**, even when every value is scoped. It is
the row somebody widens back to.

The values are nested, `{ [eventId]: { [channelId]: { [scope]: boolean } } }`,
rather than joined into one key. A joined key needs a delimiter that can appear
in neither an event id nor a scope, and a scope is a case domain or a record
type named by whoever configured the app: there is no such character anybody can
promise.

**Only events in the catalogue are listed.** A stored preference for an event
that no longer exists is not rendered, because a switch for something that can
no longer happen is a lie. The store drops it on the next write rather than in a
sweep, so no row outlives the screen that would have shown it.

## The digest, and what it cannot hold

Per channel: send each one as it happens, once a day, or once a week, with a
time of day once something is being held. Events the app marks immediate are
never held. The row names them, and the digest control repeats the rule where
somebody is deciding to switch batching on.

## The test send

A button per usable channel, which delivers to the person looking at the screen
and reports what came back. A refusal is a result, not a failure to answer:
"refused, because" is the sentence somebody needs. A test send that silently did
nothing would be worse than no button, because it would read as proof the
channel works.

## The store

`useNotificationPreferencesStore` reads the catalogue, the values, the forced
rows and the refusals in one request, and keeps no copy beyond the page.
Preferences are read by the server when something happens, not by this screen,
so a cached copy that outlived the page would let somebody open it and be
looking at a setting an administrator has since forced.

A write is optimistic and **rolls back when the server refuses it**. A checkbox
that waits for a round trip feels broken, but optimism without a rollback is a
screen showing a setting the server never accepted, which is the failure this
whole screen exists to prevent.

The store never writes the forced rows. They are the administrator's, they sit
above the person's own preference, and a screen that could write them would
offer to overrule the thing that exists to overrule the person.

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
| `scopedValues` | `Object` | `{}` | `{ [eventId]: { [channelId]: { [scope]: boolean } } }` — this person's narrower rows. Separate from `personalValues` so the global row keeps the flat shape every existing caller passes. |
| `scopeChoices` | `Array` | `[]` | `{ id, label }` — the case domains or record types a row can be narrowed to. |
| `digest` | `Object` | `{}` | `{ [channelId]: { mode, timeOfDay } }` where mode is `off`, `daily` or `weekly`. |
| `testResults` | `Object` | `{}` | `{ [channelId]: { ok, message } }` — the last test send. A refusal belongs here as much as a success. |

## Events

| Event | Payload | Description |
|---|---|---|
| `change` | `{ eventId, channelId, scope, value }` | A cell was set, on the row named by `scope` (the empty string for the global row). Never emitted for a locked cell: the `disabled` attribute is a rendering, the guard in `onToggle` is the rule. |
| `add-scope` | `{ eventId, scope }` | A row was narrowed, from the row itself. |
| `digest-change` | `{ channelId, mode, timeOfDay }` | A channel's digest was set. Both fields are always sent, so changing one never silently clears the other. |
| `test-send` | `{ channelId }` | A test was asked for. |

## What a cell says

| Level | The cell says |
|---|---|
| `app-default` | Follows the app default |
| `group` | Follows your group |
| `personal` | Your choice |
| `forced` | Set by *who*: *why*, and cannot be changed here |

A scoped cell nobody has answered says **Follows the row above** instead.

## See also

- [`CnNotificationPreferences`](cn-notification-preferences.md) — the self-contained pane this sits beside.
- `utils/notificationPreference.js` — the four levels and the channel availability, as pure functions.
- `utils/preferenceScopes.js` — which row applies, which rows to render, and pruning to the catalogue, as pure functions.
- `composables/useNotificationPreferencesStore.js` — the reads and writes.
