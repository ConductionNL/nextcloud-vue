# dashboard-page Specification (delta)

## ADDED Requirements

### Requirement: A dashboard header counts the user's unread notifications of the app

A dashboard page with `notificationsBadge` (`true` for its own app, or an app id) SHALL show in its header the number of
the signed-in user's unread Nextcloud notifications of that app, read from the notifications OCS API. Clicking the badge
SHALL list them, newest first, each with its icon, summary, relative time and link. With no unread notification of the
app, or without the notifications app, the page SHALL show no badge. A page refresh SHALL read the count again.

#### Scenario: Two unread assignments
- **GIVEN** two pipelinq notifications and one files notification are unread for the agent
- **WHEN** the agent opens My work with `notificationsBadge: true`
- **THEN** the header badge shows 2

#### Scenario: Nothing unread
- **GIVEN** the agent has no unread pipelinq notification
- **WHEN** the agent opens My work
- **THEN** no badge is shown

### Requirement: Opening a notification marks it read

Opening a notification from the list SHALL dismiss it through the notifications OCS API, lower the count, and open its
link. When the dismissal fails the link SHALL still open.

#### Scenario: Reading one lowers the count
- **GIVEN** the badge shows 2
- **WHEN** the agent opens the list and clicks one notification
- **THEN** its item opens, the notification is dismissed, and the badge shows 1
