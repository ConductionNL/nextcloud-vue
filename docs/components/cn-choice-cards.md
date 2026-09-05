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
| `options` | Array | `[]` | The options to offer: `{ value, label, description?, stats?, tags?, icon? }`. `icon` is a PascalCase MDI name resolved by [CnIcon](./cn-icon.md). |
| `modelValue` | String \| Number \| Boolean \| Array \| Object | `null` | The selection. An array when `multiple`. |
| `multiple` | Boolean | `false` | Allow several cards. Inputs become checkboxes and the model becomes an array. |
| `label` | String | `''` | Group label, rendered as the fieldset legend. |
| `disabled` | Boolean | `false` | Disable every card, for example while a dependent choice has no parent value yet. |
| `loading` | Boolean | `false` | Show a spinner instead of the grid while the options are being fetched. |
| `emptyText` | String | `'Nothing to choose from here.'` | Shown when there are no options. |
| `descriptionLines` | Number | `4` | Lines of description before clamping. |

### Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | value, or an array of values | A card is picked, or unpicked when `multiple`. |

## Accessibility

- The grid is a `<fieldset>` with a `<legend>`, so a screen reader announces what the group is for before the first option.
- Values are compared as strings, so a value that came back from a server as `"1"` still matches the `1` it was sent as.
- Card titles render as `<span>`, not headings. Six choices are six choices, not six headings in the document outline.

## Related

- [CnCard](./cn-card.md) renders each option.
- [CnSetupWizard](./cn-setup-wizard.md) uses this for a `choice` step that declares `display: "cards"`.
