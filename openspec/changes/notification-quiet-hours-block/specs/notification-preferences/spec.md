# notification-preferences Delta: notification-quiet-hours-block

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notification-quiet-hours-block](../../)

## Purpose

A person sets their quiet hours where they choose their notifications, and the
hours are kept by OpenRegister, which holds them back.

## ADDED Requirements

### Requirement: The notification pane can show quiet hours from OpenRegister's delivery window

CnNotificationPreferences SHALL show a quiet-hours block under the
notifications when its `quietHours` prop is true, or, with the prop unset, when
the CnAppRoot ancestor's `quietHours` prop is true; otherwise it SHALL NOT show
it. The block SHALL read the current user's window from
`GET /apps/openregister/api/notification-delivery-window` and SHALL save it
with `PUT` on the same path, sending `enabled`, `start`, `end` and the
browser's IANA `timezone`; switching it off SHALL send `{enabled: false}`. It
SHALL state that the window applies to every app that sends notifications
through Open Register, and keep the window nowhere else.

#### Scenario: A person sets quiet hours

- **GIVEN** an app that turns quiet hours on and a person with no window
- **WHEN** they switch quiet hours on from 22:00 to 07:00 and save
- **THEN** the endpoint receives `enabled: true`, `start: "22:00"`, `end: "07:00"` and their time zone
- **AND** reopening the pane shows 22:00 to 07:00 switched on

#### Scenario: A refused value is explained

- **GIVEN** a window OpenRegister answers with 422
- **WHEN** the person saves
- **THEN** OpenRegister's `error` shows next to the fields and the values typed stay

#### Scenario: An OpenRegister without the endpoint

- **GIVEN** an OpenRegister that answers 404 on the delivery-window path
- **WHEN** the pane opens or the person saves
- **THEN** the block says their Nextcloud does not enforce quiet hours yet, and the values stay in the form

#### Scenario: Apps that do not ask look as before

- **GIVEN** an app whose CnAppRoot does not set `quietHours`
- **WHEN** the notification pane opens
- **THEN** no quiet-hours block shows and the delivery window is not read
