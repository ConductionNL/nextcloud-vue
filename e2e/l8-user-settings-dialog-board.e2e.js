// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The user settings dialog as board DqPersoonlijkeInstellingen draws it: the
// close button in the dialog's top-right corner, the navigation entries in the
// main text colour under a theme that paints every link in its link colour,
// and a select's label above the control.
//
// WHY PLAYWRIGHT: corner placement, the ink a theme's `!important` link rule
// leaves and the label's box are layout and cascade, which jsdom does not do.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the dialog closes from its corner, its entries read in the main text colour and the select label stands above the control', async ({ page }) => {
	await page.route('**/apps/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
	await page.goto('/?l8=user-settings-dialog-board', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const close = page.locator('[data-testid="cn-user-settings-close"]')
	await expect(close).toBeVisible({ timeout: 60_000 })

	const frame = await page.locator('[data-testid="cn-user-settings-dialog"] .cn-user-settings-dialog__body').boundingBox()
	const corner = await close.boundingBox()
	expect(corner.y - frame.y).toBeLessThan(24)
	expect(frame.x + frame.width - (corner.x + corner.width)).toBeLessThan(24)
	expect(corner.height).toBeLessThan(60)

	const ink = await page.evaluate(() => {
		const probe = document.createElement('span')
		probe.style.color = 'var(--color-main-text)'
		document.body.appendChild(probe)
		const main = getComputedStyle(probe).color
		probe.remove()
		const entries = [...document.querySelectorAll('.cn-user-settings-dialog__nav-link')].map((a) => getComputedStyle(a).color)
		return { main, entries }
	})
	expect(ink.entries.length).toBeGreaterThan(1)
	for (const color of ink.entries) {
		expect(color).toBe(ink.main)
	}

	const scope = page.locator('[data-testid="notices-scope"]')
	const label = await scope.locator('label').first().boundingBox()
	const toggle = await scope.locator('.vs__dropdown-toggle').boundingBox()
	expect(label.height).toBeGreaterThan(12)
	expect(label.y + label.height).toBeLessThanOrEqual(toggle.y + 1)
})
