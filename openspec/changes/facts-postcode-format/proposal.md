# facts-postcode-format

## Why
The registers store a Dutch postcode without its space ("2999AA"), and the facts widget wrote it that way. People, and every board (DqContact "Woonadres", DqOrganisatie "KvK en adres", DqHandhaving), read "2999 AA".

## What changes
- A facts entry or part can say `format: "postcode"`: a Dutch postcode is written with its space and its letters in capitals; anything else is written as it is.
- The same function is the built-in table formatter `postcode`.
