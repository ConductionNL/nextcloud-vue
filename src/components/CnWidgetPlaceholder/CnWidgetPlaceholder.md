Rows, filling the container:

```vue
<div style="width: 320px; height: 200px; padding: 12px; border: 1px solid var(--color-border); border-radius: 8px;">
  <CnWidgetPlaceholder shape="rows" />
</div>
```

Four lines of text, a counter and tiles:

```vue
<div style="display: flex; gap: 16px;">
  <div style="width: 220px; height: 140px; padding: 12px; border: 1px solid var(--color-border); border-radius: 8px;">
    <CnWidgetPlaceholder shape="lines" :count="4" />
  </div>
  <div style="width: 220px; height: 140px; padding: 12px; border: 1px solid var(--color-border); border-radius: 8px;">
    <CnWidgetPlaceholder shape="counter" />
  </div>
  <div style="width: 220px; height: 140px; padding: 12px; border: 1px solid var(--color-border); border-radius: 8px;">
    <CnWidgetPlaceholder shape="tiles" />
  </div>
</div>
```
