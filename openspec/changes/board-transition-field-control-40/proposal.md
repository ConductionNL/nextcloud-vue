# A board dialog's transition field is the board's 40px control

## Why
DqVolgendeStap "Opschorten" draws its three fields (Reden, Dagen die de aanvrager krijgt, De zaak komt terug op) as 40px
controls. r33 dropped NcInputField's 2px wrapper padding and set the wrapper's height to `auto`; the input's
`height: 100%` then fell back to the 44px clickable area. r34 probe: the inputs are 44 high, the chosen card 280.6
against 274, and every option under it 8 to 11px low.

## What changes
`.cn-dialog-board .cn-transition-input-fields .input-field__main-wrapper` takes `height: var(--cn-field-height, 40px)`
instead of `auto`, still without the padding. Board look only. No schema change.
