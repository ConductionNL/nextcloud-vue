# Timeline Stages Widget Specification

## Purpose
Provides a reusable Vue component for visualizing sequential progression through named stages. Used in case management, pipeline tracking, and any workflow with discrete phases.

## Requirements

### Requirement: Stage rendering
The component MUST render each item in the `stages` array as a visual node connected by a track line, preserving array order as the stage sequence.

#### Scenario: Basic stage rendering
- GIVEN a `stages` prop with 4 stage objects `[{ id: 1, label: "New" }, { id: 2, label: "In Progress" }, { id: 3, label: "Review" }, { id: 4, label: "Done" }]`
- WHEN the component is rendered
- THEN 4 stage nodes SHALL be displayed in order from left to right (horizontal) or top to bottom (vertical)
- AND each node SHALL display its `label` text
- AND nodes SHALL be connected by a continuous track line

#### Scenario: Single stage
- GIVEN a `stages` prop with 1 stage object
- WHEN the component is rendered
- THEN 1 stage node SHALL be displayed without a track line

#### Scenario: Empty stages
- GIVEN a `stages` prop that is an empty array
- WHEN the component is rendered
- THEN nothing SHALL be rendered (no errors, no empty container)

### Requirement: Stage state derivation
The component MUST derive each stage's visual state (`completed`, `current`, `upcoming`) from the `currentStage` prop relative to stage order in the array.

#### Scenario: Current stage set
- GIVEN `stages` is `[{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]` and `currentStage` is `"c"`
- WHEN the component is rendered
- THEN stages "a" and "b" SHALL have state `completed`
- AND stage "c" SHALL have state `current`
- AND stage "d" SHALL have state `upcoming`

#### Scenario: First stage is current
- GIVEN `currentStage` matches the first stage's `id`
- WHEN the component is rendered
- THEN no stages SHALL have state `completed`
- AND the first stage SHALL have state `current`
- AND all remaining stages SHALL have state `upcoming`

#### Scenario: No current stage
- GIVEN `currentStage` is `null` or `undefined`
- WHEN the component is rendered
- THEN all stages SHALL have state `upcoming`

#### Scenario: Invalid current stage
- GIVEN `currentStage` does not match any stage `id`
- WHEN the component is rendered
- THEN all stages SHALL have state `upcoming`

### Requirement: Visual state indicators
Each stage node MUST display a distinct visual indicator based on its derived state.

#### Scenario: Completed stage indicator
- GIVEN a stage with state `completed`
- WHEN rendered
- THEN the indicator SHALL display a checkmark icon or filled circle
- AND the indicator SHALL use `--color-success` for its fill color
- AND the track line segment leading to this stage SHALL be filled/colored

#### Scenario: Current stage indicator
- GIVEN a stage with state `current`
- WHEN rendered
- THEN the indicator SHALL display a prominent filled circle
- AND the indicator SHALL use `--color-primary-element` for its fill color
- AND the label text SHALL use `--color-main-text` with bold weight

#### Scenario: Upcoming stage indicator
- GIVEN a stage with state `upcoming`
- WHEN rendered
- THEN the indicator SHALL display an empty/outlined circle
- AND the indicator SHALL use `--color-border` for its border color
- AND the label text SHALL use `--color-text-maxcontrast`

### Requirement: Orientation support
The component MUST support both horizontal and vertical layout via the `orientation` prop.

#### Scenario: Horizontal orientation (default)
- GIVEN `orientation` is `"horizontal"` or not specified
- WHEN the component is rendered
- THEN stages SHALL be laid out left-to-right in a single row
- AND the track line SHALL be horizontal

#### Scenario: Vertical orientation
- GIVEN `orientation` is `"vertical"`
- WHEN the component is rendered
- THEN stages SHALL be laid out top-to-bottom in a single column
- AND the track line SHALL be vertical

### Requirement: Click interaction
When `clickable` is `true`, stage nodes MUST be interactive and emit a `stage-click` event on activation.

