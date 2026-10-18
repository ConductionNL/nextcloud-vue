# CnSearchSelect

A single picker drawn as a search field: a magnifier where the chevron was, and the results as rows with an icon or initials, a name, a secondary line and a check on the chosen one. Boards DqOverdragen ("Nieuw team": "Juridische zaken · 6 leden · bezwaar, beroep en Woo-advies") and DqNieuweZaak ("Aanvrager": "Henk Visser · Inwoner · Beukenlaan 3") draw it.

It wraps `NcSelect`, so typing, the keyboard, clearing and the accessible name work as in any other select.

## Usage

```vue
<CnSearchSelect
  v-model="team"
  :input-label="t('dossiq', 'New team')"
  :options="[
    { id: 'legal', label: 'Juridische zaken', secondary: '6 leden · bezwaar, beroep en Woo-advies', avatar: true },
    { id: 'vth', label: 'Vergunningen', secondary: '9 leden', icon: 'AccountGroup' },
  ]" />
```

A host that searches itself listens to `search`, passes the results as `options` and sets `:filterable="false"`.

## In a form

A single select field in CnFormDialog takes this look with `look: "search"`, usually through `fieldOverrides`. `optionSecondary` is a template filled from each option (`"{members} leden · {focus}"`), `optionAvatar: true` draws the initials, `optionIcon` names one icon for every row. An option's own `secondary`, `icon` or `avatar` wins.

```json
"fieldOverrides": {
  "team": { "look": "search", "optionSecondary": "{members} leden · {focus}", "optionAvatar": true }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String, Number or Object | `null` | The chosen option's id (or the option) |
| `options` | Array | `[]` | `{ id, label, secondary?, icon?, avatar? }`: `icon` names a CnIcon, `avatar: true` draws the label's initials |
| `inputLabel` | String | `''` | The field's label |
| `labelOutside` | Boolean | `false` | Draw the label above the field |
| `inputId` | String | `undefined` | The input's id |
| `placeholder` | String | `''` | Placeholder; "Search…" when empty |
| `loading` | Boolean | `false` | Show the spinner |
| `clearable` | Boolean | `true` | Offer a clear button |
| `disabled` | Boolean | `false` | Disable the field |
| `filterable` | Boolean | `true` | Filter on the typed text; `false` when the host searches |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | id or `null` | The picked option's id, `null` when cleared |
| `search` | String | The typed text |
