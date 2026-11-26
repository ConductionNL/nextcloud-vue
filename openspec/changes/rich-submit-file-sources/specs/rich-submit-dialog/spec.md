# Delta for rich-submit-dialog

## ADDED Requirements

### Requirement: The submit dialog takes files from another source
`CnRichSubmitDialog` MUST render a `file-sources` slot under its file input with an `addFiles(files)` slot prop. `addFiles` MUST apply the same max-files and max-size checks as the file input over the files already chosen plus the given ones, MUST replace the file in a single-file dialog, and MUST return `false` and show the reason in the dialog's banner when it refuses them.

#### Scenario: A learner hands in a file from her Nextcloud files
- GIVEN a submit dialog with `maxFiles: 2` whose consumer puts "Choose from my files" in `file-sources`
- WHEN the learner picks `verslag.pdf` there and the consumer calls `addFiles` with it
- THEN the dialog lists `verslag.pdf` among the files it submits

#### Scenario: Too many files
- GIVEN the dialog already holds two files
- WHEN the consumer adds a third
- THEN `addFiles` returns `false`, the banner says at most 2 files are allowed, and the two files stay
