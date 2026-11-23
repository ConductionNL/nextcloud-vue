---
sidebar_position: 57
---

# CnStateMachineEditor

An editor for a state machine: states on a canvas, the transitions between them, the steps inside each state, and a property panel for whatever is selected. It is built on [`CnGraphCanvas`](./cn-graph-canvas.md), which keeps pan, zoom, dragging and the node keyboard contract.

The editor has no domain words of its own. What a state, a step and a transition carry is described by field descriptors in `config`, what the records call their keys is mapped in `config.keys`, and every text the editor shows can be replaced in `config.labels`. So a case type's statuses, a pipeline's stages and a plan's phases use the same component with different config.

Layout follows the drawn boards: the palette on the left (220px), the canvas in the middle, the properties on the right (280px). Below 1100px wide the three stack.

## The host owns the records

The editor never changes `states`, `transitions`, `steps` or `positions`. Every edit is an event; the host stores the change and passes the records back down. This is the rule CnGraphCanvas holds for positions, carried to the whole machine. Events that need an answer carry a `done` callback:

- `state-add` `{ position, done }`: create the state, then `done(id)`. A state added from the keyboard is then selected.
- `step-add` `{ state, done }`: create the step, then `done(id)` and its panel opens.
- `state-remove` `{ id, done }`: asked only after the user confirmed in a delete dialog. Remove the state with its steps and transitions and call `done(true)`, or `done(false)` to show that it failed.

The rest report a finished edit: `state-move` `{ id, x, y }`, `state-update` (record), `transition-add` `{ from, to }`, `transition-update` (record), `transition-remove` (id), `step-update` (record), `step-remove` (id), `step-reorder` `{ state, ids }` and `validated` (issues).

## Keyboard

Every pointer gesture has a keyboard route.

| Pointer | Keyboard |
|---------|----------|
| Drag a state from the palette | The add button under it |
| Drag a state | Tab to it, arrow keys (Shift for a coarse step) |
| Draw a line between two states | `c` on one state, then `c` on the other; or **Connect to …** in the state's actions menu |
| Click a line | Tab to its label and press Enter; or **Edit transition to …** in the menu |
| Remove a line | **Disconnect from …** in the menu, or Delete transition in its panel |
| Remove a state | Delete on the state, or **Delete state** in the menu |
| Open the state's menu | Shift+F10 or the menu key on the state |
| Drag a step within a state | Alt+Arrow up or down on the step |
| Drag a list item in a panel | Its move up and move down buttons |

Keys pressed on a step, the add-step button or the menu stay there, so an arrow or Delete meant for them never moves or removes the state.

## Example

```vue
<template>
  <CnStateMachineEditor
    ref="editor"
    :states="states"
    :transitions="transitions"
    :steps="steps"
    :positions="positions"
    :config="config"
    :option-sets="{ roles }"
    :locked="published"
    :read-only="false"
    :fit-view="true"
    :translate="(text) => t('myapp', text)"
    @state-add="({ position, done }) => done(addState(position))"
    @state-move="({ id, x, y }) => (positions[id] = { x, y })"
    @transition-add="({ from, to }) => transitions.push({ id: uuid(), from, to })"
    @transition-update="replace(transitions, $event)"
    @step-update="replace(steps, $event)" />
</template>
```

