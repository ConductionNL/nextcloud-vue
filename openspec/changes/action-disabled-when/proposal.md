# An action can be disabled with the reason why

## Why
shillinq's Send payment link must stay visible but disabled, saying why, while the payment adapter is dormant, on the
Payment requests page and on the case panel (`receivables-payment-links` task 3.3). A manifest action could only be
hidden (`visibleWhen`) or statically disabled.

## What changes
`disabledWhen` (the `visibleWhen` shape) and `disabledReason` on an action. CnActionButtons (detail headers, panels)
and CnIndexPage header actions evaluate the condition and draw the action disabled with the reason as tooltip or menu
line; a disabled action does not run. Manifest schema 2.184.0 adds both keys to `$defs/actionFields`.
