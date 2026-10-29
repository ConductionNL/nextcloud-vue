# Proposal: facts-title-size-and-update-right

## Why

pipelinq's openspec request-term-and-case-link (board PqTicket) needs two things from the facts card. The Termijn card draws the term as a 26px figure, while a facts title row has one size. Its "Termijn instellen" and the Gekoppelde zaak card's "Bestaande zaak koppelen" patch the ticket, so a user who may only read it should not see them. Facts actions could only be hidden by a field condition or for non-admins.

## What changes

- A facts `title` entry takes `size` (px).
- An action in `actions` or `emptyActions` takes `requires: "update"`: it is drawn only when OpenRegister's caller scope on the page's register and schema includes update. While the scope cannot be read it is drawn, and OpenRegister refuses the write.

## Not changed

- The actions themselves (`open-form`, `api-call` and the rest) and how they run.
- Authorisation stays on the server; this is visibility.
