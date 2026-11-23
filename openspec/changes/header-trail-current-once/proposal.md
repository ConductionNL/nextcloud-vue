# Proposal: header-trail-current-once

## Why

DqPostvak draws its header line as "Postvak · berichten van de hele organisatie die nog bij geen zaak horen": the page
as the one crumb, then the meta note. A page could only get that row by declaring a crumb, and the trail then appended
the title again ("Postvak / Postvak").

## What changes

A last declared crumb whose label is the page title is dropped; the title follows once as the current crumb.
