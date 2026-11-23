# CnDisplayScreen

A full page without a menu, read from a distance on a hall screen or a classroom board. Board LqInfoscherm draws it as "Infoscherm bij de aula": a dark page with a title, a clock, the rows of the day and a line at the bottom. Board LqLes puts the self check-in code on it.

## Usage

On its own route, such as a public page:

```vue
<CnDisplayScreen
  subtitle="Zuiddrecht College, aula"
  title="Vandaag, donderdag 8 oktober"
  clock
  dark
  :updated-at="updatedAt"
  updated-template="bijgewerkt om {time}"
  :stale="lastRefreshFailed"
  footer="Toont de groepen en lokalen van het hoofdgebouw.">
  <CnDataTable :rows="rows" :columns="columns" />
</CnDisplayScreen>
```

Over the app, from a button:

```vue
<CnDisplayScreen v-if="showing" overlay title="Nederlands, 3HV-B" @close="showing = false">
  <CnQrCode :refresh-url="codeUrl" :refresh-seconds="5" />
  <template #actions>
    <NcButton variant="primary" @click="closeCheckIn">Inchecken sluiten</NcButton>
  </template>
</CnDisplayScreen>
```

You own the rows and the refresh. When a refresh fails, keep the last rows and set `stale`. The screen then says the server is out of reach, with the time of `updatedAt`.

With `overlay` the screen goes to the page body and covers everything. The rest of the page goes inert, so Tab stays on the screen. Escape emits `close`, and focus returns to where it was when the screen goes away.

Colours come from the theme variables, so `dark` is the Nextcloud dark theme, whatever the user chose. The page needs the theme's CSS, which a public Nextcloud page has.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `String` | required | The heading. |
| `subtitle` | `String` | `''` | A line over the title. |
| `clock` | `Boolean` | `false` | Show a clock that keeps time. |
| `updatedAt` | `String`, `Number`, `Date` | `''` | When the content was last updated. |
| `updatedTemplate` | `String` | `''` | The update line, with `{time}`. |
| `stale` | `Boolean` | `false` | The content could not be refreshed. |
| `staleText` | `String` | `''` | Says the content is old, with `{time}`. |
| `footer` | `String` | `''` | The bottom line. |
| `dark` | `Boolean` | `false` | Use the dark theme. |
| `overlay` | `Boolean` | `false` | Cover the whole app. |

## Slots

| Slot | Description |
| --- | --- |
| default | The rows of the screen. |
| `footer` | The bottom line; replaces `footer`. |
| `actions` | Buttons at the end of the bottom line. |

## Events

| Event | Description |
| --- | --- |
| `close` | The user pressed Escape on an overlay. |
