# Proposal: flow-test-with-a-record

## Why

Board DqFlow draws "Testen met een zaak". The board's test button ran the saved flow for real with the picked record:
it changed the record, sent its mails and started its tasks, which is not what testing a change should do.
OpenRegister now offers a dry-run (`POST /api/flows/{id}/dry-run`, openregister#4753) that walks the flow against a
record and changes and sends nothing.

## What changes

The test button tries the flow through the dry-run. The flow store's `dryRun(subject)` keeps the answer in
`dryRunResult`, and CnFlowBoard draws it beside the canvas with CnFlowDryRunResult: each step reached in order, what it
did or would do, the fields it would change, the messages it would send, and that nothing was changed or sent. The
dialog says the same before the reader starts.
