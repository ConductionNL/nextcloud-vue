# child-records-resolve Specification (delta)

## Purpose

A child-records table whose rows come from another schema's records (a product) asks the app's server for the values only the server can decide (the price for the ordered quantity, the VAT rate) and writes them into the row.

## ADDED Requirements

### Requirement: A row added from a source record takes the values the server decides

When `config.addFrom.resolve` is set, a row added from a source record SHALL be sent to `resolve.url` with the `resolve.body` template filled in (`@source` for the record, `@source.<key>` and `@row.<key>` for single values, anything else as written; an empty `@row` value is left out). The keys of the answer named in `resolve.map` SHALL be written into the row. When the request fails, the row SHALL keep the values it had and the field SHALL say so.

#### Scenario: A product added to a lead takes its price and VAT rate
- GIVEN a lead line table with `addFrom.resolve` pointing at the app's resolve-price endpoint
- WHEN the user adds the product "Licence"
- THEN the endpoint receives the product
- AND the row shows the price and the VAT rate the endpoint answered

#### Scenario: The endpoint fails
- GIVEN the resolve endpoint answers an error
- WHEN the user adds a product
- THEN the row keeps the product's own price
- AND the field says the values could not be worked out

### Requirement: A change to a when key asks again and a typed value is kept

When a key listed in `resolve.when` changes, in the row dialog or typed into the cell, the field SHALL ask the endpoint again with the row's new values, fetching the source record by the row's `@id` key. A typed cell SHALL be asked about after typing stops. When the same edit also changes a key that `resolve.map` writes, the field SHALL NOT ask, so a value the user typed is kept.

#### Scenario: Twelve licences take the tier price
- GIVEN a lead line for 1 "Licence" at 100
- WHEN the user changes the quantity to 12
- THEN the row shows the tier price 80

#### Scenario: A manual price stays
- GIVEN a lead line for 1 "Licence" at 100
- WHEN the user changes the quantity to 12 and the price to 95 in one edit
- THEN the row keeps the price 95
