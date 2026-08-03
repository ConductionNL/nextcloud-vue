import GeneratedRef from './_generated/CnTab.md'

# CnTab

One panel inside a [`CnTabs`](./cn-tabs.md) strip. Its title is rendered by the parent's nav; its body is rendered in the parent's panel area.

## Usage

```vue
<CnTabs aria-label="Case details">
  <CnTab title="Documents">
    <DocumentList />
  </CnTab>

  <!-- controlled selection -->
  <CnTab title="Tasks" :active="tab === 'tasks'" @click="tab = 'tasks'">
    <TaskList />
  </CnTab>

  <!-- rich title -->
  <CnTab>
    <template #title>
      {{ label }} <NcButton variant="tertiary" @click.stop="close()">×</NcButton>
    </template>
    <DraftForm />
  </CnTab>

  <CnTab title="Archive" disabled />
</CnTabs>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `String` | `''` | Plain-text tab title. Ignored when a `#title` slot is supplied. |
| `active` | `Boolean` | `false` | Select this tab. Honoured on mount **and** on every later change, so it can drive a controlled strip. |
| `disabled` | `Boolean` | `false` | Render the nav button disabled, skip the tab in keyboard navigation, and never give it the initial selection. |

## Slots

| Slot | Description |
| --- | --- |
| `default` | The panel body. |
| `title` | Rich tab title, rendered inside the parent's nav button. Overrides `title`. Use `@click.stop` on anything interactive here so it does not also switch tabs. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `click` | — | The user activated this tab. Fires on click and on keyboard activation. |

## Notes

- **The panel is not destroyed when inactive.** It is hidden with `hidden` + `display: none`, matching bootstrap-vue's `<BTab>`. A panel that fetches on `mounted()` would refire that request on every tab switch under a `v-if` implementation. Put a `v-if` inside the panel if you want teardown.
- **A title that is a computed value stays reactive.** The parent invokes the child's title renderer inside its own render effect, so the nav strip re-renders when the title changes.
- **Rendered outside a `CnTabs` parent, the panel shows its content** rather than vanishing. The realistic cause of a missed `inject()` is the package being loaded twice (ADR-019 / openregister#1958), and rendering blank with no error is the worse failure. The injection key is a `Symbol.for`, so duplicate module instances converge on the same key.

## Reference

<GeneratedRef />

## See also

- [`CnTabs`](./cn-tabs.md) — the strip, including the bootstrap-vue migration table
