# Proposal: board-contact-identity-and-feed-rhythm

## Why

The redrawn DqContact board (design-system #960) sets three side cards and the contact-moment feed tighter than live:

- "Identiteit" opens on a lead and then lists rows (BSN with its Tonen button, Geheimhouding, Bron). The board keeps
  10px under the title and between the parts, as a rows card does; live took the 12px of a lead card that opens on a
  link (DqZaak "Aanvrager"), and Nextcloud's 3px button margin above and below Tonen. Live was 280px tall against 270.
- "Bereikbaar via" draws its "Contact vastleggen" action 34px tall with no margin; live drew it 32px with Nextcloud's
  3px button margin above and below, so the card was 4px taller.
- "Woonadres" draws its "Zaken op de kaart" link 8px under the address; live kept the facts widget's 10px and the
  first line's leading above an icon link, 4.8px more, which moved "Historie" down.
- "Laatste contactmomenten" draws each moment's meta line and text on the normal line, 3px apart, and the rows 4px
  apart. Live set both lines at 1.5, so each row was 69px against 65.

The same cards and feed are on PqKlant; DqOrganisatie draws the same feed.

## What changes

- A side facts card that opens on a lead and holds rows keeps 10px under the title and between its parts.
- An inline row (a value with its button) keeps 10px to the next row, and its button takes no vertical margin.
- A side card that opens on a text followed by its link keeps 8px to it, the link without leading above. A card
  that opens on a lead (DqOrganisatie "KvK en adres") keeps the lead card's 12px.
- A side facts card's action is 34px tall with no vertical margin.
- A feed's meta line and text are set on the normal line, 3px apart, and its rows are 4px apart.

All rules are board-look only; Nextcloud's own look is unchanged.