#### Scenario: Clickable stage click
- GIVEN `clickable` is `true`
- WHEN a user clicks on a stage node
- THEN the component SHALL emit a `stage-click` event with payload `{ stage, index }`
- AND the stage node SHALL have `cursor: pointer`

#### Scenario: Non-clickable stages
- GIVEN `clickable` is `false` or not specified
- WHEN a user clicks on a stage node
- THEN no `stage-click` event SHALL be emitted
- AND the stage node SHALL NOT have `cursor: pointer`

#### Scenario: Keyboard activation
- GIVEN `clickable` is `true`
- WHEN a stage node has focus and the user presses Enter or Space
- THEN the component SHALL emit a `stage-click` event with the same payload as a mouse click

### Requirement: Accessibility
The component MUST meet WCAG AA compliance for keyboard navigation and screen reader support.

#### Scenario: ARIA structure
- GIVEN the component is rendered
- WHEN a screen reader encounters it
- THEN the root element SHALL have `role="list"`
- AND each stage node SHALL have `role="listitem"`
- AND the current stage SHALL have `aria-current="step"`

#### Scenario: Keyboard navigation (clickable mode)
- GIVEN `clickable` is `true` and a stage node has focus
- WHEN the user presses the right arrow key (horizontal) or down arrow key (vertical)
- THEN focus SHALL move to the next stage node
- AND when the user presses left arrow (horizontal) or up arrow (vertical), focus SHALL move to the previous stage node

#### Scenario: Focus visibility
- GIVEN a stage node receives keyboard focus
- WHEN rendered
- THEN a visible focus ring SHALL be displayed around the indicator
- AND the focus ring SHALL have sufficient contrast (3:1 ratio minimum)

### Requirement: Subtitle display
The component MUST display an optional subtitle below each stage label when provided.

#### Scenario: Stage with subtitle
- GIVEN a stage object has a `subtitle` property (e.g., `{ id: 1, label: "Review", subtitle: "Mar 15" }`)
- WHEN rendered
- THEN the subtitle text SHALL be displayed below the label in smaller, muted text

#### Scenario: Stage without subtitle
- GIVEN a stage object has no `subtitle` property
- WHEN rendered
- THEN only the label SHALL be displayed (no empty space for subtitle)

### Requirement: Responsive overflow
The component MUST handle horizontal overflow gracefully when stages exceed the container width.

#### Scenario: Overflow in horizontal mode
- GIVEN more stages than can fit in the container width
- WHEN the component is rendered in horizontal orientation
- THEN the container SHALL be horizontally scrollable
- AND the current stage SHALL be scrolled into view on initial render

### Requirement: Size variants
The component MUST support `small` and `medium` size variants via the `size` prop.

#### Scenario: Medium size (default)
- GIVEN `size` is `"medium"` or not specified
- WHEN rendered
- THEN the indicator circle SHALL be 32px diameter
- AND label font size SHALL match the default body text size

#### Scenario: Small size
- GIVEN `size` is `"small"`
- WHEN rendered
- THEN the indicator circle SHALL be 20px diameter
- AND label font size SHALL be 0.85em
- AND spacing between stages SHALL be reduced proportionally

### Requirement: Slot overrides
The component MUST provide scoped slots for customizing stage indicators and labels.

#### Scenario: Custom indicator slot
- GIVEN the consumer provides an `indicator` scoped slot
- WHEN a stage is rendered
- THEN the slot content SHALL replace the default circle/checkmark indicator
- AND the slot SHALL receive `{ stage, index, state }` as scope

#### Scenario: Custom label slot
- GIVEN the consumer provides a `label` scoped slot
- WHEN a stage is rendered
- THEN the slot content SHALL replace the default label/subtitle text
- AND the slot SHALL receive `{ stage, index, state }` as scope

## Implementation Conformance

This section documents how the actual implementation in `nextcloud-vue/src/components/CnTimelineStages/` conforms to (or deviates from) the requirements above.

