---
status: reviewed
---

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

## ADDED Requirements

### Requirement: Error state support
The component MUST support an `error` state for stages that have failed or require attention, in addition to the existing `completed`, `current`, and `upcoming` states.

#### Scenario: Stage marked as error via stage property
- GIVEN a stage object has an `error` property set to `true` (e.g., `{ id: "review", label: "Review", error: true }`)
- WHEN the component is rendered
- THEN the stage indicator SHALL display a warning or error icon (exclamation mark)
- AND the indicator SHALL use `--color-error` for its fill color
- AND the label text SHALL use `--color-error` for its color
- AND the error state SHALL take precedence over the positional state (completed/current/upcoming)

#### Scenario: Stage marked as error with message
- GIVEN a stage object has `error: true` and `errorMessage: "Approval rejected"`
- WHEN the stage is rendered
- THEN the error icon SHALL be displayed
- AND the `errorMessage` SHALL be available to the `indicator` and `label` scoped slots via the scope object as `{ stage, index, state, errorMessage }`

#### Scenario: Error stage in completed position
- GIVEN stages `[A, B, C]` with `currentStage` set to `"C"` and stage B has `error: true`
- WHEN rendered
- THEN stage B SHALL display the error indicator instead of the completed checkmark
- AND the track line between A and B SHALL still be filled (reflecting positional progress)

### Requirement: Stage data binding with status models
The component MUST support binding stage data to external status models by accepting flexible stage object shapes beyond the required `id` and `label` properties.

#### Scenario: Pipeline stage binding
- GIVEN stages derived from a pipeline configuration `[{ id: "new", label: "New", probability: 10 }, { id: "qualified", label: "Qualified", probability: 40 }, { id: "won", label: "Won", probability: 100 }]`
- WHEN the component is rendered
- THEN extra properties (e.g., `probability`) SHALL be passed through to scoped slots and event payloads without modification
- AND the `stage-click` event payload SHALL include the complete stage object with all properties

#### Scenario: Case status binding with history
- GIVEN stages derived from a case type's status definitions and a `statusHistory` array of `{ statusId, date }` entries
- WHEN the consumer uses the `label` scoped slot
- THEN the consumer SHALL have access to the full stage object to render history dates as subtitles
- AND the component itself SHALL NOT require knowledge of the history data structure

### Requirement: Progress indicator
The component MUST expose the overall progress through the stages as a computed value and optional visual element.

#### Scenario: Progress percentage calculation
- GIVEN 5 stages with the 3rd stage as `currentStage`
- WHEN the component is rendered
- THEN the component SHALL expose a `progress` value of `50` (percentage) via a scoped slot or reactive property
- AND the progress SHALL be calculated as `(currentStageIndex / (totalStages - 1)) * 100`

#### Scenario: Progress bar display
- GIVEN the `showProgress` prop is `true`
- WHEN the component is rendered
- THEN a progress bar SHALL be displayed below (horizontal) or beside (vertical) the timeline
- AND the progress bar fill SHALL use `--color-primary-element`
- AND the progress percentage SHALL be displayed as text (e.g., "50%")

#### Scenario: No current stage progress
- GIVEN `currentStage` is `null`
- WHEN the component is rendered with `showProgress` set to `true`
- THEN the progress bar SHALL show 0% fill
- AND the text SHALL display "0%"

### Requirement: Responsive layout switching
The component MUST automatically switch from horizontal to vertical layout on narrow viewports when `responsive` mode is enabled.

#### Scenario: Automatic orientation switch on narrow viewport
- GIVEN `responsive` is `true` and `orientation` is `"horizontal"`
- WHEN the container width falls below 480px
- THEN the layout SHALL switch to vertical orientation
- AND all stage nodes SHALL re-render in top-to-bottom order
- AND the track lines SHALL adjust to vertical alignment

#### Scenario: Restore horizontal on wide viewport
- GIVEN the component previously switched to vertical due to narrow width
- WHEN the container width increases above 480px
- THEN the layout SHALL switch back to horizontal orientation

