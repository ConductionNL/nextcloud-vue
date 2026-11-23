# admin-shell-empty-tab-gap

## Why

On an admin settings page whose open tab has no panel of its own (the first tab, whose cards are the shell's default
slot below the strip), the strip kept the underline variant's 20px panel spacing and the page added its section gap
after it: the first card stood 40px under the strip. Board dossiq/DqInstellingenAlgemeen draws it 20px under the
strip, as every other tab does.

## What changes

- The shell marks its strip `cn-admin-settings-shell__tabs--bare` while the open tab has no `tab-<id>` slot, and a bare
  strip draws no panel spacing.
