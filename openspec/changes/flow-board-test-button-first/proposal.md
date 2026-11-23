# Proposal: flow-board-test-button-first

## Why

DqFlow draws its header as Testen met een zaak, the Actief switch, Controleren, the buildiq square and Opslaan. The flow
board drew the test button after Check (and Run), just before buildiq.

## What changes

`CnFlowBoard` draws the test-with-a-record button first in its header actions. The rest keeps its order.

## Reach

Flow pages with a `testSubject`. No prop or schema change.
