# The parties widget's board rows as design-system #811 draws them

## Why
DqZaakBetrokkenen "Rollen" was redrawn in design-system #811. Its rows read "Primaire partij · verzoeker · Schrijftaal: Nederlands. Geen voorkeur vastgelegd." with the pill "Geen geheimhouding", "Gemachtigde namens Aannemersbedrijf Van Wijk B.V. · Awb 2:1 · …" and "Melder zonder account · via de balie · …" with "Indicator: meerdere meldingen" in the info tone. Live drew a kind word on every meta line ("Person", "Organisation", "Colleague"), "Vertegenwoordigd door: …" beside a note that already says it, no secrecy pill (dossiq declares `secrecy`, the widget never read it), and the indicator as a grey pill.

## What changes
In the board look:
- The meta line joins the primary mark, the role (in lower case after the primary mark, unless it is an abbreviation), the link's `note`, whom the party represents only when there is no note, the extra lines, e-mail and documents. No kind word.
- `content.secrecy` (`{ indicator, kinds, primaryOnly? }`): a party of a listed kind whose record carries no indicator with that key shows the pill `labels.noSecrecy` ("No secrecy"); with `primaryOnly`, only the primary party does. Both looks.
- An indicator pill takes the info tone, or the error tone for a blocking verdict, and its words from `labels.indicatorPill` (`{label}`, default the label alone).
The Nextcloud look keeps its rows, kind word included.
