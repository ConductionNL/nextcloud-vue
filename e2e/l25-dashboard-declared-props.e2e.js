// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// dashboard-declared-widget-props: a dashboard widget gets only the content
// keys it declares, so an undeclared key never lands on its root.
//
// WHY PLAYWRIGHT: what reaches the root is the rendered DOM of the real
// CnDashboardPage grid, and the warning is the browser console's.
//
// @spec openspec/changes/dashboard-declared-widget-props/specs/dashboard-page/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<string[]>} The console warnings, filled as they arrive.
 */
async function open(page) {
	const warnings = []
	page.on('console', (msg) => {
		if (msg.type() === 'warning') {
			warnings.push(msg.text())
		}
	})
	await page.setViewportSize({ width: 1280, height: 1000 })
	await page.goto('/?l8=declared-props', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="declared-props"] [data-testid="badge"]')).toBeVisible({ timeout: 90_000 })
	return warnings
}

test('an undeclared content key does not override what the widget computes', async ({ page }) => {
	const warnings = await open(page)
	const root = page.locator('[data-testid="declared-props"]')
	await expect(root.locator('[data-testid="badge"]')).toHaveText('Computed')
	await expect(root.locator('[data-testid="heading"]')).toHaveText('Hello')
	await expect.poll(() => warnings.filter((w) => w.includes('content key "label"') && w.includes('"labelled"')).length).toBe(1)
	expect(warnings.filter((w) => w.includes('content key') && w.includes('"tabs"'))).toEqual([])
})

test('a tabs widget names its tab strip, not its root element', async ({ page }) => {
	await open(page)
	const tabs = page.locator('[data-testid="declared-props"] .cn-tabs-widget')
	await expect(tabs.getByRole('tablist')).toHaveAttribute('aria-label', 'Bank tabs')
	await expect(tabs).not.toHaveAttribute('aria-label', /.*/)
})
