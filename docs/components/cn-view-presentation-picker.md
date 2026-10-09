# CnViewPresentationPicker

Choose how a saved view shows: a **table**, a **board** grouped by a status field, or a **calendar** by a date field. It takes the view's JSON `schema` and a presentation `value`, and emits `input` with a presentation in OpenRegister's shape only:

```js
{ viewType: 'table' }
{ viewType: 'kanban', kanban: { groupByField, cardFields?, columnOrder? } }
{ viewType: 'calendar', calendar: { dateField, endDateField? } }
```

Each field picker offers only the schema properties that can serve its role (the server stays the authority):

| Role | Offered properties |
|------|--------------------|
| `kanban.groupByField` | a string property with an `enum`, the property the schema's `x-openregister-lifecycle` names as its state, or a relation to one object (`$ref`) |
| `kanban.cardFields` | any scalar property, at most four |
| `kanban.columnOrder` | the values of the chosen `groupByField` enum, reorderable with Move up and Move down buttons; hidden when the field has no enum. Emitted only once the order is changed. |
| `calendar.dateField`, `calendar.endDateField` | a property with `format` `date` or `date-time` |

A type whose required role has no candidate is disabled with the reason ("This schema has no date field"). Switching type drops the other type's settings, so a board turned back into a table emits `{ viewType: 'table' }` and no stale `kanban` block. Every select carries an input label.

[`CnSaveViewDialog`](./cn-save-view-dialog.md) (with a `schema`) and [`CnSavedViewPresentationDialog`](./cn-saved-view-presentation-dialog.md) carry it. `isPresentationComplete(presentation)` and `presentationCandidates(schema)` live in `utils/presentationCandidates.js`.

```vue
<CnViewPresentationPicker :schema="schema" :value="presentation" @input="presentation = $event" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | The view's JSON Schema (with `properties`), which decides what each role offers. |
| `value` | Object | `{ viewType: 'table' }` | The current presentation, in OpenRegister's shape. Empty reads as a table. |
| `disabled` | Boolean | `false` | Disable every control. |
| `errors` | Object | `{}` | A refusal message per path (`kanban.groupByField`, `calendar.dateField`, `calendar.endDateField`), shown under the picker it is about. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `object` | The presentation in OpenRegister's shape. |
