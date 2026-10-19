A categorical grid with one chosen cell. The record's `behaviour` and `consequence` pick the outlined cell.

```vue
<CnMatrixWidget
  :content="{
    rowField: 'behaviour',
    columnField: 'consequence',
    columns: [{ value: 'A', label: 'Minor' }, { value: 'B', label: 'Serious' }],
    rows: [
      { value: '1', label: 'Willing', cells: ['Talk', 'Warning'] },
      { value: '2', label: 'Calculating', cells: ['Warning', 'Penalty payment'] },
    ],
    tones: { Talk: 'success', Warning: 'warning', 'Penalty payment': 'error' },
  }"
  :object-data="{ behaviour: '2', consequence: 'B' }" />
```

Props: `content` holds the configuration and `objectData` is the bound record.
