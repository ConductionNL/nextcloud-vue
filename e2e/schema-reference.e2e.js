// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The "Schema reference" dropdown on a related-schema property.
//
// Reported live: creating a "barn" schema with a "cows" property (array of
// related-schema) showed "undefined / undefined" in the Schema reference dropdown,
// and picking one didn't stick. Two coupled bugs:
//   1. :options bound the raw availableSchemas (keyed title/slug, no `label`) — and
//      NcSelect renders `option.label`, so every option read "undefined".
//   2. The select is a `type="multiselect"` NcActionInput, which emits `input`, not
//      `update:value`; the handler was on `@update:value`, so a selection never set
//      the property's items.$ref.
//
// Drives the REAL CnSchemaFormDialog in Chromium — the jest setup stubs
// @nextcloud/vue, so the NcSelect option rendering these bugs live in isn't present.

import { test, expect } from '@playwright/test'

test.describe('CnSchemaFormDialog — Schema reference dropdown', () => {
	// ⚠️ SCOPE NOTE — read before adding assertions here.
	//
	// This spec covers that the Schema reference picker is REACHABLE: the
	// dialog renders, the property's actions menu opens, and the field is
	// there. It deliberately does not assert the option LABELS.
	//
	// The field is an `NcActionInput type="multiselect"` nested inside an
	// `NcActions` popover, and opening its vue-select menu from a spec has not
	// proved reproducible — `getByLabel` resolves to the inner `vs__search`
	// input, clicking which opens nothing, and clicking the toggle worked once
	// and then did not. A test that opens the menu only sometimes is worse than
	// one that does not try: it fails for reasons unrelated to the code.
	//
	// The thing that actually broke — options rendering "undefined" instead of
	// a schema title, from a consumer passing title/slug with no `label` — is
	// decided entirely by `schemaRefOptions`, which takes a shape and returns a
	// shape. That is pinned deterministically in
	// `tests/components/CnSchemaPropertyActionsOptions.spec.js`, including the
	// exact Buildiq-shaped input that produced it.
	//
	// So: labels are guarded there, reachability is guarded here. Neither is
	// redundant — this one fails when the picker disappears, that one when the
	// labels regress.

	test('the schema reference picker is reachable from a property', async ({ page }) => {
		await page.goto('/?sref=1')
		await expect(page.getByRole('heading', { name: 'New schema' })).toBeVisible()

		// Open the `cows` property's actions menu.
		await page.getByRole('button', { name: 'Actions' }).click()

		// The field exists, for an ARRAY property — the array-item variant is a
		// different field from the plain object one, and only this property is
		// an array.
		await expect(page.getByText('Schema reference').first()).toBeVisible()
	})
})
