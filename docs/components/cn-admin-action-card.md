---
sidebar_position: 26
---

# CnAdminActionCard

One maintenance action on an admin settings page: a title, a short
explanation and one button. The click posts an app action. The button spins
while it runs, and the server's message shows below it as success or error.

Use it for work an admin starts by hand, such as repairing the register or
importing the schemas again. That work never belongs in the
[setup wizard](./cn-setup-wizard.md).

## Usage

```vue
<CnAdminActionCard
  app-id="pipelinq"
  action="provision"
  :title="t('pipelinq', 'Repair the register')"
  :description="t('pipelinq', 'Creates missing schemas again. Your data stays as it is.')"
  :button-label="t('pipelinq', 'Repair')"
  @result="onRepaired" />
```

By default the card posts to the app's setup action contract,
`POST /apps/{appId}/api/setup/action/{action}`, the endpoint the setup wizard
also uses. Pass `url` to post to another app path.

The server answers `{ success, message }`. A `success: false` in a 200 answer
shows as an error, the same as a failed request.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | (required) | Card heading. Pass it translated. |
| `description` | String | `''` | What the action does, in one or two short sentences. |
| `appId` | String | `''` | The app id; builds the default URL. |
| `action` | String | `''` | The action id posted to `/api/setup/action/{action}`. |
| `url` | String | `''` | An app path to post to instead, passed through `generateUrl`. |
| `payload` | Object | `{}` | Request body. |
| `buttonLabel` | String | `'Run'` | Button label. |
| `runningLabel` | String | `'Running…'` | Label next to the spinner. |
| `buttonVariant` | String | `'secondary'` | `NcButton` variant. |
| `disabled` | Boolean | `false` | Disable the button. |

## Events

| Event | Payload | When |
|-------|---------|------|
| `result` | `{ success, message, data }` | The action finished. `data` is the response body. |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Extra content between the explanation and the button. |

## Accessibility

- The result sits in a `role="status"` region, so a screen reader hears the
  outcome without the focus moving.
- The button stays a real button and is disabled while the action runs.

## Related

- [CnConfigurationCard](./cn-configuration-card.md) renders the card.
- [CnSetupWizard](./cn-setup-wizard.md) for first-time setup.
