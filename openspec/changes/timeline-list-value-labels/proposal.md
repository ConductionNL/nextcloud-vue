# Proposal: timeline-list-value-labels

## Why

Board PqAfspraak words a booking's status history "Status: Bevestigd". The timeline's `lists` label an entry by its
`labelField` value, so the history printed the stored value "confirmed".

## What changes

- A `lists` entry takes `valueLabels` (`{ <stored value>: <label> }`). A value it names reads as that label, translated
  like every timeline label. A value it does not name shows as stored.

Without the key nothing changes. No schema change.
