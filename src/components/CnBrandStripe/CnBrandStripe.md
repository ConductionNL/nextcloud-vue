The brand stripe of the organisation. A theme sets its colours, shares and height through the `--cn-brand-stripe-*` custom properties. Without a theme it is one band in the primary colour.

```vue
<CnBrandStripe />
```

With the properties a theme would set:

```vue
<div style="--cn-brand-stripe-color-1: #cc0000; --cn-brand-stripe-color-2: #3669a5; --cn-brand-stripe-color-3: #cc0000; --cn-brand-stripe-ratio-1: 6; --cn-brand-stripe-ratio-2: 3; --cn-brand-stripe-ratio-3: 1; --cn-brand-stripe-height: 5px">
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
