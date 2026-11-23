# Proposal: board-dialog-header-body-gap

## Why

Nine of the thirteen dialog boards (DqBerichtVersturen, DqOverdragen, DqNieuweZaak, DqBesluit, DqArchiveren,
DqDocumentGenereren, DqFilterBewerken, DqFilterDelen, DqFilterVerwijderen, DqVolgendeStap) start the body 22px under the
header's subtitle (header padding-bottom 4px, form padding-top 18px). Live starts it 16px under: the body's 18px gap with
the header's -2px margin. compdiff read it as gapBelowTitle 68 vs 64 (DqBerichtVersturen) and 47 vs 44 (DqOverdragen).

## What changes

The board dialog's header takes margin-bottom 4px instead of -2px: 18px gap + 4px = 22px. Checked on :8080 with the rule
injected: subtitle bottom 200, first label 222.

The four boards that draw 20px (DqInstellen, DqZaakLocatie, DqZaakSamenwerken: 8px + 12px) or 16px (DqUwWachtrij:
4px + 12px) are against the majority; they are listed for a board amendment.
