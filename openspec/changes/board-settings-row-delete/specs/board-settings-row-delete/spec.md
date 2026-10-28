# board-settings-row-delete Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A delete in a settings row does not shout

In the board look an error-variant button in a settings row SHALL NOT draw NcButton's filled red. Inside a
`cn-settings-row-actions` container it SHALL draw the soft error tint with the error text colour and no edge; in a table
cell on a settings card it SHALL draw the main background with a 1px error-coloured edge and the error text colour.

#### Scenario: pipelinq's product category rows

- **GIVEN** the product categories card on pipelinq's admin settings in the board look
- **THEN** a row's "Verwijderen" has the soft red tint, red text and no border

#### Scenario: pipelinq's payment method table

- **GIVEN** the payment methods table on pipelinq's POS settings in the board look
- **THEN** a row's "Verwijderen" is white with a red border and red text
