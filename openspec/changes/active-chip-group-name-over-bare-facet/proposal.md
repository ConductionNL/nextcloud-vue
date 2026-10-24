# Proposal: active-chip-group-name-over-bare-facet

## Why

On :8080 (24 Oct) the team queue's Active line read "Team: zuiddrecht-vergunningen" where the group's display name is
"Vergunningen" (board DqTeamwachtrij: "Team: Woo en informatie"). OpenRegister's terms facet labels a group bucket with
its id (`{key: "zuiddrecht-vergunningen", label: "zuiddrecht-vergunningen"}`), and the chip took a facet label before
it looked the group up.

## What changes

A facet bucket whose label only repeats the value no longer names the chip; the group display name, an option title or
a declared enum label below it does. A facet label that differs from the value still wins. No schema change.
