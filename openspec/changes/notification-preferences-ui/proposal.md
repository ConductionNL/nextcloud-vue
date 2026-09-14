---
kind: code
---

# Proposal: notification-preferences-ui

## Summary

An alert nobody can turn off is an alert everybody ignores. Give a person
one screen where they choose which events notify them and over which
channel, an administrator the same screen for a group, and a digest so a
handler on forty cases does not get three hundred mails a day.

Round 4 discovery cluster 10, "Notification preferences, per user, per
group and per template" (`procest/_round4/discovery/build-plan.md` in
ConductionNL/market-intelligence, 2026-09-14). Owner openregister, size
L. Its mechanism line: extend openregister's notification dialect
(ADR-031) with per-user routing; dossiq ships the templates. This change
is the preferences surface, which is a shared component, not a per-app
screen written six times.

## Candidates

Four of the cluster's nine have a user interface. The other five are
routing, transport and templates, and stay with openregister and
integriq.

| candidate | relevance | driven passers | dossiq |
|---|---|---|---|
| C-communication-29 per-user choice of notification kind and channel | must, matrix hole | dimpact-zac, freescout, odoo | no |
| C-communication-46 notification preferences scoped to one case domain or record type | should | kanboard, openproject, taiga, vikunja | no |
| C-communication-34 group-level alert settings set by an administrator | should | dimpact-zac | no |
| C-communication-47 digest notification mail, daily or weekly, per user | should | plane, request-tracker | partial |

C-communication-29 is one of the twenty-five loudest gaps in the sweep, a
`must` with three driven passers and a marked matrix hole: the corpus has
no row to hold it.

## The decisions it rests on

- **D6**, relevance-led promotion. Every `must` enters, and
  C-communication-29 is a `must` and a matrix hole, which is exactly the
  class D6 was answered to admit.
- **D17**, the product serves a broad market including MKB. A digest and
  a per-scope override are as useful to a ten-person office as to a
  gemeente, and nothing here is dropped for being small.

## The proving passers

- **Kanboard** is the per-scope override, measured: Configure this
  project, Notifications, over `user_has_notifications`,
  `user_has_notification_types` and `project_has_notification_types`,
  across web, mail, webhook and activity stream (`menu-tree.md`,
  `code-census.md`). Four storage tables, because per-user, per-type and
  per-project are three different questions.
- **Dimpact ZAC** is the municipal shape: Signaleringen, per user and
  with an admin screen beside it
  (`browser-walkthrough-notes.md`).
- **Plane** is the digest: `bgtasks/email_notification_task.py` batches
  every five minutes, with an `EmailNotificationLog` at
  `notification.py:121` pruned nightly.
- **OpenProject, Taiga and Vikunja** are the other three driven passers
  on the per-scope override.

## What nextcloud-vue builds

- **One preferences matrix.** Events down, channels across, a value in
  each cell. The event list and the channel list come from the host, so
  the component never knows what a "term expires" event is.
- **A scope column.** A row can be set globally or per case domain or
  record type. The narrower setting wins, and the screen shows which
  level a value came from, so a user can see why they are getting
  something.
- **The same matrix for a group**, rendered in admin settings, writing
  the group's defaults. A user's own value wins over the group's, and the
  screen says so.
- **A digest choice**, off, daily or weekly, per user, with the time of
  day.
- **A test send.** One button that fires the selected kind over the
  selected channel to the person setting it, so nobody has to wait for a
  real event to find out the channel is broken.

## How dossiq consumes it

dossiq declares its event catalogue and places the matrix in its personal
settings and its admin settings. dossiq ships the templates per event,
which is the cluster's own division of labour. The preference store, the
routing and the delivery are OpenRegister's under ADR-031, and this
change reads and writes through them rather than keeping a store of its
own.

## Affected projects

- `nextcloud-vue`: a new `CnNotificationPreferences`, the settings
  components, the preferences store plugin.
- Consumers: dossiq, openregister, pipelinq, humaniq, keepiq, decidiq,
  every app that notifies anybody.

## Backward compatibility

New component, new store plugin. Nothing existing changes. An app that
does not place the component is unaffected.

## Theming

Nextcloud CSS variables only, through the existing settings components. A
matrix is a table and reads as one for a screen reader.

## The capability it declares, and the specs it extends

The requirements are new behaviour rather than changes to the existing
settings components, so they land in a capability of their own,
`notification-preferences`, the way `index-page-map-view` was declared
beside `index-page`. It renders through `settings-components` (the
personal and admin settings sections) and `store` (the preferences
plugin).

## Size

M. One matrix component and one store plugin. The cluster is L because
most of it is routing and transport, and that half is openregister's.

## Dependencies

OpenRegister's per-user notification routing under ADR-031 must exist
before a preference has anywhere to be stored or any effect when set.
This change is the surface over that mechanism.

## Out of scope

- Routing a notification, addressing one to a group, delivering it over a
  webhook, or batching the mail. All openregister, cluster 10's other
  five candidates.
- The message templates per event. dossiq ships those.
- Push to a phone. That is a transport, not a preference.
