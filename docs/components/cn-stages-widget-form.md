# CnStagesWidgetForm

Config sub-form for the `stages` ([`CnStagesWidget`](./cn-stages-widget.md)) detail-page widget. Drives both `CnAddWidgetModal` and the cog style editor, so a person places and configures a stage strip from the page itself instead of asking for a code change.

## What it collects

The form is grouped the way a person thinks about the widget.

**Stages widget.** The property holding the current stage, the direction and size of the strip, and the accessible name a screen reader announces for it.

**Stages.** Where the stage list is read from, either an app endpoint or an OpenRegister query, plus the property names to read a label, a description, an order and the closing flag from. Only the source you pick is written, so switching from one to the other leaves no orphan config behind.

**Moving the record.** What clicking a stage does: move the record through its lifecycle (the default), write the stage onto the record for a schema that has no lifecycle, or nothing at all. On the lifecycle path the only thing left to type is the words to show beside a stage the record cannot reach.

There is no guard section, because there is no guard to configure. OpenRegister answers which stages are reachable and re-validates every move, so a manifest cannot map a field name badly and lose the guard. See [`CnStagesWidget`](./cn-stages-widget.md) for what each key does at render time.

Keys the form does not show are kept and written back on save, so config an app hand-wrote into its manifest survives a trip through the editor. That includes a `transition` whose `kind` this version does not recognise: the picker reads it as read only, because a typo must not select a mode nobody asked for, but the block is kept exactly as stored and the form says so. Only picking read only deliberately removes it.

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

- `validate()` requires the property holding the current stage and a stage source. The transition needs nothing: the lifecycle path has nothing to fill in, and the field path only writes the property already required above.
- A read-only strip drops the transition and its wording rather than writing them as empty strings, and the field opt-in drops the unreachable wording, which it would never show.
- A `kind` the form does not know opens as read only, matching the widget: a typo must not silently select a mode nobody asked for.
- The address fields take `@objectId` and `@object.<property>`, so an endpoint can name the record it is asked about.

Next: read what each key does in [`CnStagesWidget`](./cn-stages-widget.md), or see how the widget resolves in the [dashboard widget catalog](./dashboard-widget-catalog.md).
