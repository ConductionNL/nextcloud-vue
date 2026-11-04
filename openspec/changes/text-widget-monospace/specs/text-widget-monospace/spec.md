# text-widget-monospace Delta: text-widget-monospace

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [text-widget-monospace](../../)

## Purpose

A user reads plain text whose spaces carry meaning, such as a receipt, exactly as it was written.

## ADDED Requirements

### Requirement: A text widget can show its text as typed

With `content.monospace: true`, `CnTextWidget` SHALL show the text in a fixed-width font and keep its spaces and line breaks. It SHALL NOT parse the text
as HTML or markdown, whatever `contentMode` says. An empty text SHALL show the placeholder. Without `monospace` the widget SHALL parse the text as before.

#### Scenario: Board PqKassabon, a receipt

- **GIVEN** `monospace` and a text whose second line is `<b>Total</b>      2,00`
- **THEN** the widget shows that line with its six spaces and the `<b>` as text

#### Scenario: Markdown mode is ignored

- **GIVEN** `monospace` and `contentMode` `markdown` with the text `**not bold**`
- **THEN** the widget shows `**not bold**` and no bold text

### Requirement: A text widget can read its text from the detail object

With `content.textField`, the widget SHALL read the text from that field of `objectData`, without translation. An empty or missing field SHALL show the placeholder.

#### Scenario: Board PqKassabon, the receipt on the record

- **GIVEN** `textField` `receiptText` and an object whose `receiptText` holds the receipt
- **THEN** the widget shows that receipt
