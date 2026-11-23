# Design: screens-store-page-translations

- A kind's label: the app's own translation of the kind id when its catalogue has one, else the library's label for
  the five kinds of the default vocabulary, else the id as written (an app kind nobody named).
- The same label is used on the chips, in the card's kind line and on the plain card.
- A card's `typeName` from the engine still wins over the kind label.
