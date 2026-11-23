# CnAudioCapture

Record a short spoken note from the device microphone. The browser asks for the microphone only when Record is pressed. The clip stops by itself after `maxSeconds`, and the value is the recording as a `data:` URL (the same content shape `CnFileField` sends), or null. A recorded clip plays back under the buttons and can be recorded again or removed.

```vue
<CnAudioCapture v-model="note" label="Spoken note" :maxSeconds="60" />
```

On a manifest form page it is the `audio` field type (see [CnFormPage](./cn-form-page.md#device-fields)).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | `null` | The recording as a `data:` URL, or null. |
| `label` | String | `''` | The field label. |
| `maxSeconds` | Number | `60` | The longest clip in seconds. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string \| null` | The recording, or null when removed. |

A browser without recording, a refused microphone and a failed read each show a line under the buttons.
