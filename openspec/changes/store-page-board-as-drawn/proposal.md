# Proposal: store-page-board-as-drawn

## Why

The pl3 measurement of board PqStore found 38 differences on the store page after store-page-board-shell landed:
- the state pill sat beside the title, so long titles wrapped, and an item that is not installed had no pill;
- the pills fell back to grey because the theme sets no `--color-success-light` or `--color-warning-light`;
- Install and Update were outlined buttons where the board draws soft pills;
- the first lens read "Alles" and the search "Zoek in de winkel", where the board reads "Alle" and "Zoek in de store";
- the search was an NcTextField with a floating label, not a field with a placeholder and a magnifier;
- the header sat 4px high, with the line under the title 9.6px below it and Publish 34px tall;
- the side column was 256px wide and 16px from the cards, and its rows used a 1.5 line.

## What changes

Under the board look only:
- every catalogue card has a state pill under its kind line: Installed, Update, or Available, in the board tag tones;
- Install and Update are soft pill buttons, and Open stays outlined;
- the first lens uses its own key ("All items", nl "Alle"), so the shared "All" stays as it is; "Search the store" reads "Zoek in de store";
- the search is a 40px field with the magnifier and a placeholder;
- the header follows the index page header (title at 96, the line 13px under it, 40px buttons);
- the lens chips are 36px high and 8px apart, the side column is 260px wide and 20px from the cards, and its rows and pills use a normal line.

The Nextcloud look is unchanged.
