# Tasks: facts-currency-format

### Task 1: The currency format in the facts widget
- **spec_ref**: `openspec/changes/facts-currency-format/specs/facts-widget/spec.md#requirement-a-facts-entry-can-show-a-money-amount`
- **files**: `src/components/CnFactsWidget/CnFactsWidget.vue`
- [x] Implement: `format: "currency"` through `formatMoney`, with `currency`, `currencyField`, `decimals` and the app's reporting currency
- [x] Test: `tests/components/CnFactsWidgetCurrency.spec.js`; e2e `e2e/l14-facts-currency.e2e.js`