#### Scenario: Responsive disabled
- GIVEN `responsive` is `false` or not specified
- WHEN the container is narrower than 480px
- THEN the component SHALL maintain its configured `orientation`
- AND horizontal overflow scrolling SHALL handle the narrow width instead

### Requirement: NL Design System theming
The component MUST render correctly under NL Design System theme overrides without any component-level changes, relying exclusively on Nextcloud CSS variable inheritance.

#### Scenario: Theme variable inheritance
- GIVEN the `nldesign` app is active and overrides `--color-primary-element` to a municipality brand color
- WHEN the component renders a current stage
- THEN the indicator SHALL use the overridden brand color
- AND the focus ring SHALL use the overridden brand color
- AND no hardcoded color values SHALL be visible

#### Scenario: High contrast mode
- GIVEN the user has enabled Nextcloud's high contrast mode (or an NL Design high-contrast theme)
- WHEN the component is rendered
- THEN the track line, indicators, and labels SHALL maintain WCAG AAA contrast ratios
- AND the completed/current state distinction SHALL remain perceivable through shape differences (checkmark vs. dot), not only color

#### Scenario: Dark theme compatibility
- GIVEN the user has enabled Nextcloud dark theme
- WHEN the component is rendered
- THEN the stage background (`--color-main-background`), text (`--color-main-text`), and borders (`--color-border`) SHALL adapt to dark mode values
- AND the track line and indicator colors SHALL remain distinct against the dark background

### Requirement: Custom stage rendering via slots
The component MUST provide granular slot overrides for individual stage content areas including a slot for the entire stage node.

#### Scenario: Full stage slot override
- GIVEN the consumer provides a `stage` scoped slot
- WHEN a stage is rendered
- THEN the slot content SHALL replace the entire stage node content (indicator + label + subtitle)
- AND the slot SHALL receive `{ stage, index, state, isFirst, isLast }` as scope
- AND the stage node container SHALL still maintain its track line connections and ARIA attributes

#### Scenario: Custom indicator with icon name
- GIVEN a stage object has an `icon` property (e.g., `{ id: "review", label: "Review", icon: "mdi:eye" }`)
- WHEN the default indicator is rendered (no `indicator` slot override)
- THEN the indicator SHALL display the specified icon instead of the default circle/checkmark
- AND the icon SHALL be sized proportionally to the indicator (16px for medium, 12px for small)

#### Scenario: Combining indicator slot with default label
- GIVEN the consumer provides only an `indicator` scoped slot but no `label` slot
- WHEN a stage is rendered
- THEN the custom indicator SHALL be displayed
- AND the default label and subtitle rendering SHALL be preserved

### Requirement: Stage tooltips
The component MUST display tooltip content on hover or focus when stages have tooltip data.

#### Scenario: Stage with tooltip text
- GIVEN a stage object has a `tooltip` property (e.g., `{ id: "review", label: "Review", tooltip: "Requires 2 approvals" }`)
- WHEN the user hovers over the stage node or the stage receives keyboard focus
- THEN a tooltip SHALL appear with the text "Requires 2 approvals"
- AND the tooltip SHALL be positioned above (horizontal orientation) or to the right (vertical orientation)

#### Scenario: Stage without tooltip
- GIVEN a stage object has no `tooltip` property
- WHEN the user hovers over the stage node
- THEN no tooltip SHALL appear

#### Scenario: Tooltip accessibility
- GIVEN a stage has a `tooltip` property
- WHEN rendered
- THEN the stage node SHALL have `aria-describedby` pointing to the tooltip element
- AND the tooltip element SHALL have `role="tooltip"`

### Requirement: Stage groups and sections
The component MUST support grouping stages into named sections for complex workflows with distinct phases.

#### Scenario: Grouped stages
- GIVEN a `groups` prop with value `[{ label: "Intake", stageIds: ["new", "qualify"] }, { label: "Processing", stageIds: ["review", "approve"] }]`
- WHEN the component is rendered
- THEN stages SHALL be visually grouped with a section label above each group
- AND a subtle separator or increased gap SHALL appear between groups
- AND the track line SHALL continue across group boundaries

