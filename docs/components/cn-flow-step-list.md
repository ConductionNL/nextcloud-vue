---
sidebar_position: 49
---

# CnFlowStepList

A flow as a list: the trigger, then the steps in run order. This is the list view of the flow editor (board `OrFlowLijst` on identity.conduction.nl/screens, shared part `OrFlowStappenlijst`).

Turn it on with `config.listMode` on a `flow` page, or render `CnFlowDetail` with `view="list"`. It reads the flow store and writes through store actions, so the canvas and the list are one document: it has no state of its own and Ctrl+Z undoes a change made here.

```vue
<CnFlowDetail :id="flowId" view="list" />
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `stepState` | `Function` | `() => null` | A step's outcome in the open run, `(id) => ({ label, variant })` or `null`. `CnFlowDetail` passes it. |

## Events

| Event | Payload | When |
|---|---|---|
| `edit` | the node id | Edit or Change trigger was pressed. |
| `add` | none | Add step was pressed. |

## How a graph reads as a list

- Order: how deep a step is in the run, then top to bottom and left to right on the canvas. A loop does not count towards the order. A step nothing leads to comes last, marked Not connected.
- A step reached over a condition carries it as a chip ("Only if amount is more than 1000", "Otherwise"). A step a plain line also reaches carries none.
- A step with more than one way on lists its routes.

## What the buttons do to the flow

- Up and Down swap two neighbours of a plain chain, in the edges and on the canvas (`store.moveStep`). A step on a branch has no neighbour to swap with, so its arrows are disabled and say to use the canvas.
- Add step puts the new step before the closing step, or after the last step when there is none (`store.appendStep`).
- Delete on a step in a chain connects the step before it to the step after it (`store.removeStep`). Any other step is removed with its lines, as on the canvas.

A published flow and an open run show the list without these buttons.
