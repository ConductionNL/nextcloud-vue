# Design: the notification preferences screen

## Component and surface

A new `CnNotificationPreferences` under `src/components/`, placed by an
app in its personal settings and its admin settings, plus a preferences
store plugin.

Kind: code.

## D1. A matrix, because the question is two-dimensional

Events down, channels across. A list of events with a single on and off
cannot express "notify me in the app about everything and by mail only
about a term that is about to expire", which is the setting every
handler actually wants. Kanboard needs three tables for this because it
is genuinely three questions: which user, which type, which project.

## D2. The host owns the catalogue

The component receives the events and the channels. It does not know what
they are, does not translate their names and does not decide which
combinations are possible. An app that adds an event adds a line to its
catalogue, not a patch to the library.

A channel the instance has not configured renders disabled with the
reason, rather than letting somebody choose a channel that will never
deliver.

## D3. Three levels, and the screen shows which one you are looking at

The app's default, the group value an administrator set, and the user's
own. The narrowest set value wins. Each cell shows where its current
value came from, and a cell the user has not touched says it is following
the group or the default. Without that, a user who receives something
they switched off has no way to find out why, and the support question
that follows is unanswerable.

## D4. Scope is a row property, not a second screen

A row can be set globally, or for one case domain or record type. The
scoped rows sit under the global one, indented, and a scope is added from
the row itself. A separate screen per scope would multiply the same
matrix by thirty case types.

## D5. A digest is a delivery choice, not an event choice

Off, daily or weekly, with a time. It applies to the channel, not to the
event, because the reason for a digest is the volume arriving in one
place. An event marked immediate by the app is never held in a digest,
and the screen says which those are.

## D6. Test send, because a channel is either configured or it is not

One button per channel sends a test to the person on the screen. It
proves the transport, the address and the template in one act. The
alternative is discovering on a Friday afternoon that the term warning
went to an address nobody reads.

## Risks

- **A matrix of forty events by five channels.** That is two hundred
  cells and nobody reads it. Events are grouped by the app's own
  categories, groups collapse, and a whole row or column is set at once.
- **An administrator who switches everything off for a group.** The
  user's own value still wins, and the admin screen says so where it is
  set, so the group value reads as a default rather than a lock.
- **Preferences that outlive their event.** An app that removes an event
  leaves stored preferences behind. The screen lists only events in the
  current catalogue, and the store prunes the rest on write rather than
  keeping a growing file of settings for things that no longer happen.
- **Two stores.** The preference lives in OpenRegister under ADR-031. The
  component keeps no copy beyond the page.