#### Scenario: No groups defined
- GIVEN the `groups` prop is not provided or is an empty array
- WHEN the component is rendered
- THEN all stages SHALL render in a flat sequence without section labels or separators
- AND behavior SHALL be identical to the base rendering requirement

#### Scenario: Group label styling
- GIVEN groups are defined
- WHEN rendered
- THEN group labels SHALL use `--color-text-maxcontrast` and a smaller font size (0.75em)
- AND group labels SHALL be positioned above their stage cluster (horizontal) or as an inline header (vertical)

### Requirement: Animation on stage transitions
The component MUST animate state changes when the `currentStage` prop updates at runtime.

#### Scenario: Stage advances forward
- GIVEN the component is rendered with `currentStage` set to stage B
- WHEN `currentStage` changes to stage C
- THEN the indicator for stage B SHALL animate from "current" to "completed" (scale down, color transition to success green)
- AND the indicator for stage C SHALL animate from "upcoming" to "current" (scale up, color transition to primary blue)
- AND the track line segment between B and C SHALL animate its fill from left to right (horizontal) or top to bottom (vertical)
- AND all transitions SHALL complete within 300ms

#### Scenario: Stage moves backward
- GIVEN `currentStage` changes from stage C back to stage B
- WHEN the transition occurs
- THEN stage C's indicator SHALL animate from "current" to "upcoming"
- AND stage B's indicator SHALL animate from "completed" to "current"
- AND the track line segment between B and C SHALL animate its fill removal

#### Scenario: Reduced motion preference
- GIVEN the user has `prefers-reduced-motion: reduce` set in their OS/browser
- WHEN a stage transition occurs
- THEN all animations SHALL be disabled
- AND state changes SHALL apply immediately without transition effects

### Requirement: Configurable stage icons and colors
The component MUST allow per-stage customization of indicator icons and colors via stage object properties.

#### Scenario: Custom stage color
- GIVEN a stage object has a `color` property (e.g., `{ id: "urgent", label: "Urgent Review", color: "#e74c3c" }`)
- WHEN the stage is in the `current` state
- THEN the indicator SHALL use the specified custom color instead of `--color-primary-element`
- AND the custom color SHALL only apply to the indicator fill, not to track lines or labels

#### Scenario: Custom stage color in completed state
- GIVEN a stage has a `color` property and is in the `completed` state
- WHEN rendered
- THEN the indicator SHALL use `--color-success` (the standard completed color), not the custom color
- AND the custom color SHALL only be applied when the stage is `current`

#### Scenario: Stage without custom properties
- GIVEN a stage object has no `icon` or `color` properties
- WHEN rendered
- THEN the default indicator (circle/checkmark/outlined) and default Nextcloud CSS variable colors SHALL be used

### Requirement: Integration with pipeline and case status models
The component MUST work seamlessly when bound to pipeline stage configurations (Pipelinq) and case status type definitions (Procest).

#### Scenario: Pipeline stage mapping
- GIVEN a Pipelinq pipeline configuration with stages `[{ id: "lead", title: "Lead", probability: 10, order: 1 }, { id: "qualified", title: "Qualified", probability: 30, order: 2 }]`
- WHEN the consumer maps these to the `stages` prop as `stages.map(s => ({ id: s.id, label: s.title, subtitle: s.probability + '%' }))`
- THEN the component SHALL render each mapped stage correctly
- AND clicking a stage (when `clickable`) SHALL emit the mapped stage object in the payload

#### Scenario: Case status type mapping
- GIVEN a Procest case type with status types `[{ id: "open", name: "Open" }, { id: "in_progress", name: "In Progress" }, { id: "closed", name: "Closed" }]` and a status history
- WHEN the consumer maps these to stages with subtitles derived from the history
- THEN completed stages SHALL show the date they were reached as subtitle text
- AND the current stage SHALL show "Current" or a localized equivalent as subtitle

