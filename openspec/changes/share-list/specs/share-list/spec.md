# share-list Delta: share-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [share-list](../../)

## Purpose

One card lists what a record shares outside the organisation and lets a person copy or revoke each link.

## ADDED Requirements

### Requirement: A card lists the shares of a record

The `share-list` widget SHALL read `content.url` (`{objectId}` filled) and SHALL draw one row per share: a kind icon (case, file, mail, folder), the title, a meta line, a status pill labelled through `statusLabels`, and a Copy link button for a share with a link. Copying SHALL announce "Link copied" in a polite live region. A failed read SHALL be said, not drawn as an empty list.

#### Scenario: The board's share

- **GIVEN** a share `{ kind: "case", title: "Zaak 2026-0110, lezen en reageren", status: "active", url: "https://cloud.zuiddrecht.nl/s/7Qk2pWx9Lm" }`
- **THEN** the row shows the case icon, the title, the pill "Actief", and the buttons "Link kopiëren" and "Intrekken"

### Requirement: Revoking a share says a refusal in the card

Revoke SHALL be offered for a share that is not revoked and whose `revocable` field is not false, and only with `content.revoke.url`. It SHALL run as an `api-call` (`{field}` placeholders from the row, method default `DELETE`) through the page dispatcher with `noticeInline: 'error'`, so a refusal shows in the card in the server's words and the row stays; a revoke that lands SHALL read the list again.
