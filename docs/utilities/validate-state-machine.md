# validateStateMachine

Check a state machine for structural problems: states as nodes, transitions as directed edges between them. [`CnStateMachineEditor`](../components/cn-state-machine-editor.md) runs it from its `validate()` method; a host can also run it itself, for example in a store before it publishes. The host's server stays the authority on what it accepts; this gives fast, itemised feedback first.

## Signature

```js
import { validateStateMachine } from '@conduction/nextcloud-vue'

const issues = validateStateMachine({ states, transitions }, options)
```

| Argument | Type | Description |
|----------|------|-------------|
| `graph.states` | `Array \| string` | The states, each with an `id`. A JSON string is parsed. |
| `graph.transitions` | `Array \| string` | The transitions, each with a source and a target state id. A JSON string is parsed; malformed JSON counts as no transitions. |
| `options.keys` | `object` | Record keys by role, when the host's records use other names. Defaults: `{ id: 'id', label: 'label', final: 'final', from: 'from', to: 'to', transitionLabel: 'label' }`. |
| `options.messages` | `object` | Message templates by rule code, replacing the library's own. Placeholders are filled after translation. |
| `options.translate` | `Function` | Applied to a template from `messages` before its placeholders are filled, so a host passes its own `t` and keeps its own translations. |

## Return value

An array of `{ type, code, message }`. `type` is `'error'` or `'warning'`. An empty machine returns `[]`: it is unfinished, not wrong.

## Rules

| Code | Type | Placeholders | When |
|------|------|--------------|------|
| `NO_FINAL_STATE` | error | | No state has `final === true`. |
| `UNREACHABLE_FINAL` | error | `{name}` | A final state cannot be reached from any starting state (one nothing leads into). When every state has an incoming transition there is no starting state, so nothing is reachable. |
| `DANGLING_TRANSITION` | error | `{label}` | A transition points at a state that is not in `states`. |
| `DUPLICATE_TRANSITION` | warning | `{from}`, `{to}` | Two transitions share a source and a target. |
| `ORPHAN_STATE` | warning | `{name}` | A state has no transitions at all, in a machine of more than one state. |
| `CYCLE_NO_EXIT` | warning | `{names}` | A cycle none of whose states can reach a final state. |

## Example with a host's own keys and texts

```js
const issues = validateStateMachine(
  { states: statusTypes, transitions: template.transitions },
  {
    keys: { label: 'name', final: 'isFinal', from: 'fromStatus', to: 'toStatus' },
    messages: { NO_FINAL_STATE: 'Workflow has no final status defined' },
    translate: (text) => t('myapp', text),
  },
)
```
