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

A theme whose motif is not three bands names an image. Here the canal of a school: a blue line, its bank and the water:

```vue
<div style="--cn-brand-stripe-image: linear-gradient(to bottom, #1f4fd8 0 4px, transparent 4px 7px, #1fb5a8 7px 9px); --cn-brand-stripe-height: 9px">
  <CnBrandStripe />
</div>
```

On a dark band, such as a footer, `variant="inverse"` draws the theme's `--cn-brand-stripe-image-inverse`, else the one image, else the bands:

```vue
<div style="background: #14338f; padding-bottom: 16px; --cn-brand-stripe-image: linear-gradient(to bottom, #1f4fd8 0 4px, transparent 4px 7px, #1fb5a8 7px 9px); --cn-brand-stripe-image-inverse: linear-gradient(to bottom, #1f4fd8 0 4px, #ffffff 4px 7px, #1fb5a8 7px 9px); --cn-brand-stripe-height: 9px">
  <CnBrandStripe variant="inverse" />
</div>
```
