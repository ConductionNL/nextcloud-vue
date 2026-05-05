Basic — widget card with title and content:

```vue
<div style="width: 320px; height: 200px; position: relative; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnWidgetWrapper title="Recent activity" :show-title="true">
    <ul style="margin: 0; padding: 0 16px; list-style: none;">
      <li style="padding: 6px 0; border-bottom: 1px solid var(--color-border);">Object #001 created</li>
      <li style="padding: 6px 0; border-bottom: 1px solid var(--color-border);">Schema updated</li>
      <li style="padding: 6px 0;">User joined</li>
    </ul>
  </CnWidgetWrapper>
</div>
```

With footer buttons:

```vue
<div style="width: 320px; height: 220px; position: relative; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnWidgetWrapper
    title="Open tasks"
    :show-title="true"
    :buttons="[
      { label: 'View all', link: '#' },
    ]">
    <div style="padding: 8px 0; color: var(--color-text-maxcontrast); font-size: 14px; text-align: center; margin-top: 24px;">
      3 tasks due today
    </div>
  </CnWidgetWrapper>
</div>
```

Borderless — for widgets embedded in a grid that supplies its own border:

```vue
<div style="width: 320px; height: 180px; background: var(--color-background-hover); border-radius: 8px; overflow: hidden;">
  <CnWidgetWrapper title="KPIs" :show-title="true" :borderless="true">
    <div style="padding: 16px; display: flex; gap: 24px; justify-content: center;">
      <div style="text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; color: var(--color-primary-element);">42</div>
        <div style="font-size: 12px; color: var(--color-text-maxcontrast);">open</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; color: var(--color-success);">284</div>
        <div style="font-size: 12px; color: var(--color-text-maxcontrast);">closed</div>
      </div>
    </div>
  </CnWidgetWrapper>
</div>
```
