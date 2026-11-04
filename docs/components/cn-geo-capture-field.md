# CnGeoCaptureField

The place something was recorded, captured from the device. Board DqInspectie draws it under an answer: "51.9012, 4.4831 · ±12 m · 10:52". It also works by itself on any form.

## Usage

```vue
<CnGeoCaptureField v-model="place" auto :good-accuracy="50" />
```

With `auto` it asks the device on mount when it holds no value. A fix rougher than `goodAccuracy`, or no fix at all, says so and offers Try again and an address field. The user can always carry on.

The value is `{ lat, lng, accuracy, at, low, address? }`, or null. `low` is true for a rough fix or none. Store it beside the record so a reader can tell a good fix from a rough one.

The browser asks permission the first time. Location only works on https.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `Object` | `null` | The captured place. |
| `auto` | `Boolean` | `false` | Capture on mount when no value is held. |
| `busy` | `Boolean` | `false` | A host is capturing; the field says it is looking. |
| `goodAccuracy` | `Number` | `50` | The accuracy in metres above which a fix counts as low. |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | the new value | A new fix came in, or the address changed. |

## Accessibility

- The line has the `status` role, so a screen reader hears what the device found without moving focus.
- The accuracy is said in words, not shown by a colour.

## See also

- [`CnChecklistRunWidget`](./cn-checklist-run-widget.md) `captureLocation` for a place per answer
- [`CnObjectGeoWidget`](./cn-object-geo-widget.md) for the location of a record on a map
