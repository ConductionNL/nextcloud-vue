# board-history-controls-and-footer

## Why

r44 DqZaakHistorie: "Notitie toevoegen" stands 23.2px lower than drawn because the history card is 23px taller. Between the kind chips and the first entry live puts 74px (12 under the chips, NcSelect's own 6px above and 4px under the select, 12 under the controls) where the board draws 60 (8, the select, 12). The footer starts 12px under the last entry where the board draws 16, and is a 36px row (a 34px audit trail button, a checkbox with a 3px top margin) where the board draws one 20px line with the audit trail as a link.

## What changes

In the board look only (look-board-detail.css): the chips take 8px under them, the controls' select drops NcSelect's margin, the footer starts 16px under the list, the footer checkbox box drops its top margin and the audit trail button is 20px tall without padding. The Nextcloud look is untouched.
