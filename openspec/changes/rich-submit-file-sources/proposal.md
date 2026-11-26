# Proposal: rich-submit-file-sources

## Why
`CnRichSubmitDialog` takes attachments only from the device's file input. learniq's capability row `asg-hand-in-a-file` says "A learner hands in a file from their own Nextcloud files" (change `capability-rows-say-what-they-do` 2.5), and the dialog has no place for a second source.

## What changes
- A scoped slot `file-sources` under the file input, with `{ addFiles }`. The consumer places its own picker there (for example the Nextcloud file picker) and hands the files it fetched to `addFiles(files)`.
- `addFiles` applies the same max-files and max-size checks as the input, over the files already chosen plus the new ones; a single-file dialog replaces its file. It returns `false` and shows the banner when it refuses.

## Out of scope
A built-in Nextcloud file picker (the consumer knows where the files live and how to read them).
