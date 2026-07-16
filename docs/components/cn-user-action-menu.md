import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnUserActionMenu.md'

# CnUserActionMenu

Inline popover that appears when a user's name is clicked. Shows the user's avatar, display name, and contextual communication actions — Send message, Start chat, Send email, Plan meeting — depending on which Nextcloud apps are installed (Talk, Mail, Calendar). Capabilities are fetched once per session and cached module-level.

**Wraps**: NcPopover, NcAvatar, NcActionButton

## Try it

<Playground component="CnUserActionMenu" />

## Usage

```vue
<!-- In a notes or tasks list, wrap the author name -->
<CnUserActionMenu
  :user-id="note.actorId"
  :display-name="note.actorDisplayName">
  <strong>{{ note.actorDisplayName }}</strong>
</CnUserActionMenu>

<!-- Non-interactive for the current user -->
<CnUserActionMenu
  :user-id="currentUser.id"
  :display-name="currentUser.displayName"
  :interactive="false">
  {{ currentUser.displayName }}
</CnUserActionMenu>
```

### Available actions

| Action | Shown when | Behavior |
|--------|-----------|----------|
| Send message | Nextcloud Talk installed | Opens a direct conversation, navigates to Talk |
| Start chat | Nextcloud Talk installed | Opens a direct conversation in a new tab |
| Send email | User has an email address | Opens Nextcloud Mail compose or `mailto:` fallback |
| Plan meeting | Nextcloud Calendar installed | Opens Calendar new event with the user as attendee |

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | String | ✓ | — | Nextcloud user ID used for avatar, email lookup, and Talk conversations |
| `displayName` | String | | `'Unknown'` | User display name shown in the popover header |
| `interactive` | Boolean | | `true` | Set to `false` to disable the popover (e.g. for the current user) |
| `sendMessageLabel` | String | | `'Send message'` | Label for the Talk message action |
| `startChatLabel` | String | | `'Start chat'` | Label for the Talk chat action |
| `sendEmailLabel` | String | | `'Send email'` | Label for the email action |
| `planMeetingLabel` | String | | `'Plan meeting'` | Label for the Calendar action |
| `noActionsLabel` | String | | `'No communication apps available'` | Text shown when no app is installed |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `{ type, userId }` | Emitted after any action is triggered; `type` is `'message'`, `'chat'`, `'email'`, or `'meeting'` |

### Slots

| Slot | Description |
|------|-------------|
| default | The trigger element (rendered as a clickable span). Defaults to `displayName` text |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnUserActionMenu.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnUserActionMenu/CnUserActionMenu.vue) and update automatically whenever the component changes.

<GeneratedRef />
