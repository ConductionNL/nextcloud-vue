// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec CnDashboardPage's date-range chip shows its dates and edits them.
//
// WHY THIS EXISTS IN e2e AND NOT IN THE JEST SUITE.
//
// The From/To fields rendered EMPTY in every mode. NcActionInput's date types
// are backed by a picker whose model is typed `Date` and whose formatter
// returns "" for anything that is not a Date instance — and CnDashboardPage
// passed a preformatted "YYYY-MM-DDTHH:mm" STRING. The jest suite stubs
// NcActionInput, so the stub happily accepts a string and reports it back:
// the tests could assert which value we PASS, never what the real picker DOES
// with it. That is the exact shape of bug a stub cannot see.
//
// The chip's open state has the same property — the active affordance is a
// computed background on the pill, and jsdom computes no styles.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/?chip=1')
	await expect(page.locator('[data-testid="chip-widget-body"]')).toBeVisible({ timeout: 15_000 })
})

const chipTrigger = '[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle'

test('the chip renders the active preset label', async ({ page }) => {
	const chip = page.locator('.cn-dashboard-page__date-chip').first()
	await expect(chip).toBeVisible()
	// The manifest's default preset is `month`, labelled "Current month".
	await expect(chip).toHaveText(/Current month/i)
})

test('the From/To fields show the ACTIVE RANGE, not blanks and not a fixed date', async ({ page }) => {
	await page.locator(chipTrigger).first().click()

	const values = await page.evaluate(() => [...document.querySelectorAll('input')]
		.filter((i) => i.closest('.action-input, .v-popper__inner'))
		.map((i) => i.value))

	expect(values.length, 'the popover must render two date inputs').toBe(2)

	// Asserting "non-empty" is not enough: the picker in use PARSES a string,
	// so a wrong-but-parseable value looks identical to a correct one. Pin the
	// actual window instead — the default preset is `month`, so From must be
	// the 1st of the CURRENT month. That fails on a blank, on a fixed date, and
	// on a rolling last-30-days window alike.
	const from = new Date(values[0])
	const to = new Date(values[1])
	expect(Number.isNaN(from.getTime()), `From unparseable: ${values[0]}`).toBe(false)
	expect(Number.isNaN(to.getTime()), `To unparseable: ${values[1]}`).toBe(false)

	const now = new Date()
	expect(from.getDate(), 'From must be the 1st of the current month').toBe(1)
	expect(from.getMonth()).toBe(now.getMonth())
	expect(from.getFullYear()).toBe(now.getFullYear())
	expect(to.getMonth()).toBe(now.getMonth())
	expect(to.getTime()).toBeGreaterThan(from.getTime())
})

test('the open chip is styled by the pill itself, not a box behind it', async ({ page }) => {
	const trigger = page.locator(chipTrigger).first()
	await trigger.click()

	const box = await page.evaluate((sel) => {
		const t = document.querySelector(sel)
		const pill = t.querySelector('.cn-dashboard-page__date-chip')
		const tcs = getComputedStyle(t)
		return {
			toggleBg: tcs.backgroundColor,
			toggleBorder: tcs.borderTopWidth,
			pillRadius: getComputedStyle(pill).borderTopLeftRadius,
			expanded: t.getAttribute('aria-expanded'),
		}
	}, chipTrigger)

	expect(box.expanded).toBe('true')
	// The regression: NcButton painting its own rounded-square background
	// behind a fully-rounded pill. Transparent toggle, pill keeps its radius.
	expect(box.toggleBg).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
	expect(box.toggleBorder).toBe('0px')
	expect(box.pillRadius).toBe('999px')
})
