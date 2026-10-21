# declarative-actions Delta: actions-time-windows-and-endpoint-routes

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A condition can compare against an instant relative to now

The filter token `@now±N(m|h|d)` SHALL resolve to the instant that many minutes, hours or days from now, in ISO-8601, and
SHALL be a known filter sentinel.

#### Scenario: A reminder an hour ahead

- **GIVEN** an action with `visibleWhen { field: startAt, op: gt, value: "@now+1h" }`
- **WHEN** the booking starts in 30 minutes
- **THEN** the action is hidden

### Requirement: An endpoint form can open the record the endpoint answers

An `open-form` with an `endpoint` and `onSuccessRoute` SHALL, after a successful save, push the route with the id the
answer holds (at `onSuccessRoute.idPath`, else its id, uuid or `@self.id`). When the answer holds no id it SHALL stay on the
page.

#### Scenario: Reschedule opens the new booking

- **GIVEN** a Reschedule endpoint form with `onSuccessRoute { name: BookingDetail, idPath: bookingId }`
- **WHEN** the endpoint answers `{ "bookingId": "b-2" }`
- **THEN** the page opens booking b-2

### Requirement: An endpoint form field can be required

A `formProperties` entry with `required: true` SHALL be a required field of the endpoint form.

#### Scenario: A count needs an amount

- **GIVEN** a Close and count form whose `amount` is required
- **WHEN** the cashier leaves it empty
- **THEN** the form does not save

### Requirement: An admin only action stays hidden as a button

An `adminOnly` header action named as a stage's primary action or as a quick action SHALL be drawn as a button for an
instance admin only; for anyone else it SHALL stay out of the header, as it does in the menu.

#### Scenario: A refund only an admin confirms

- **GIVEN** a pending refund whose primary action is the admin only Confirm
- **WHEN** a cashier who is not an admin opens it
- **THEN** no Confirm button is drawn
