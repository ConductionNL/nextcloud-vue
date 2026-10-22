# flow-test-with-a-record Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [flow-test-with-a-record](../../)

## ADDED Requirements

### Requirement: Testing a flow with a record changes nothing

The flow board's test button SHALL try the saved flow with the picked record through OpenRegister's dry-run and SHALL
NOT start a run. The dialog SHALL say that nothing is changed or sent.

#### Scenario: Testen met een zaak

- **GIVEN** a saved flow and a case picked in the test dialog
- **WHEN** the reader presses Run test
- **THEN** `POST /apps/openregister/api/flows/{id}/dry-run` is called with the case, and no run is started

### Requirement: The result shows each step beside the canvas

After a test the board SHALL show, beside the canvas, each step reached in order, named by its label or else its type,
with what it did or would do, the fields it would change and the messages it would send, and SHALL say that nothing
was changed or sent. Closing the result SHALL put it away.

#### Scenario: A mail step

- **GIVEN** a test that reached a send-email step to bob and carol with subject "About Case 7"
- **THEN** the result lists the step with "To bob, carol · About Case 7"
