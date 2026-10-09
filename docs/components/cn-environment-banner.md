# CnEnvironmentBanner

Names a non-production environment on every app screen so acceptance is not mistaken for production.

It shows "Development environment", "Test environment" or "Acceptance environment" in words, with a colour per environment (from Nextcloud CSS variables, so NL Design System themes apply), as a `role="note"` with an accessible name. It has no close action and no user setting hides it. While it shows, the tab title is prefixed `[DEV]`, `[TEST]` or `[ACC]`, and the prefix is removed again when the banner goes. Production, an unknown value and no value render nothing and leave the title alone.

`CnAppRoot` and `CnAdminSettingsShell` place it themselves. Use it directly only in an app that mounts neither.

```vue
<CnEnvironmentBanner environment="acceptance" />
```

## Where the environment comes from

`CnAppRoot` and `CnAdminSettingsShell` resolve the environment in this order:

1. their `environment` prop (an app fills it from its own instance setting);
2. the active organisation's `environment` field, from the tenant context, or read from OpenRegister (`organisations/<uuid>`) when the context holds only the uuid;
3. none.

The organisation's `environment` field is the way to mark an instance without any app code. It follows a tenant switch. If the organisation cannot be read, nothing is shown and one warning is logged; it never guesses "production". The same logic is available as the `useEnvironment` composable.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `environment` | `String` | `''` | `development`, `test` or `acceptance` shows the banner; anything else shows nothing. |
