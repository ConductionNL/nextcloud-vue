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

test.describe('CnSchemaFormDialog — add an enum value via the arrow', () => {
	test('typing a value and clicking the arrow adds it to the property enum', async ({ page }) => {
		await page.goto('/?spa=1')
		await expect(page.getByRole('heading', { name: 'New schema' })).toBeVisible()

		// Open the `size` property's actions menu (the "…" toggle, aria-label "Actions").
		await page.getByRole('button', { name: 'Actions' }).click()

		const enumField = page.getByLabel('Add enum value')
		await expect(enumField).toBeVisible()
		await enumField.fill('small')

		// Click the ARROW — the trailing submit button of THIS field's form. Not Enter.
		const arrow = enumField.locator('xpath=ancestor::form').getByRole('button', { name: 'Submit' })
		await arrow.click()

		// The value is now a current enum value. Against the pre-fix template (which
		// listened only for keydown.enter) the arrow click did nothing and this fails.
		await expect(page.getByText('Current enum values', { exact: false })).toBeVisible()
		await expect(page.getByText('small', { exact: true })).toBeVisible()
	})

	test('the field clears after a successful add (ready for the next value)', async ({ page }) => {
		await page.goto('/?spa=1')
		await page.getByRole('button', { name: 'Actions' }).click()

		const enumField = page.getByLabel('Add enum value')
		await enumField.fill('medium')
		await enumField.locator('xpath=ancestor::form').getByRole('button', { name: 'Submit' }).click()

		await expect(page.getByText('medium', { exact: true })).toBeVisible()
		await expect(enumField).toHaveValue('')
	})
})