### Conformance Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| Stage rendering | Conforms | Empty/single/multi all handled. `v-if="stages.length > 0"` guards empty case. |
| Stage state derivation | Conforms | `stageState()` method handles all scenarios including null/invalid currentStage. |
| Visual state indicators | Conforms | Checkmark SVG for completed, filled circle for current, outlined for upcoming. Uses specified CSS variables. |
| Orientation support | Conforms | `flex-direction: row` / `column` toggled by class. Track lines adjusted per orientation. |
| Click interaction | Conforms | `onStageClick()` guards on `clickable` prop. Event payload matches spec. |
| Accessibility | Conforms | `role="list"`, `role="listitem"`, `aria-current="step"`, roving tabindex, arrow keys, Enter/Space. |
| Subtitle display | Conforms | `v-if="stage.subtitle"` conditional. Styled with smaller muted text. |
| Responsive overflow | Conforms | `overflow-x: auto` on horizontal. `scrollIntoView` on mount. |
| Size variants | Conforms | 32px/20px indicators, adjusted font sizes, track offsets recalculated for small. |
| Slot overrides | Conforms | `indicator` and `label` scoped slots with `{ stage, index, state }`. |

### Deviations from Spec

1. **Additional `ariaLabel` prop**: The implementation adds an `ariaLabel` prop (default: `'Progress stages'`) not mentioned in the spec. This is a non-breaking addition that improves accessibility by allowing consumers to provide context-specific labels (e.g., "Deal pipeline stages").

2. **Track line pixel offsets**: The track line `::before` pseudo-elements use hardcoded pixel values (`top: 16px` for 32px indicator, `top: 10px` for 20px) rather than calculated values. This works for the built-in indicator sizes but means custom `indicator` slot content with different dimensions would have misaligned track lines. The spec does not address this interaction between slot overrides and track positioning.

3. **Stage prop validator**: The implementation validates that every stage has `id` and `label` properties via a prop validator. The spec describes these fields but does not mandate runtime validation. This is a stricter-than-spec behavior that provides better developer experience.

## Accessibility Details

### ARIA Roles and Properties

| Element | Attribute | Value | Condition |
|---------|-----------|-------|-----------|
| Root `<div>` | `role` | `"list"` | Always |
| Root `<div>` | `aria-label` | Prop value (default: `"Progress stages"`) | Always |
| Stage `<div>` | `role` | `"listitem"` | Always |
| Stage `<div>` | `aria-current` | `"step"` | Only when `stageState(index) === 'current'` |
| Stage `<div>` | `tabindex` | `0` (focused) or `-1` (others) | Only when `clickable` is `true` |
| Checkmark `<svg>` | `aria-hidden` | `"true"` | On completed stage indicator SVG |

### Keyboard Interaction Model

The component implements the **roving tabindex** pattern:

1. **Tab**: Moves focus into/out of the timeline. Only one stage has `tabindex="0"` at a time (tracked by `focusedIndex` data property, initialized to `0`).
2. **ArrowRight** (horizontal) / **ArrowDown** (vertical): Moves focus to the next stage. Stops at the last stage (no wrapping).
3. **ArrowLeft** (horizontal) / **ArrowUp** (vertical): Moves focus to the previous stage. Stops at the first stage (no wrapping).
4. **Enter / Space**: Emits `stage-click` event with `{ stage, index }` payload. `event.preventDefault()` is called to prevent scroll on Space.
5. **Focus management**: `moveFocus()` updates `focusedIndex`, then calls `$refs.stageNodes[newIndex].focus()` in `$nextTick`.

### Focus Visibility

- Uses `:focus-visible` (not `:focus`) so focus rings only appear on keyboard navigation, not mouse clicks.
- Focus ring: `outline: 2px solid var(--color-primary-element); outline-offset: 2px`
- The 2px outline with 2px offset on the stage container (not the indicator alone) provides a clear, large focus target.
- Meets WCAG 2.2 "Focus Appearance" (SC 2.4.11) minimum area requirement since the outline surrounds the entire stage node including label.
