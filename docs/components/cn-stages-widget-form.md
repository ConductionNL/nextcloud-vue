# CnStagesWidgetForm

Config sub-form for the `stages` ([`CnStagesWidget`](./cn-stages-widget.md)) detail-page widget. Drives both `CnAddWidgetModal` and the cog style editor, so a person places and configures a stage strip from the page itself instead of asking for a code change.

## What it collects

The form is grouped the way a person thinks about the widget.

**Stages widget.** The property holding the current stage, the direction and size of the strip, and the accessible name a screen reader announces for it.

**Stages.** Where the stage list is read from, either an app endpoint or an OpenRegister query, plus the property names to read a label, a description, an order and the closing flag from. Only the source you pick is written, so switching from one to the other leaves no orphan config behind.

**Moving the record.** What clicking a stage does: save the record's own property, call an app endpoint, or nothing at all for a read-only strip. The endpoint mode collects the address, the method and the keys the stage, the comment and the result are sent under. A separate control asks whether every move must be confirmed.

**Guards.** The address that lists the reachable stages, and the property names that carry the target stage, the move id, whether it is allowed, and the reason it is not.

Keys the form does not show are kept and written back on save, so config an app hand-wrote into its manifest survives a trip through the editor.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode. |
| `value` | `object` | registry defaults | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | Emitted with the assembled content blob on every field change. |

## Notes

- `validate()` requires the property holding the current stage, a stage source, and an address for an endpoint transition.
- A read-only strip drops the transition, the guards and the confirm setting rather than writing them as empty strings.
- The address fields take `@objectId` and `@object.<property>`, so an endpoint can name the record it is asked about.

Next: read what each key does in [`CnStagesWidget`](./cn-stages-widget.md), or see how the widget resolves in the [dashboard widget catalog](./dashboard-widget-catalog.md).
