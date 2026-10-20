# CnEndpointNotice

CnEndpointNotice is what an endpoint-fed widget shows when its read did not answer in full. It takes the `error`, `refused` and `truncated` refs that `useEndpointSource` returns.

- **Refused** (the endpoint answered 401 or 403): the server's own sentence, as a warning. A reader outside a report's audience learns why the widget is empty.
- **Failed**: the server's message, as an error.
- **Truncated** (the response body carried `truncated: true`): an info note that the figures may be incomplete, because the endpoint stopped reading at a limit.

- **Waiting to be asked** (`loadOn: "request"`): a button (`requestLabel`, default "Show") with an optional `requestHint` above it; pressing it emits `request`.

It renders nothing when the read succeeded in full. `CnWidgetObjectTable` and `CnChartWidget` render it for their `endpointSource`; an app widget can do the same.

```vue
<template>
	<div>
		<CnEndpointNotice error="This report covers every case, so it is for the controller and beheerder roles." :refused="true" />
		<CnEndpointNotice error="Report generation failed" />
		<CnEndpointNotice :truncated="true" />
	</div>
</template>
```

## Props

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `error` | String | `''` | The read's error message; for a refusal, the server's sentence |
| `refused` | Boolean | `false` | The read was refused rather than failing |
| `truncated` | Boolean | `false` | The answer declared itself short |
| `truncatedText` | String | `''` | Replaces the default truncation sentence |
| `awaitingRequest` | Boolean | `false` | The source waits for the reader to ask |
| `requestLabel` | String | `''` | The button label, already translated (default "Show") |
| `requestHint` | String | `''` | A sentence above the button, already translated |
| `requestDisabled` | Boolean | `false` | Disables the button, such as while a required token is unset |

## Events

| Event | Payload | Meaning |
|---|---|---|
| `request` | none | The reader pressed the request button |
