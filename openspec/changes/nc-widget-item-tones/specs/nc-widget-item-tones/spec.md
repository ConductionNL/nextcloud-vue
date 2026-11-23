# nc-widget-item-tones Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A Nextcloud widget item can take a tone from its app or type

With `content.itemTones`, an item whose type, object type or app (its own, or from an `/apps/<app>/` part of its link
or icons) is a key SHALL carry `cn-nc-widget-widget__item--tone-<tone>`, and in the board look its dot SHALL take the
tone's colour. An item that matches no key SHALL keep the primary dot.

#### Scenario: DqMijnWerk Recente activiteit

- **GIVEN** `itemTones: { "comments": "info", "files": "success", "dossiq": "neutral" }`
- **THEN** a comment's dot is blue, a file's green and a case handover's grey
