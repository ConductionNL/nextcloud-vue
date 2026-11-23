# Proposal: transfer-card

## Why

Board DqInspectie draws "Dag synchroniseren": "32 MB van 48 MB gedownload", "nog ca. 6 minuten", a row per part, and resuming after a
dropped connection. `CnOfflineQueue` lists the work a device still has to send and settles conflicts, and `CnBulkJobProgress`
reports items of a server job with outcomes per row. Neither shows an amount of data moving onto a device.

## What changes

- New `CnTransferCard`: an amount with a bar, the time left, a row per part, and a Resume button while paused.
- The host owns the transfer, and the card holds no state.

Covers gap 25 of the dossiq component-gap audit (decision 281). The conflict choice on the same board needs no change: `CnOfflineQueue`
shows both texts and offers `client_wins`, `server_wins` and `manual_merge`.
