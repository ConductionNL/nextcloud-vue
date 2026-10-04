One bar cut into segments, with a legend that carries the numbers. This example uses static segments; in an app they usually come from an OpenRegister `source` with `groupBy`.

```vue
<CnStackedBarWidget
  :content="{
    segments: [
      { label: 'Received', value: 3 },
      { label: 'In progress', value: 6 },
      { label: 'Decision', value: 3 },
      { label: 'Publish', value: 2 },
    ],
  }" />
```

Props: `content` holds the configuration (see the component description) and `translate` is an optional translate function for the labels in it.
