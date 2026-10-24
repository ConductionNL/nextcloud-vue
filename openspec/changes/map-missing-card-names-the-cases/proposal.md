# Proposal: map-missing-card-names-the-cases

## Why

Board DqZakenKaart's card under the map list reads "3 zaken zonder adres", then "Bezwaar parkeerboete Havenstraat,
Aanbesteding jeugdzorg 2026 en Rapport luchtkwaliteit 2025 hebben geen locatie, dus staan ze niet op de kaart.", then the
link to the table. Live (24 Oct) drew the count and the link only.

## What changes

CnIndexPage's missing-address card names the rows without a place by the map list's title template (through the app's
formatters), three at most with the rest counted ("A, B, C en 2 andere ..."), singular for one. No sentence without a
title template. 14px main ink, line height 1.45. New l10n plurals (en, nl). No schema change.
