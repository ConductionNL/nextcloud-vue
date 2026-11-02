# Proposal: board-dq-card-rhythm-r46

## Why

After window 9d (r45, 53 of 74 dossiq boards matching) the remaining small residuals came from a handful of card
rhythms the board look did not set yet:

- DqContact and DqOrganisatie "Laatste contactmomenten": the ruled feed started under the first-line leading the
  card content takes off, so its first moment sat 22.8px under the title against 25.
- DqTaak "Wat deze taak tegenhoudt": the board draws one 14px paragraph 10px under the title; live drew two 15px
  blocks 10px apart, 34.8px taller, which moved Historie down.
- DqZaakContact: the reply box's label and hint were set at 1.5, the field 5.5px lower; the "Ontvangstbevestiging"
  footnote was 4.5px taller than drawn.
- DqSociaalDomein and DqZaaktype "Historie": the history footnote was 4.5px taller than drawn, which moved Status.
- DqZaakEmail "Notities": each note row was 70px against 60, because the list item kept a minimum height; the
  linked mail's sender line was cut to one line where the board wraps it.
- DqZaakTaken "Afspraken": the "Openen in Agenda" link was 21px against 17.

## What changes

- A ruled feed in a page card starts 12px under its title, as a ruled list does.
- A side card of running text alone sets its sentences at 14px on 1.5 with no gap between them, 10px under its
  title, so they read as one paragraph.
- The conversation reply box's head is set on the normal line, its label at 14px.
- A data card's and a history card's footnote, and the calendar card's foot link, are set on the normal line.
- A note row is as tall as its two lines; its meta line is 13px, 2px under the note; another author's initials
  are in the soft ink.
- A linked mail's sender line wraps on the case's E-mail card.

All rules are board-look only; Nextcloud's own look is unchanged.
