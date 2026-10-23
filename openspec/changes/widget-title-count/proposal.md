# Proposal: widget-title-count

## Why

DqMijnWerk titles the steps card with its total: "Mijn 14 zaken per stap". A dashboard card can show the total its
widget reports only as a chip after the title (`headerCount`), and the stacked bar reports no total at all.

## What changes

A dashboard widget title may hold `{count}`: the card fills it with the total its widget reports and draws no count chip
then. Until a total arrives the token reads as nothing ("Mijn zaken per stap"). The stacked bar reports its total
(`count`) when its content sets `headerCount: true`, as the record list does.

## Scope

CnDashboardPage (widget title), CnStackedBarWidget (`header` event). No schema change.