#### Scenario: Dynamic stage list update
- GIVEN the component is rendered with an initial set of stages
- WHEN the `stages` prop is updated (e.g., pipeline reconfigured, stages added or removed)
- THEN the component SHALL re-render with the new stage list
- AND if `currentStage` still matches a stage id in the new list, state derivation SHALL be preserved
- AND if `currentStage` no longer matches, all stages SHALL revert to `upcoming`

### Requirement: Accessible stage count announcement
The component MUST provide screen reader users with contextual information about overall progress.

#### Scenario: Screen reader progress context
- GIVEN the component is rendered with 5 stages and `currentStage` pointing to the 3rd stage
- WHEN a screen reader reads the root element
- THEN the accessible label SHALL convey both the component purpose and progress (e.g., via `aria-label` combining the `ariaLabel` prop with "step 3 of 5")

#### Scenario: Screen reader stage state
- GIVEN a screen reader focuses on a completed stage
- WHEN the stage content is read
- THEN the stage SHALL convey its state to assistive technology (e.g., via `aria-label` including "completed" for completed stages and "upcoming" for upcoming stages)

#### Scenario: Live region for stage changes
- GIVEN the component is rendered and `currentStage` changes at runtime
- WHEN the new current stage is activated
- THEN an `aria-live="polite"` region SHALL announce the transition (e.g., "Now on step 3: Review")
- AND the announcement SHALL not interrupt current screen reader output

## Implementation Conformance

This section documents how the actual implementation in `nextcloud-vue/src/components/CnTimelineStages/` conforms to (or deviates from) the requirements above.

## Conformance Summary

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
| Error state support | Not implemented | No `error` property handling or error indicator exists. |
| Stage data binding | Partial | Extra properties pass through in events/slots, but no formal contract. |
| Progress indicator | Not implemented | No `showProgress` prop or progress bar rendering. |
| Responsive layout switching | Not implemented | No `responsive` prop or container query / resize observer. |
| NL Design System theming | Conforms | All colors use Nextcloud CSS variables; nldesign overrides work automatically. |
| Custom stage rendering via slots | Partial | `indicator` and `label` slots exist, but no full `stage` slot or `icon` property support. |
| Stage tooltips | Not implemented | No tooltip rendering or `tooltip` property handling. |
| Stage groups and sections | Not implemented | No `groups` prop or section label rendering. |
| Animation on stage transitions | Partial | CSS `transition` on background/border-color (0.15s), but no track line fill animation or reduced-motion handling. |
| Configurable stage icons/colors | Not implemented | No `icon` or `color` stage properties are processed. |
| Integration with pipeline/case models | Conforms | Component is model-agnostic; consumers map freely. Procest currently uses a custom StatusTimeline instead. |
| Accessible stage count announcement | Not implemented | `aria-label` is static; no step count, per-stage state labels, or live region. |

## Deviations from Spec

1. **Additional `ariaLabel` prop**: The implementation adds an `ariaLabel` prop (default: `'Progress stages'`) not mentioned in the spec. This is a non-breaking addition that improves accessibility by allowing consumers to provide context-specific labels (e.g., "Deal pipeline stages").

2. **Track line pixel offsets**: The track line `::before` pseudo-elements use hardcoded pixel values (`top: 16px` for 32px indicator, `top: 10px` for 20px) rather than calculated values. This works for the built-in indicator sizes but means custom `indicator` slot content with different dimensions would have misaligned track lines. The spec does not address this interaction between slot overrides and track positioning.

3. **Stage prop validator**: The implementation validates that every stage has `id` and `label` properties via a prop validator. The spec describes these fields but does not mandate runtime validation. This is a stricter-than-spec behavior that provides better developer experience.

4. **Procest StatusTimeline duplication**: Procest has a custom `StatusTimeline` component (`procest/src/views/cases/components/StatusTimeline.vue`) that reimplements stage visualization with status history support. This suggests the shared component lacks features (error states, history dates, status-specific colors) needed by case management consumers. The ADDED requirements for error state support, stage data binding, and integration with pipeline/case models address this gap.

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
