# CnEditSupportModal

Isolated `NcDialog` (ADR-004 modal isolation) that edits the **support and
donation note** in the working manifest copy (ADR-041): the one-time,
dismissible note an app shows the first time a user opens it. All edits mutate
the passed `working` copy **only**.

The note introduces the team and offers to donate, suggest a feature, review the
app, or get support. Every field is optional: leave one blank and the shell's
own default is used, so an app declares only what it overrides.

Reads and writes `manifest.support`, which
[CnAppRoot](./cn-app-root.md) reads to decide whether to mount
[CnSupportDialog](./cn-support-dialog.md) on first open.

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit support &
donation…" item, and mountable on its own surface by any consumer.

## Import

```js
import { CnEditSupportModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose `support` block is edited in place. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |

## What it edits

| Field | Purpose |
| --- | --- |
| `enabled` | Whether the note shows on first open. Omit for the default. |
| `title` | Dialog heading. |
| `appName` | Name interpolated into the body copy. |
| `bodyParagraphs` | Body copy, one entry per paragraph. |
| `founderName` / `founderTitle` | Signature name and role. |
| `founderAvatarUrl` / `founderProfileUrl` | Signature avatar and the profile it links to. |
| `buttons` | Per-button overrides for the four built-ins: `donate`, `support`, `feature-request`, `app-store`. Each takes `enabled`, `label`, `url`, `variant` and `icon`. |
