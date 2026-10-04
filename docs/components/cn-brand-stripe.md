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

## Custom properties

The stripe reads the library's own custom properties. Set them on `:root`, or on any element around the stripe.

| Property | Meaning | Fallback |
|----------|---------|----------|
| `--cn-brand-stripe-color-1`, `-2`, `-3` | The colours, start to end. | `var(--color-primary-element)` |
| `--cn-brand-stripe-ratio-1`, `-2`, `-3` | Unitless shares, such as 6, 3 and 1. | `1` |
| `--cn-brand-stripe-height` | The thickness, such as `5px`. | `4px` |

Without them the stripe is one band in the Nextcloud primary colour.

A theming app maps its own tokens onto these properties. That is the theme's job: the library does not read a theme's tokens. For example:

```css
:root {
  --cn-brand-stripe-color-1: var(--my-theme-stripe-color-1);
  --cn-brand-stripe-ratio-1: 6;
  --cn-brand-stripe-height: 5px;
}
```

## Accessibility

The stripe is decoration. It is `aria-hidden` and carries no meaning that is not also in the page.

## Reference

<GeneratedRef />
