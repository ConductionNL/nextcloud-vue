# Proposal: form-page-shows-server-findings

Decision 179 (Ruben, 10 October 2026): a form submits into its destination object and must be valid against that object's schema. OpenRegister's form destination check (openregister#4563) answers a refused submit with 422 and `findings[]`, each `{ field?, property, code, message }`. buildiq publishes forms for anonymous visitors with a honeypot field (buildiq change `forms-are-valid-against-their-destination`, task 3.1). Both need CnFormPage.

## What changes

1. **A refused submit names its fields.** When the answer carries `findings[]`, CnFormPage marks each finding on the field whose key is its `field`, or else its `property`, lists them in the error summary, opens the step holding the first, and focuses it. Findings on no field of the form stay in the general error. An answer without `findings` behaves as before.
2. **A honeypot for anonymous forms.** A new `honeypot` prop (a field name, default empty) renders a field out of sight, out of the tab order and hidden from assistive technology. When it is filled, submit sends nothing and shows the normal success.

Both are additive and backward compatible: a minor release.
