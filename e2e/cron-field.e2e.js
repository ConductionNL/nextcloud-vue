// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// CnCronField — the schedule builder.
//
// The thing worth testing in a browser is that the three views are ONE value:
// the preset picker, the part pickers, and the expression. Picking a preset has
// to rewrite the expression, and typing an expression has to re-select the
// preset it matches. A unit test can check either direction against a stub; only
// a real render proves they stay in step through actual NcSelect interaction.

import { test, expect } from '@playwright/test'

const CRON = '/?cron=1'

// The PRESET picker's chosen label.
//
// Not `getByRole('combobox')`: NcSelect gives that role to its inner search
// <input>, whose value stays empty while the chosen label renders in a sibling
// `.vs__selected`. Asserting on the combobox reads "" for every selection and
// fails identically whether the component works or not.
const PRESET_LABEL = '.cn-cron-field > .v-select .vs__selected'

/**
 * Choose an option from an NcSelect by its visible label.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} label The select's input label.
 * @param {string} option The option text.
 * @return {Promise<void>}
 */
async function pick(page, label, option) {
	await page.getByRole('combobox', { name: label }).click()
	await page.getByRole('option', { name: option, exact: true }).click()
}

test.describe('cron field', () => {
	test('starts on the preset its expression matches, not on Custom', async ({ page }) => {
		await page.goto(CRON)

		// `0 9 * * 1` IS a weekly schedule. Falling back to Custom would be the
		// easy implementation and would tell every author their perfectly
		// ordinary schedule is an exotic one.
		await expect(page.locator('[data-testid="cron-value"]')).toHaveText('0 9 * * 1')
		await expect(page.locator(PRESET_LABEL)).toHaveText('Every week')
	})

	test('describes the schedule in words', async ({ page }) => {
		await page.goto(CRON)

		// The whole point: `0 9 * * 1` is exact and unreadable.
		await expect(page.locator('[data-testid="cron-box"]')).toContainText('Monday')
		await expect(page.locator('[data-testid="cron-box"]')).toContainText('09:00')
	})

	test('picking a preset rewrites the expression', async ({ page }) => {
		await page.goto(CRON)

		await pick(page, 'Runs', 'Every day')

		// The time is CARRIED, not reset. Someone who set 09:00 and then
		// switched from weekly to daily meant "daily, at the time I picked".
		await expect(page.locator('[data-testid="cron-value"]')).toHaveText('0 9 * * *')
	})

	test('changing a part rewrites only that field', async ({ page }) => {
		await page.goto(CRON)

		await pick(page, 'Hour', '17:00')

		await expect(page.locator('[data-testid="cron-value"]')).toHaveText('0 17 * * 1')
	})

	test('typing an expression re-selects the preset it matches', async ({ page }) => {
		await page.goto(CRON)

		const field = page.getByRole('textbox', { name: 'Cron expression' })
		await field.fill('30 * * * *')

		await expect(page.locator(PRESET_LABEL)).toHaveText('Every hour')
	})

	test('an expression no preset names selects Custom, and is kept', async ({ page }) => {
		await page.goto(CRON)

		const field = page.getByRole('textbox', { name: 'Cron expression' })
		await field.fill('0 9 * * 1-5')

		// Custom is not a failure state — it is every schedule the presets
		// cannot name, and the expression must survive landing there.
		await expect(page.locator(PRESET_LABEL)).toContainText('Custom')
		await expect(page.locator('[data-testid="cron-value"]')).toHaveText('0 9 * * 1-5')
	})

	test('an invalid expression is kept and explained, not swallowed', async ({ page }) => {
		await page.goto(CRON)

		const field = page.getByRole('textbox', { name: 'Cron expression' })
		await field.fill('60 * * * *')

		// Rejecting the keystroke would make the field impossible to type in:
		// almost every prefix of a valid expression is itself invalid. So the
		// value stands and the error explains it.
		await expect(page.locator('[data-testid="cron-value"]')).toHaveText('60 * * * *')
		await expect(page.locator('[data-testid="cron-box"]')).toContainText('Not a valid cron expression')
	})

	test('the part pickers disappear in Custom, where they cannot describe it', async ({ page }) => {
		await page.goto(CRON)
		await expect(page.getByRole('combobox', { name: 'Hour' })).toBeVisible()

		await pick(page, 'Runs', 'Custom…')

		// A greyed-out Hour on an expression it cannot represent invites the
		// user to wonder what it would do.
		await expect(page.getByRole('combobox', { name: 'Hour' })).toHaveCount(0)
	})
})
