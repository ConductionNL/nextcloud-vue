## ADDED Requirements

### Requirement: An object-op's values take the dynamic tokens

An `object-op` action with op `create` or `patch` SHALL fill the dynamic tokens in its `values` with the dispatch context before it writes.

#### Scenario: checking someone in
- GIVEN a row action `{ type: "object-op", op: "patch", values: { checkedInAt: "@now" } }`
- WHEN it runs on a registration
- THEN the registration's checkedInAt is the moment it ran, not the text "@now"
