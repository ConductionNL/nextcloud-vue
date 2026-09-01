// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Adding an enum value to a schema property by CLICKING THE ARROW.
//
// Reported live (twice): the "Add enum value" field's trailing arrow button did
// nothing. NcActionInput wraps the field + arrow in a <form> and emits `submit`
// for both Enter and an arrow click, but the enum input listened only for
// `@keydown.enter` — so the arrow, the affordance in the UI, was dead.
//
// This drives the REAL CnSchemaFormDialog in Chromium and clicks the actual arrow.
// A jsdom unit test can't: this repo's jest setup stubs @nextcloud/vue, so the
// NcActionInput <form>/submit wiring that this bug lives in isn't present there.

import { test, expect } from '@playwright/test'

/**
 * Type a value into the enum field and click its arrow until the chip appears.
 *
 * The value is set by dispatching a real `input` event on the element instead of
 * locator.fill(): fill works by focus + insertText, and NcDialog's focus trap can
 * steal focus back to the dialog's first field (Title) before the teleported
 * NcActions popover registers with the trap — the text then lands in Title, the
 * enum field stays empty, and the submit is a silent no-op (the observed CI
 * flake, persistent for the whole page once the trap is in that state). The
 * direct event drives the same NcInputField input handler without needing focus,
 * and the ARROW CLICK — the wiring this spec guards — stays real.
 * Retrying via toPass is safe: addEnumValue() has an enum.includes() duplicate
 * guard, so a repeated set+click is idempotent.
 * @param {import('@playwright/test').Page} page The test page.
 * @param {import('@playwright/test').Locator} enumField The "Add enum value" textbox.
 * @param {string} value The enum value to add.
 */
async function addEnumValue(page, enumField, value) {
	await expect(async () => {
		await enumField.evaluate((el, v) => {
			el.value = v
			el.dispatchEvent(new Event('input', { bubbles: true }))
		}, value)
		await enumField.locator('xpath=ancestor::form').getByRole('button', { name: 'Submit' }).click()
		await expect(page.getByText(value, { exact: true })).toBeVisible({ timeout: 2000 })
	}).toPass({ timeout: 15000 })
}

test.describe('CnSchemaFormDialog — add an enum value via the arrow', () => {
	test('typing a value and clicking the arrow adds it to the property enum', async ({ page }) => {
		await page.goto('/?spa=1')
		await expect(page.getByRole('heading', { name: 'New schema' })).toBeVisible()

		// Open the `size` property's actions menu (the "…" toggle, aria-label "Actions").
		await page.getByRole('button', { name: 'Actions' }).click()

		const enumField = page.getByLabel('Add enum value')
		await expect(enumField).toBeVisible()

		// Click the ARROW — the trailing submit button of THIS field's form. Not Enter.
		// Against the pre-fix template (which listened only for keydown.enter) the
		// arrow click does nothing, the chip never appears, and the retry times out.
		await addEnumValue(page, enumField, 'small')

		// The value is now a current enum value.
		await expect(page.getByText('Current enum values', { exact: false })).toBeVisible()
		await expect(page.getByText('small', { exact: true })).toBeVisible()
	})

	test('the field clears after a successful add (ready for the next value)', async ({ page }) => {
		await page.goto('/?spa=1')
		await expect(page.getByRole('heading', { name: 'New schema' })).toBeVisible()
		await page.getByRole('button', { name: 'Actions' }).click()

		const enumField = page.getByLabel('Add enum value')
		await expect(enumField).toBeVisible()

		await addEnumValue(page, enumField, 'medium')

		await expect(page.getByText('medium', { exact: true })).toBeVisible()
		await expect(enumField).toHaveValue('')
	})
})
