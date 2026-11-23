// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// admin-settings-lazy-tabs: with `lazyTabs` the admin settings shell mounts a
// tab's panel only while that tab is open, and mounts it again on each visit.
//
// WHY PLAYWRIGHT: what is mounted is the real shell and CnTabs strip in a
// browser, switched by clicking the tabs.
//
// @spec openspec/changes/admin-settings-lazy-tabs/specs/settings-board-look/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a lazy tab panel mounts only while its tab is open', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/?l8=admin-lazy-tabs', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="admin-lazy-tabs"]')
	await expect(root.locator('[data-testid="lazy-panel-general"]')).toBeVisible({ timeout: 90_000 })
	await expect(root.locator('[data-testid="lazy-panel-templates"]')).toHaveCount(0)
	await expect(root.locator('[data-testid="lazy-panel-sharing"]')).toHaveCount(0)

	await root.getByRole('tab', { name: 'Templates' }).click()
	await expect(root.locator('[data-testid="lazy-panel-templates"]')).toBeVisible()
	await expect(root.locator('[data-testid="lazy-panel-general"]')).toHaveCount(0)

	await root.getByRole('tab', { name: 'General' }).click()
	await expect(root.locator('[data-testid="lazy-panel-general"]')).toBeVisible()
	expect(await page.evaluate(() => window.__adminLazyMounts)).toEqual(['general', 'templates', 'general'])
})
