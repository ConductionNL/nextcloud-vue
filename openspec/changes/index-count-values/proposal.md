# Proposal: index-count-values

## Why

Board PqLeads reads "15 van 15 open leads · € 509.928 in de pijplijn, € 246.122 gewogen · winkans eerst": the count line
names the list's sum and a weighted sum. The count line could only say `{shown}` and `{total}`.

## What changes

CnIndexPage `countValues` (manifest `config.countValues`): named values the count line writes as template tokens with a
format (`{pipeline|currency:EUR}`). An entry is a sum or count over the page's register and schema under the active
filters (`{ metric, field, filter? }`), or a field of an app endpoint (`{ endpoint, path }`). A value not read yet leaves
its token empty; a token that names no value stays as written.
