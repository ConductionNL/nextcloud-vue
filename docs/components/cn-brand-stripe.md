import GeneratedRef from './_generated/CnBrandStripe.md'

# CnBrandStripe

The organisation's brand stripe: up to three coloured bands next to each other. Put it at the top of a page, a card or a sidebar.

```vue
<CnBrandStripe />
<CnBrandStripe orientation="vertical" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | A bar across the top, or a bar down the side. Vertical uses the height token as its width. |

## Theme tokens

The theme decides what the stripe looks like. The thematiq app sets these tokens:

| Token | Meaning | Fallback |
|-------|---------|----------|
| `--nldesign-brand-stripe-color-1`, `-2`, `-3` | The colours, start to end. | `var(--color-primary-element)` |
| `--nldesign-brand-stripe-ratio-1`, `-2`, `-3` | Unitless shares, such as 6, 3 and 1. | `1` |
| `--nldesign-brand-stripe-height` | The thickness, such as `5px`. | `4px` |

Without a theme the stripe is one band in the Nextcloud primary colour.

This is the one component that reads `--nldesign-*` tokens directly. A brand stripe has no Nextcloud variable that could stand in for it, so the theme tokens are the contract.

## Accessibility

The stripe is decoration. It is `aria-hidden` and carries no meaning that is not also in the page.

## Reference

<GeneratedRef />
