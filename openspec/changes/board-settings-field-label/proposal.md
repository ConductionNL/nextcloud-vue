# Proposal: board-settings-field-label

## Why

COMPDIFF r23, DqInstellingenAlgemeen "Huisstijl" and "Teksten en toegang": the first field label sat 18.1px under the
card title against 14px drawn, and at weight 700 against 600. The label had a 20px line box 4px above the control,
under a 26px margin. The theme sets every label's weight and ink with `!important` through its form-field tokens, so the
board look's 600 never won.

## What changes

In the board look, in a settings card:

- the field label sits at its normal line height, 6px above the control, the control 22px below the field's top, so the
  label's text starts 14px under the title;
- the card hands the theme the label's weight (600) and ink through `--nldesign-component-form-field-label-*`;
- a one-field form's inline save keeps lining up with the control (`--cn-settings-fields-label-offset` follows).

The Nextcloud look is unchanged.
