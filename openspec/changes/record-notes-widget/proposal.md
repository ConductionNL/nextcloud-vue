# Record notes widget

## Why

Board PqContactmoment draws the conversation notes as a text area that saves as you type ("Laatst opgeslagen 09:19"), with an outcome select and "Uitkomst noteren". The library had no widget that edits a field of the record in view in place; pipelinq's ContactmomentQuickLog only creates.

## What changes

- New widget type `record-notes` (CnRecordNotesWidget): a text field of the record, PATCHed a moment after the last keystroke, with a status line, and an optional outcome select saved with its own button.
