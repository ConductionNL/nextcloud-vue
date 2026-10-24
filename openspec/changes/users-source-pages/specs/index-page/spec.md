# index-page Delta: users-source-pages

## ADDED Requirements

### Requirement: The users source pages, searches and sorts its members

The `users` index source SHALL declare `pages: true`, `searchParam: "search"` and a `sortParam` giving `sortKey` / `sortOrder`. It SHALL read a group's members once and answer a load for the same group with another page, term or order from them without a request. The search SHALL match the name, function, roles and e-mail; `total` SHALL count the members that match.

#### Scenario: A department of three, two per page
- GIVEN the group Vergunningen with three members
- WHEN the page loads with limit 2, offset 0, then offset 2
- THEN the first page lists two members, the second one, and the total is 3, with one read of the group
