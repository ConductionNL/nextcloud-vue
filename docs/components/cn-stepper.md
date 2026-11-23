# CnStepper

The step indicator of a wizard: a numbered list of steps, with the finished ones ticked and the current one marked `aria-current="step"`. CnWizardDialog and CnFormPage draw it, and an app can use it on its own page, such as a multi-step form laid out as the board draws it.

```vue
<CnStepper
  :steps="[
    { id: 'audience', label: 'Audience' },
    { id: 'content', label: 'Content' },
    { id: 'send', label: 'Send' },
  ]"
  :current-index="1"
  allow-jump-back
  @jump="goTo" />
```

With `allowJumpBack`, a finished step is a button that emits `jump` with its id. `reachableIndex` also keeps a step after the current one pressable once it was reached, so a person who stepped back can return to where they were.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `steps` | Array | required | The steps: `{ id, label }`. |
| `currentIndex` (`current-index`) | Number | `0` | Index of the current step. |
| `allowJumpBack` (`allow-jump-back`) | Boolean | `false` | Let a finished step be pressed to go back to it. |
| `reachableIndex` (`reachable-index`) | Number | `-1` | With `allowJumpBack`, the furthest step already reached: every step up to it other than the current one can be pressed. Unset, only the finished steps can. |
| `look` | String | `undefined` | The look; unset follows the injected `cnLook`. |
| `ariaLabel` (`aria-label`) | String | `'Steps'` | Accessible name of the list. |
| `completedLabel` (`completed-label`) | String | `'completed'` | Visually hidden text after a finished step's label. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `jump` | the step id | A finished (or reached) step button was pressed. |
