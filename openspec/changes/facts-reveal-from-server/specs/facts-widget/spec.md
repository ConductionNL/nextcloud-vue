# facts-widget Delta

## ADDED Requirements

### Requirement: A masked fact can be revealed by the server

A masked facts entry with `reveal: { url, path? }` SHALL fetch the value from `url` when the reader presses Show,
without a cache, and SHALL show that value; when the read fails it SHALL keep the mask and say the value could not
be shown.

#### Scenario: DqContact BSN

- **GIVEN** the Identity card's BSN row reads "*****7609" with reveal url `.../brpPerson/@objectId?_reveal=citizenServiceNumber`
- **WHEN** the reader presses Tonen
- **THEN** the widget requests that url and shows "123457609"
