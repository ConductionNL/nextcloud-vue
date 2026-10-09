# CnProcessSteps

The step indicator of a journey, rendered with NL Design `denhaag-process-steps` classes. Colours come from Nextcloud's CSS variables, so the nldesign app re-themes it; no React design-system package is involved. The current, completed and upcoming steps are announced as text and with `aria-current="step"`, not by colour alone.

## Usage

```vue
<CnProcessSteps :steps="steps" current="address" @select="goTo" />
```

Each step is `{ id, label, number?, navigable?, children? }`. A step with `children` is a group with sub-steps one level deep; `navigable: false` makes it a heading rather than a button.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `steps` | Array | `[]` | The steps to show. |
| `current` | String | `''` | Id of the current step or sub-step; steps before it are completed. |
| `label` | String | "Progress" | Accessible name of the indicator. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | step id | A navigable step was chosen. |

## Slots

None.
