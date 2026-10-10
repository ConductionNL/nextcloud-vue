## ADDED Requirements

### Requirement: A closing tab departs through a route that exists

`useObjectPresence` SHALL depart a closing tab with a beacon to
`POST .../presence?_method=DELETE`, the route OpenRegister registers for it, and
SHALL put the Nextcloud request token in the beacon's form body as
`requesttoken`, because a beacon cannot send headers and the route keeps the
CSRF check.

#### Scenario: the tab closes

- GIVEN a reader has a record open and their beat has answered
- WHEN the tab fires `beforeunload`
- THEN a beacon goes to `.../presence?_method=DELETE`
- AND its form body carries `requesttoken`
