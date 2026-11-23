# A message's channel can carry its icon

## Why

DqZaakContact draws each message's channel as a chip with its icon (phone, envelope, globe) before the name. CnConversationWidget maps a stored channel to a label only, so live chips have no icon (r31 verdict: pills Telefoon, Mijn Zuiddrecht, E-mail "icon true>false").

## What changes

- CnConversationWidget `content.channelIcons`: stored channel value -> icon name. The message gets `channelIcon`.
- CnConversationThread draws a message's `channelIcon` (13px, decorative) before the channel name in its chip, 5px apart. Without it nothing changes.
