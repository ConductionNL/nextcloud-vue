# Proposal: countdown-term-states

## Why

Board DqZaakTermijn draws the term card of a case in five states: on track, two weeks left, one week left, passed and
already extended. Each state has its own notice under the date, the passed state reads "Termijn verlopen" with the days
past, and the card carries two buttons, "Verdagen" and "Termijn opschorten". "Verdagen" is greyed out once the term has
passed or was extended, because a term can be extended once. CnCountdownWidget drew one button and no notice, and read
every state with the same texts.

## What changes

- CnCountdownWidget takes `states` in its content: per state a headline, a caption and a notice.
- `extendedField` names the property that marks an extended term.
- `actions` puts several buttons under the card; `disabledIn` greys a button out in the states it names.
- Without the new keys nothing changes. `action` keeps working as the one button.

Covers gap 5 of the dossiq component-gap audit (decision 281), the card side. The list "Termijnen op deze zaak" and the
"Termijn verdagen" dialog stay on CnRecordListWidget and CnActionDialog.
