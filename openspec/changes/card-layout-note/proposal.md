# Proposal: card-layout-note

## Why

The "Aan mij toegewezen" board (DqAanMijToegewezen) draws a case the reader covers for an absent colleague with a line
of its own under the meta line: "Voor Anouk Bakker, tot 10 okt", 13px, semibold, in the purple pill ink. The card record
layout has a meta line (muted, joined with middle dots), a description (muted) and pills, so the cover line either
joins the meta line ("Woo-verzoek · Stichting Kindzorg · Voor Anouk Bakker, tot 10 okt") or reads as muted text.

## What changes

`cardLayout.note`: one part, `{ field, formatter?, formatterOptions?, tone? }`, read as a meta part reads through its
own formatter, drawn as a line under the meta line and left out while it is empty. `tone` (`purple`, `teal`) inks it in
that pill tone's text colour; without a tone it takes the soft text colour. 13px, weight 600.

Schema: `cardLayout.note` (the saved-view override `cardLayout` is the same object). Version 2.151.0, renumber in the
batch.
