# CnChoiceCards

Pick one option, or several, from a grid of cards instead of a dropdown. Use it where the choice needs explaining: a setup wizard asking which example dataset to load, an onboarding template picker, a plan chooser. Use [NcSelect](https://nextcloud-vue-components.netlify.app/) where the label already says enough.

Each card is a `<label>` around a real `<input type="radio">`, or a checkbox when `multiple` is set. Keyboard navigation, the checked state and Windows high-contrast rendering are the browser's own, not a reimplementation, and the selection stays visible without relying on the highlight colour (WCAG 1.4.1).

The cards themselves are [CnCard](./cn-card.md), so a card can carry a description, a few stats and an icon.

## Usage

```vue
<!-- One choice -->
<CnChoiceCards
  v-model="picked"
  label="Which kind of organisation is this for?"
  :options="[
    { value: 'municipality', label: 'Municipality',
      description: 'A council, its committees and a decision list.',
      stats: [{ label: 'Objects', value: 170 }] },
    { value: 'association', label: 'Association or VvE',
      description: 'A members meeting, motions and minutes.' },
    { value: 'none', label: 'None, I will set this up myself' },
  ]" />

<!-- Several, with a live list still loading -->
<CnChoiceCards
  v-model="pickedSets"
  :multiple="true"
  :loading="loading"
  :options="sets"
  label="Load which example sets?" />
```

Options are tolerant about shape, so a list can be handed straight from a server: `id` is accepted for `value` and `name` for `label`.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | Array | `[]` | The options to offer: `{ value, label, description?, stats?, tags?, icon?, disabled?, disabledReason? }`. `icon` is a PascalCase MDI name resolved by [CnIcon](./cn-icon.md). A `disabled` option sits on the grey ground in the muted ink and cannot be picked; its `disabledReason` shows under it and describes the input. |
| `modelValue` | String \| Number \| Boolean \| Array \| Object | `null` | The selection. An array when `multiple`. |
| `multiple` | Boolean | `false` | Allow several cards. Inputs become checkboxes and the model becomes an array. |
| `label` | String | `''` | Group label, rendered as the fieldset legend. |
| `hideLabel` | Boolean | `false` | Keep `label` as the legend for assistive tech only, where the dialog's title already names the choice. |
| `disabled` | Boolean | `false` | Disable every card, for example while a dependent choice has no parent value yet. |
| `readonly` | Boolean | `false` | Show the choice without letting it change: every option at full contrast, the selected one marked, nothing pickable. `disabled` greys the options out instead. |
| `loading` | Boolean | `false` | Show a spinner instead of the grid while the options are being fetched. |
| `emptyText` | String | `'Nothing to choose from here.'` | Shown when there are no options. |
| `columns` | Number | `0` | Columns of the card grid. `1` stacks the cards in one column; `0` fits as many as the width allows. In `rows`, more than `1` sets the rows side by side in that many equal columns. |
| `descriptionLines` | Number | `4` | Lines of description before clamping. |
| `layout` | String | `'cards'` | `cards`: the grid of cards. `rows`: one option per row, full width, the input on the left and the title over a muted description; the selected row has a primary border on a light primary ground. With `multiple` and one option it is a single checkbox card ("Also publish the decision"). Stats and tags are not drawn in rows. |

### Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | value, or an array of values | A card is picked, or unpicked when `multiple`. |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `option-actions` | `{ option, selected }` | Content below one card, such as a Load button. It renders outside the card's `<label>`, so a click on a button there never toggles the card. The setup wizard uses it for `loadAction`; with `v-if="selected"` it holds the fields for the chosen option, right under it. |
| `option-details` | `{ option }` | Rows layout: the chosen option's own fields, drawn inside the selected row's frame under its text (DqVolgendeStap's Opschorten: reason, days, return date). Only for the selected option, and outside the radio's `<label>`. |

## Accessibility

- The grid is a `<fieldset>` with a `<legend>`, so a screen reader announces what the group is for before the first option.
- Values are compared as strings, so a value that came back from a server as `"1"` still matches the `1` it was sent as.
- Card titles render as `<span>`, not headings. Six choices are six choices, not six headings in the document outline.

## Related

- [CnCard](./cn-card.md) renders each option.
- [CnSetupWizard](./cn-setup-wizard.md) uses this for a `choice` step that declares `display: "cards"`.
