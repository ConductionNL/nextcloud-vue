CnWidgetRenderer renders Nextcloud Dashboard API widgets (v1/v2) with auto-refresh. It requires a real Nextcloud environment for the widget data APIs to function. In the styleguide it shows the component structure.

The `unavailableText` prop (default `"Widget not available"`) controls the message shown in the fallback empty-content state when the widget type cannot be determined. Pass a translated string to localise it.

Simulated empty state — no widget definition loaded yet:

```vue
<div style="width: 320px; height: 200px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnWidgetWrapper title="NC Dashboard widget" :show-title="true">
    <div style="display: flex; align-items: center; justify-content: center; height: 120px; color: var(--color-text-maxcontrast); font-size: 14px;">
      CnWidgetRenderer — requires live Nextcloud API
    </div>
  </CnWidgetWrapper>
</div>
```
