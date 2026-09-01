import GeneratedRef from './_generated/CnTabs.md'

# CnTabs

A generic tab strip: a `role="tablist"` nav plus a panel area filled by [`CnTab`](./cn-tab.md) children.

## Why it exists

Neither `@nextcloud/vue@9` nor this library shipped one. The only tab component in either is `NcAppSidebarTab`, which is meaningless outside an `NcAppSidebar` — so a tab strip inside a page, a dialog or a detail view had no Nextcloud-native option. Apps reached for `bootstrap-vue@2`, which is **Vue 2-only** with no Vue 3 release (`bootstrap-vue-next` is a different package with a different API), and pulling a second UI framework in alongside `@nextcloud/vue` cuts against the fleet rule that apps render with Nextcloud components.

zaakafhandelapp wrote a local `Tabs`/`Tab` pair for eight views; opencatalogi and openregister flagged the same gap. `CnTabs`/`CnTab` is that pair, lifted into the library and hardened (full WAI-ARIA wiring, keyboard navigation, disabled tabs).

## Usage

```vue
<template>
  <CnTabs aria-label="Case details" justified>
    <CnTab title="Documents">
      <DocumentList :case-id="id" />
    </CnTab>
    <CnTab title="Tasks" :active="tab === 'tasks'" @click="tab = 'tasks'">
      <TaskList :case-id="id" />
    </CnTab>
    <CnTab>
      <template #title>
        {{ draft.label }}
        <NcButton variant="tertiary" @click.stop="close(draft)">×</NcButton>
      </template>
      <DraftForm v-model="draft" />
    </CnTab>
  </CnTabs>
</template>

<script>
import { CnTabs, CnTab } from '@conduction/nextcloud-vue'

export default { components: { CnTabs, CnTab } }
</script>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `contentClass` | `String` | `''` | Extra class on the panel container. bootstrap-vue's `content-class`. |
| `justified` | `Boolean` | `false` | Stretch the nav items to fill the strip. bootstrap-vue's `justified`. |
| `card` | `Boolean` | `false` | Card-style chrome (border + padding) around the panel area. |
| `ariaLabel` | `String` | `''` | Accessible name applied to the `role="tablist"` element. **Set this** — screen-reader users otherwise hear an unnamed tab list. |

## Slots

| Slot | Description |
| --- | --- |
| `default` | The [`CnTab`](./cn-tab.md) children. Anything else is rendered into the panel area untouched. |
| `nav-end` | Fills the right-hand end of the tab bar, beside the strip. Receives `activeIndex`. Use it for a control that belongs to the strip as a whole, such as one Actions menu serving whichever panel is showing. |

### Why `nav-end` sits outside the tablist

The slot renders as a sibling of the `role="tablist"` element, not inside it. Anything nested in a tablist is announced as one of the tabs, so a button in there makes a screen-reader user counting six tabs hear seven.

`CnTabsWidget` uses this slot to hoist the active child widget's Actions menu out of the panels and into the bar, so one menu serves every tab.

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `update:activeIndex` | `number` | The selection changed; payload is the new active tab's index. Not emitted when the already-active tab is re-activated. |

## Migrating from `bootstrap-vue`

`<BTabs>`/`<BTab>` map across directly for the subset apps actually used:

| bootstrap-vue | CnTabs |
| --- | --- |
| `<BTabs content-class="…">` | `<CnTabs content-class="…">` |
| `<BTabs justified>` | `<CnTabs justified>` |
| `<BTabs card>` | `<CnTabs card>` |
| `<BTab title="…">` | `<CnTab title="…">` |
| `<BTab><template #title>…` | `<CnTab><template #title>…` |
| `<BTab :active="expr">` | `<CnTab :active="expr">` |
| `<BTab @click="…">` | `<CnTab @click="…">` |

Not reimplemented: `lazy`, `no-fade`, `pills`, `end`/`vertical` orientations, and `<BTab disabled>`'s tooltip behaviour (`disabled` itself is supported).

Add `aria-label` while you migrate — bootstrap-vue did not require one and most call sites do not have it.

## Accessibility

Implements the WAI-ARIA tabs pattern:

- `role="tablist"` / `role="tab"` / `role="tabpanel"`
- `aria-selected` on every tab; `aria-controls` ↔ `aria-labelledby` wired both ways
- a roving `tabindex`: only the selected tab is in the tab order
- <kbd>←</kbd> / <kbd>→</kbd> / <kbd>Home</kbd> / <kbd>End</kbd> move the selection within the strip, wrapping at both ends and skipping disabled tabs

## Notes

- **Panels stay mounted.** An inactive panel is hidden, not destroyed — matching `<BTab>`. Panels that fetch on `mounted()` would otherwise refire on every switch. Use `v-if` inside the panel if you specifically want teardown.
- **Registration is by mount order**, which is document order for both static children and `v-for`-generated ones.
- **Closable tabs work**: when the active tab unmounts, the selection moves to its nearest remaining neighbour.

## Reference

<GeneratedRef />

## See also

- [`CnTab`](./cn-tab.md) — one panel in the strip
- `NcAppSidebarTab` (from `@nextcloud/vue`) — for tabs *inside an `NcAppSidebar`*, which is a different job
