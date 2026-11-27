# widget-wrapper Delta: widget-placeholder-shape

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-placeholder-shape](../../)

## Purpose

`CnWidgetWrapper` draws the widget's declared placeholder while its content loads, instead of a spinner.

## ADDED Requirements

### Requirement: The wrapper draws the shaped placeholder while the widget loads

`CnWidgetWrapper` SHALL accept `loading` (Boolean, default `false`) and `placeholder` (a shape name or
`{ shape, count }`, default `rows`). While `loading` is true it SHALL draw `CnWidgetPlaceholder` with that shape over
its content area, keep its default slot mounted inside a container with `visibility: hidden`, carry `aria-busy="true"`
on its root and render no status message of its own. The header, title, icon and footer SHALL render as when loaded.
When `loading` turns false the placeholder SHALL go and the content SHALL show in the same frame, without changing the
wrapper's size. A wrapper whose `loading` is never set SHALL render exactly as before.

#### Scenario: A loading widget shows its shape, not a spinner

- GIVEN a `CnWidgetWrapper` titled "My cases" with `loading` true and `placeholder` `rows`
- WHEN it renders
- THEN the title "My cases" shows and the content area shows rows
- AND no loading spinner is drawn
- AND the wrapper has `aria-busy="true"` and the placeholder `aria-hidden="true"`

#### Scenario: The content keeps loading behind the placeholder

- GIVEN a `CnWidgetWrapper` with `loading` true around a renderer that fetches its items on mount
- WHEN the wrapper renders
- THEN the renderer is mounted and starts its fetch
- AND its content is not visible and not in the accessibility tree

#### Scenario: The content replaces the placeholder in place

- GIVEN a loading wrapper 4 grid rows high
- WHEN `loading` turns false
- THEN the placeholder is gone, the content shows, `aria-busy` is removed and the wrapper's size has not changed

#### Scenario: A refresh keeps the content

- GIVEN a loaded wrapper whose host sets `refreshing` true
- WHEN the widget refreshes
- THEN the content stays visible and no placeholder is drawn
