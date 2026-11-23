## ADDED Requirements

### Requirement: a record list row can carry its meta beside the title

A `rows` record list with `metaBeside: true` MUST set each row's meta line on the title's line, on one baseline 14px after the title, at 14px, and MUST let it wrap under the title when the line is too narrow.

#### Scenario: DqTermijnen annual penalty total
- GIVEN the annual audit's summary row "Totale dwangsom in 2026: € 1.442,00" with the meta "1 betaling, geen betwist"
- THEN both read on one line, the meta in the muted 14px ink
