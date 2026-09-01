import GeneratedRef from './_generated/CnTabsWidgetForm.md'

# CnTabsWidgetForm

The config sub-form for a [`tabs`](./cn-tabs-widget.md) widget. Used by `CnAddWidgetModal` and the cog editor.

## Why it exists

A bare widget picker would have been enough to choose which siblings become tabs. The form goes further because the tab strip is the only place a child's name appears: "Files and attachments" reads fine on a card and is too long once six tabs share the width. So each tab carries a label of its own, and leaving it empty falls back to the widget's own title.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `Object` | `{}` | The stored config: `{ tabs, ariaLabel }`. |
| `availableWidgets` | `Array` | `[]` | Every widget definition on the surface, so the picker can offer the siblings this widget may hold. |
| `widgetId` | `String` | `''` | This widget's own id, so the picker cannot offer the tabs widget itself. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `update:content` | `object` | The edited config blob. |

## Notes

- **The picker excludes this widget and every other container.** A widget that contains itself never finishes rendering, and nesting a tab strip inside a tab strip gives the reader two rows of tabs with no way to tell which row owns the panel.
- **An empty label is deleted, not stored.** Storing `''` would render a blank tab; deleting the key falls the tab back to the child widget's own title.
- **Reordering the picker reorders the tabs.** Labels already typed survive, because entries are matched by `widgetId` rather than by position.

## See also

- [`CnTabsWidget`](./cn-tabs-widget.md) for the widget this configures

<GeneratedRef />
