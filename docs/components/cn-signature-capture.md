---
sidebar_position: 25
---

# CnSignatureCapture

Typed + drawn signature widget with an affirmation checkbox and an audit-payload emit. For sign-plan / sign-off / e-signature flows where a typed name or a free-hand canvas stroke is sufficient evidence (cryptographic signatures live elsewhere).

Two capture modes:

- **typed** — text input rendered in a signature-style font.
- **drawn** — `<canvas>` with mouse + touch handlers producing a PNG data-URL.

The user toggles modes via a radio group when both are allowed; otherwise the single allowed mode renders directly.

## Try it

```vue
<template>
  <CnSignatureCapture
    :allow-typed="true"
    :allow-drawn="true"
    affirmation="I confirm the plan is accurate."
    @change="onSigned" />
</template>

<script>
import { CnSignatureCapture } from '@conduction/nextcloud-vue'

export default {
  components: { CnSignatureCapture },
  methods: {
    onSigned({ mode, value, affirmed, audit }) {
      // mode: 'typed' | 'drawn'
      // value: text (typed) | 'data:image/png;base64,…' (drawn)
      // affirmed: boolean (only meaningful when affirmation prop is set)
      // audit: { capturedAt, mode, canvasWidth?, canvasHeight? }
    },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `allowTyped` | Boolean | `true` | Enable the typed-signature mode. |
| `allowDrawn` | Boolean | `true` | Enable the drawn-signature canvas. |
| `initialMode` | `'typed'\|'drawn'` | `'typed'` | Preferred starting mode when both are allowed. |
| `affirmation` | String | `''` | Optional affirmation text rendered next to a checkbox. Empty hides the checkbox. |
| `canvasWidth` | Number | `360` | Drawn-mode canvas width (used in the emitted PNG). |
| `canvasHeight` | Number | `120` | Drawn-mode canvas height. |
| `lineWidth` | Number | `2` | Stroke width for drawn mode. |
| `strokeColor` | String | `'#000'` | Stroke colour (CSS colour string). |
| `typedFont` | String | `'"Brush Script MT", cursive'` | Font family for the typed-signature preview. |
| `typedPlaceholder` | String | `'Type your name'` | Typed input + preview placeholder. |
| `typedAriaLabel` | String | `'Typed signature input'` | ARIA label for the typed input. |
| `drawnAriaLabel` | String | `'Drawn signature canvas'` | ARIA label for the canvas. |
| `drawnHint` | String | `'Draw your signature inside the box.'` | Hint text under the canvas. |
| `typedModeLabel` | String | `'Type'` | Mode-picker label for typed mode. |
| `drawnModeLabel` | String | `'Draw'` | Mode-picker label for drawn mode. |
| `clearLabel` | String | `'Clear'` | Clear-button label. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `{ mode, value, affirmed, audit }` | Emitted on every state mutation (typed input, stroke end, mode switch, affirmation toggle, clear). |

## Public methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getSignature()` | — | Return the current payload (same shape as `change`) without emitting. Useful for snapshotting on submit. |
| `clear()` | — | Reset both modes' content + affirmation. Emits a change with empty value. |

## Audit payload

Every emit carries an `audit` block:

```js
{
  capturedAt: '2026-05-20T17:34:12.123Z',  // ISO timestamp
  mode: 'typed' | 'drawn',
  canvasWidth?: number,  // drawn mode only
  canvasHeight?: number, // drawn mode only
}
```

Persist `audit` alongside the signed document so the server-side record carries the capture metadata.

## What this widget is NOT

- A **cryptographic** signature (no PKI, no chain-of-trust). Use [`@nextcloud/openssl`](https://github.com/nextcloud/openssl) or an external e-sign service for binding signatures.
- A **biometric** capture (no pressure / velocity sampling).

The component is for evidentiary-typed/drawn signatures where the user's intent is recorded; the legal binding is handled by the consuming app's policy.

## See also

- [`CnWizardDialog`](./cn-wizard-dialog.md) — drop into a step's slot for multi-step sign-off flows.
- [`CnRichSubmitDialog`](./cn-rich-submit-dialog.md) — adjacent submit-with-files pattern.
