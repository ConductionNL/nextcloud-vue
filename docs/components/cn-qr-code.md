# CnQrCode

A QR code drawn in the browser, with an optional code to type in and a code that changes on a timer. Board LqLes draws it as "Zelf inchecken, op het bord": a QR code, "K7QM4RTA" and "verandert over 18 s". Board LqLlCertificaat draws it to offer a certificate to a wallet.

The encoder needs no library and sends nothing to a QR service, so a one-time claim stays on the page. The modules stay black on white in every theme, because a scanner needs dark on light.

## Usage

A fixed code:

```vue
<CnQrCode :value="offerUrl" label="Certificaat aan wallet toevoegen" />
```

A code that changes every 30 seconds, with a count of check-ins read every 5:

```vue
<CnQrCode
  :refresh-url="codeUrl"
  :refresh-seconds="5"
  :map-response="({ url, code, secondsLeft }) => ({ value: url, code, secondsLeft })"
  countdown-template="verandert over {seconds} s"
  label="Inchecken"
  @refreshed="count = $event.checkInCount" />
```

With `refreshUrl` the component reads the address every `refreshSeconds`, and sooner when `secondsLeft` runs out first. It counts from the clock, so a throttled tab stays right. When a read fails, the last code stays with a notice, and the next read comes after `refreshSeconds`.

Without `refreshUrl` you set `value` and `code` yourself, and you hear `expired` when `refreshSeconds` has passed.

A screen reader hears a new code when it changes. It does not hear the countdown every second.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `String` | `''` | The text the code says. Up to 666 bytes. Empty draws no code. |
| `code` | `String` | `''` | A code to type in, shown large under the image. |
| `label` | `String` | `''` | What the code does, for the image's accessible name. |
| `size` | `Number` | `160` | Width and height in CSS pixels. |
| `refreshUrl` | `String` | `''` | Where to read the current code. |
| `refreshSeconds` | `Number` | `0` | Seconds between reads, or until `expired` without `refreshUrl`. 0 is no timer. |
| `mapResponse` | `Function` | identity | Turns a response into `{ value, code, secondsLeft }`. |
| `countdownTemplate` | `String` | `''` | The countdown, with `{seconds}`. |
| `refreshFailedText` | `String` | `''` | Says a read failed. |

## Slots

| Slot | Description |
| --- | --- |
| default | Further lines under the code. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `refreshed` | the whole response | A read arrived. Read a count from it. |
| `refresh-error` | the error | A read failed. |
| `expired` | none | `refreshSeconds` passed, when there is no `refreshUrl`. |

## Encoder

`encodeQr(text)` from the package returns `{ version, size, modules }`, or `null` when the text is empty or too long. It uses byte mode at error correction level M, versions 1 to 20.
