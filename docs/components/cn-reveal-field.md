# CnRevealField

A protected value, shown masked until the user asks to see it. Board DqContact draws it for a citizen service number: "BSN *****4001", a Show button, and the line that showing it is logged.

## Why it exists

The value should not sit in the page until someone needs it. `load` fetches it on every Show, so the server can log each viewing and refuse when it must. Hide masks the value again and drops it, and the next Show asks the server again.

## Usage

```vue
<CnRevealField
  label="BSN"
  masked-value="*****4001"
  :load="(reason) => api.revealBsn(person.id, reason)"
  require-reason
  note="Het tonen van het BSN wordt gelogd."
  @revealed="({ reason }) => refreshHistory()" />
```

With `require-reason` the user first says why. The confirm button stays off while the reason is empty, and `load` receives the trimmed reason. Without it `load` receives an empty string.

A rejected promise, or an empty answer, keeps the value masked and shows "The value could not be shown. Try again later." as an alert.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `String` | required | What the value is, already translated. Also names the button: "Show BSN". |
| `maskedValue` | `String` | `'••••••'` | What shows while the value is hidden, such as the last digits behind stars. |
| `load` | `Function` | required | `(reason) => string \| Promise<string>`, called on every Show. |
| `requireReason` | `Boolean` | `false` | Ask why before fetching. |
| `reasonLabel` | `String` | `''` | Label of the reason field; the library default is "Why do you need to see this?". |
| `note` | `String` | `''` | A line under the value, already translated. |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `revealed` | `{ reason }` | The value shows. |
| `hidden` | none | The user masks the value again. |

## Accessibility

- The button's accessible name carries the label ("Show BSN", "Hide BSN"), so a row of protected values stays clear to a screen reader.
- The value is labelled by its label and sits in a polite live region, so the revealed value is read out.
- An error has the `alert` role.

## See also

- [`CnSecretAddressCard`](./cn-secret-address-card.md) for a secret that is shown once after it is made
- `CnAccessPurposeDialog` (`src/dialogs/`) for a purpose asked before a whole page opens
