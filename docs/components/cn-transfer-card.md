# CnTransferCard

A transfer that takes a while, such as taking a day's work offline. Board DqInspectie draws it as "Dag synchroniseren": "32 MB van 48 MB gedownload", "nog ca. 6 minuten", a row per part, and resuming after a dropped connection.

## Usage

```vue
<CnTransferCard
  title="Dag synchroniseren"
  subtitle="Voor vertrek, op wifi"
  :done="32"
  :total="48"
  unit="MB"
  amount-template="{done} {unit} van {total} {unit} gedownload"
  remaining-text="nog ca. 6 minuten"
  hint="Op dit mobiele netwerk duurt de download ca. 6 minuten. Wifi aanbevolen."
  :items="[
    { id: 'cases', label: 'Zaken, checklists en historie van 4 adressen', state: 'Klaar' },
    { id: 'tiles', label: 'Kaarttegels van de 4 adressen', state: 'Bezig' },
  ]"
  :paused="connectionLost"
  note="Klaar betekent: de dag staat 24 uur offline op dit toestel."
  @resume="resume">
  <template #actions>
    <NcButton @click="addAnnotation">Annotatie toevoegen</NcButton>
  </template>
</CnTransferCard>
```

You own the transfer and pass where it stands. The card holds no state, so it serves a download, an upload or a sync alike. With `paused` it says the connection dropped and offers Resume; the time left then goes away.

To settle what a sync sent back, use [`CnOfflineQueue`](./cn-offline-queue.md). It lists what waits, shows both texts of a conflict, and offers keep mine, keep theirs or merge.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `String` | `''` | Title. |
| `subtitle` | `String` | `''` | A line under the title. |
| `done` | `Number` | `0` | How much has been transferred. |
| `total` | `Number` | `0` | How much there is in total. With 0 the bar stays empty. |
| `unit` | `String` | `''` | The unit, such as "MB". |
| `amountTemplate` | `String` | `''` | The amount line, with `{done}`, `{total}` and `{unit}`. The default is "{done} {unit} of {total} {unit}". |
| `remainingText` | `String` | `''` | How long it will still take. |
| `hint` | `String` | `''` | A line under the bar. |
| `items` | `Array` | `[]` | The parts: `{ id?, label, state }`. |
| `paused` | `Boolean` | `false` | The transfer stopped and can carry on. |
| `pausedText` | `String` | `''` | Says why it stopped; the default says the connection dropped. |
| `resumeLabel` | `String` | `''` | Label of the Resume button. |
| `note` | `String` | `''` | A line at the end of the card. |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `resume` | none | The user pressed Resume. |

## Slots

| Slot | Description |
| --- | --- |
| `actions` | Further buttons under the card. |

## Accessibility

- The bar is named by the amount in words, so a screen reader reads "32 MB of 48 MB", not only a percentage.
- A pause is announced in the `status` role.
- A part's state is a word, not a colour.
