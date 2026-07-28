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
	test('options show schema names, never "undefined", and a pick sets items.$ref', async ({ page }) => {
		await page.goto('/?sref=1')
		await expect(page.getByRole('heading', { name: 'New schema' })).toBeVisible()

		// Open the `cows` property's actions menu.
		await page.getByRole('button', { name: 'Actions' }).click()

		// Open the Schema reference dropdown (array-item variant).
		const field = page.getByLabel('Schema reference').first()
		await expect(field).toBeVisible()
		await field.click()

		// The options must read as the schema titles — exactly, so a stray "undefined"
		// (what the raw-availableSchemas binding rendered) fails this.
		const listbox = page.locator('.vs__dropdown-menu').first()
		await expect(listbox).toBeVisible()
		await expect(listbox.locator('.vs__dropdown-option')).toHaveText(['Cow', 'Stable'])

		// Pick "Cow" and confirm the property's items.$ref was actually set.
		await listbox.locator('.vs__dropdown-option', { hasText: 'Cow' }).first().click()

		// `element.__vue__` is a VUE 2 back-reference and does not exist in Vue 3 —
		// it returns undefined for every node, so this walk silently found
		// nothing and the assertions below failed on `null` rather than on the
		// component's real state. Vue 3's equivalent is `__vueParentComponent`
		// (the internal instance whose subtree owns the element); its `.proxy`
		// is the public instance that `__vue__` used to be.
		const cows = await page.evaluate(() => {
			let found = null
			document.querySelectorAll('*').forEach((e) => {
				const instance = e.__vueParentComponent
				const v = instance && instance.proxy
				if (v && v.schemaItem && v.schemaItem.properties && v.schemaItem.properties.cows) found = v.schemaItem.properties.cows
			})
			return found ? JSON.parse(JSON.stringify(found)) : null
		})
		// The pick set items.$ref (multiselect emits `input`, now wired) …
		expect(cows).toBeTruthy()
		expect(String(cows.items.$ref)).toContain('cow')
		// … and resolved the schema id off the chosen option.
		expect(cows.items.objectConfiguration.schema).toBe(100)
	})
})
