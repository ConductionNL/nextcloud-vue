The brand stripe of the organisation. The theme sets its colours, shares and height. Without a theme it is one band in the primary colour.

```vue
<CnBrandStripe />
```

With the tokens a theme would set:

```vue
<div style="--nldesign-brand-stripe-color-1: #cc0000; --nldesign-brand-stripe-color-2: #3669a5; --nldesign-brand-stripe-color-3: #cc0000; --nldesign-brand-stripe-ratio-1: 6; --nldesign-brand-stripe-ratio-2: 3; --nldesign-brand-stripe-ratio-3: 1; --nldesign-brand-stripe-height: 5px">
  <CnBrandStripe />
</div>
```

Down the side of a panel, with `orientation="vertical"`:

```vue
<div style="display: flex; height: 80px; gap: 12px;">
  <CnBrandStripe orientation="vertical" />
  <span>Content beside the stripe</span>
</div>
```
