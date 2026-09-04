One choice, with a description and a count per card:

```vue
<CnChoiceCards
  label="Which kind of organisation is this for?"
  :model-value="'municipality'"
  :options="[
    { value: 'none', label: 'None, I will set this up myself',
      description: 'Nothing is loaded. Start from an empty register.' },
    { value: 'municipality', label: 'Municipality',
      description: 'A council, its committees and a decision list.',
      stats: [{ label: 'Objects', value: 170 }] },
    { value: 'association', label: 'Association or VvE',
      description: 'A members meeting, its motions and its minutes.',
      stats: [{ label: 'Objects', value: 45 }] },
  ]" />
```

Several at once, with `multiple`:

```vue
<CnChoiceCards
  label="Load which example sets?"
  :multiple="true"
  :model-value="['municipality', 'corporate']"
  :options="[
    { value: 'municipality', label: 'Municipality',
      description: 'A council, its committees and a decision list.' },
    { value: 'corporate', label: 'Company board',
      description: 'A board, its resolutions and its shareholders.' },
    { value: 'works-council', label: 'Works council',
      description: 'A works council and its consultation requests.' },
  ]" />
```

Waiting for a live list, and with nothing to offer. `empty-text` says what
"nothing" means here:

```vue
<div style="display: grid; gap: 16px; max-width: 700px;">
  <CnChoiceCards label="Loading" :loading="true" :options="[]" />
  <CnChoiceCards
    label="Empty"
    :options="[]"
    empty-text="This app ships no example data." />
</div>
```

Disabled until an earlier choice is made, and with a longer description than the
four lines `description-lines` shows by default:

```vue
<div style="max-width: 340px;">
  <CnChoiceCards
    label="Pick a country first"
    :disabled="true"
    :description-lines="2"
    :options="[
      { value: 'municipality', label: 'Municipality',
        description: 'A council, its committees, a decision list, a motions register, and the meeting cycle that ties them together.' },
    ]" />
</div>
```