```js
config: {
  keys: { stateLabel: 'name', stateFinal: 'isFinal', stepState: 'status', stepBadge: 'checklist' },
  labels: { paletteItem: 'Stage', addState: 'Add stage' },
  stepFields: [
    { key: 'title', type: 'text', label: 'Title' },
    { key: 'isRequired', type: 'checkbox', label: 'Required step' },
    { key: 'checklist', type: 'list', itemType: 'object', itemKey: 'label', idKey: 'id',
      newItem: { label: '' }, label: 'Checklist', reorderable: true, section: true },
  ],
  transitionFields: [
    { key: 'label', type: 'text', label: 'Label' },
    { key: 'allowedRoles', type: 'checkboxes', label: 'Allowed roles', optionSet: 'roles' },
    { key: 'guards', type: 'typed-list', label: 'Guards', addLabel: 'Add guard', newItem: { type: 'checklist' },
      types: [
        { value: 'checklist', label: 'Checklist complete' },
        { value: 'requiredField', label: 'Required field', fields: [{ key: 'fieldName', type: 'text', label: 'Field name' }] },
      ] },
  ],
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `states` | `Array` | required | The states, each with an `id`. Name and final flag sit under `config.keys`. |
| `transitions` | `Array` | `[]` | The transitions, each with an `id` and a source and target state id. A transition whose state is gone is not drawn; `validate()` reports it. |
| `steps` | `Array` | `[]` | The steps inside states, ordered by `config.keys.stepOrder`. |
| `positions` | `Object` | `{}` | `{ [stateId]: { x, y } }`. A state without one is placed on a grid, four to a row. |
| `config` | `Object` | `{}` | See below. |
| `optionSets` | `Object` | `{}` | Named option lists `{ value, label }[]` a select or checkboxes field points at with `optionSet`. Their labels are shown as given. |
| `locked` | `Boolean` | `false` | Disable the fields marked `lockable` and step deletion, for a published version. |
| `readOnly` | `Boolean` | `false` | Show the machine without any editing control. |
| `fitView` | `Boolean` | `true` | Frame the whole machine on first render. |
| `translate` | `Function` | `null` | Translates configured texts. Without it the editor uses the app's injected `cnTranslate`. |

## config

| Key | Description |
|-----|-------------|
| `keys` | Record keys by role. Defaults: `stateLabel: 'label'`, `stateFinal: 'final'`, `transitionFrom: 'from'`, `transitionTo: 'to'`, `transitionLabel: 'label'`, `stepState: 'state'`, `stepTitle: 'title'`, `stepOrder: 'order'`, `stepRequired: 'required'`, `stepBadge: ''` (a list key whose length a step shows). |
| `stateFields`, `stepFields`, `transitionFields` | Field descriptors for each panel. A state without `stateFields` gets a panel with its add-step and delete buttons. |
| `steps` | `false` leaves steps out of the machine. On when `stepFields` is given. |
| `labels` | The editor's own texts by name, see below. |
| `paletteHelp` | Lines of help under the palette. |
| `controlsHelp` | `{ term, text }[]` for the canvas controls list. |
| `messages` | Validation messages by rule code, see [`validateStateMachine`](../utilities/validate-state-machine.md). |
| `requireFinal` | Refuse to delete the last final state. Default `true`. |
| `blockOnWarnings` | Let warnings fail `validate()` as well. Default `false`. |
| `canvasHeight` | Canvas height in px. Default `540`. |

Every text in `config` is an English source string that goes through `translate`, so the host keeps its own translations.

### Labels

`paletteTitle`, `paletteItem`, `addState`, `controlsTitle`, `canvasLabel`, `propertiesLabel`, `emptyPanel`, `final`, `stateAria` (`{name}`, the accessible name of a state on the canvas), `required`, `stepCount` (`{count}`), `stateActions` (`{name}`), `connectTo` (`{name}`), `disconnectFrom` (`{name}`), `editTransitionTo` (`{name}`), `addStep`, `deleteState`, `statePanelTitle`, `closeStatePanel`, `stepPanelTitle`, `closeStepPanel`, `deleteStep`, `transitionPanelTitle`, `closeTransitionPanel`, `deleteTransition`, `deleteTransitionConfirm` (`{name}`), `deleteStateConfirm` (`{name}`), `needsFinal`, `deleteStateFailed`, `unnamedTransition`, `transitionAria` (`{from}`, `{to}`), `dismiss`.

### Field descriptors

Every descriptor has a `type`, and all but `row` and a key-less `group` a `key`.

| Type | Edits | Options |
|------|-------|---------|
| `text`, `textarea`, `number` | One value | `label`, `placeholder`, `hint` (linked with `aria-describedby`), `rows`, `min`, `max`, `width: 'narrow'`, `hideLabel` (the label stays for screen readers), `default` |
| `checkbox` | A boolean | `label`, `default` |
| `select` | One option | `options` or `optionSet`, `emptyOption: { value, label }` |
| `checkboxes` | An array of option values | `options` or `optionSet` |
| `list` | An array of strings, or of objects with one edited text (`itemType: 'object'`, `itemKey`) | `itemLabel`, `addLabel`, `removeLabel`, `reorderable`, `idKey` + `idPrefix` (a fresh id per new item), `newItem`, `section` |
| `typed-list` | An array of objects whose fields depend on `typeKey` (default `type`) | `types: [{ value, label, fields, hidden }]`, `typeLabel`, `addLabel`, `removeLabel`, `newItem`, `section`. A `hidden` type is not offered, but an item stored with it still shows its fields. |
| `group` | With a `key`, a nested object; without one, layout only | `fields`, `label`, `collapsible` (with `aria-expanded`), `open`, `optional` + `toggleLabel` (the object exists only while switched on), `defaults`, `requireAll` (left out unless every field is filled in), `prune` (drops blank values and empty lists, and blank strings from string lists), `omitWhenEmpty`, `lockable` + `lockedNotice`, `section` |
| `row` | Layout only: `fields` side by side | |

Values a host stored as JSON strings are parsed. Keys no descriptor names are carried through unchanged, and a panel that is only opened adds nothing to the record.

## Methods

- `validate()`: runs [`validateStateMachine`](../utilities/validate-state-machine.md), shows the issues above the editor and returns `true` when nothing blocks.

## Slots

None. The node and edge-label slots of the canvas are filled by the editor.

## Accessibility

- Every control has a visible label or, for icon buttons and list entries, an accessible name.
- Severity is said in text (Error:, Warning:) as well as by colour and icon; a required step says "required" to a screen reader as well as showing `*`.
- Removing a state or a transition from its panel asks first, in a dialog.
- Colours come from Nextcloud variables, so the editor follows the theme, dark included.
