# Tasks

## 1. Date-range pills control
- [x] 1.1 Add `dateRangeControl` computed reading `dateRange.control` (`'pills'` opt-in, else `'picker'`)
- [x] 1.2 Add `pillPresets` (presets minus `custom`), `hasCustomPreset`, `datePillsGroupLabel`, `customRangeLabel` computeds
- [x] 1.3 Render the pill toggle row in the date-range header band (role="group", aria-pressed) when control is `'pills'`, else the existing `CnDateRangePicker`
- [x] 1.4 Add the de-emphasised "Custom range" popover pill (from/to `NcActionInput`s) when a `custom` preset exists
- [x] 1.5 Add `onPillPick` forwarding to `onDateRangeChange` (same handler as the picker)
- [x] 1.6 Document the `control` option in the `dateRange` prop docblock + docs page

## 2. Card-fit registry widgets
- [x] 2.1 Add `card: true` to the `stat`, `gauge`, `delta` registry entries
- [x] 2.2 Add `isCardWidget(item)` to `CnDashboardPage` (reads the registry entry's `card` flag)
- [x] 2.3 Render card registry widgets `flush` + `cn-dashboard-page__card-fit` class
- [x] 2.4 Add the `card-fit` CSS: content area `overflow: hidden`, centred, comfortable padding; card shrinks to tile
- [x] 2.5 Harden `CnStatWidget` so a long value truncates instead of overflowing horizontally

## 3. Tests
- [x] 3.1 Pills mode: renders pills not picker; control omitted keeps picker; active pill aria-pressed; click resolves window + emits + updates state; custom popover pill present
- [x] 3.2 Card-fit: `isCardWidget` true for `card:true`, false otherwise; card widget gets the `card-fit` class, non-card does not

## 4. Verify
- [x] 4.1 `npm run build` green
- [x] 4.2 Full jest suite green
- [x] 4.3 `npm run check:jsdoc` + `npm run check:docs` green
- [x] 4.4 Live-verify on pipelinq Commercial dashboard (:8080): pills present, no select/date-inputs, no dead gap, no tile scrollbars, pill click re-filters
