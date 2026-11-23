# CnConnectionsPanel

The connections an app declares, as integriq checks them: a card per connection with its kind, when it was last checked, its status, what it does and what integriq said about it. Status chips with counts and a text field narrow the cards, and a side column lists what needs attention.

```vue
<CnConnectionsPanel
	app="pipelinq"
	app-name="Pipelinq"
	:kinds="{ cti: { kind: 'Telephony', icon: 'Headset' } }"
	add-url="/apps/integriq/connections/new" />
```

The panel reads integriq's `app_connection` objects for `app`. A connection's kind and icon come from its declaration, or from `kinds` when the declaration cannot carry them. The kind goes through the host's translate.

A connection with a settings screen offers it at the foot of its card: "Open settings" once it is set up, and "Set up" as the board's tonal pill (`cn-button--tonal`) while it is not.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `app` | `string` | (required) | The app whose connections are listed. |
| `appName` | `string` | `''` | The app's name as people read it. |
| `kinds` | `object` | `{}` | Kind and icon by connection key, for declarations without them. |
| `addUrl` | `string` | `''` | Where Add integration and Open integriq go. |
| `register` | `string` | `'integriq'` | The register integriq keeps the connections in. |
| `schema` | `string` | `'app_connection'` | The schema integriq keeps the connections in. |
