// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// admin-settings-tabs: the admin settings shell draws a tab strip under its
// header (board ShInstellingen). The arrow keys move between tabs, the open
// tab is in the address and survives a reload, the version card stays on the
// first tab, and a panel's sections are board cards side by side.
//
// WHY PLAYWRIGHT: real keyboard focus, the address bar across a reload, and
// laid-out card positions.
//
// @spec openspec/changes/admin-settings-tabs/specs/settings-board-look/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the admin shell tab strip: keyboard, address and cards', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/?l8=admin-tabs', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="admin-tabs"]')
	const strip = root.locator('[role="tablist"]')
	await expect(strip).toBeVisible({ timeout: 90_000 })

	const tabs = strip.locator('[role="tab"]')
	await expect(tabs).toHaveText(['Algemeen', 'Verplichte velden 12', 'Koppelingen 5'])
	await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
	await expect(root.locator('.cn-version-info').first()).toBeVisible()

	// The strip sits right under the header.
	const header = await root.locator('[data-testid="cn-admin-settings-header"]').boundingBox()
	const stripBox = await strip.boundingBox()
	expect(stripBox.y).toBeGreaterThan(header.y + header.height - 1)

	await tabs.nth(0).focus()
	await page.keyboard.press('ArrowRight')
	await expect(tabs.nth(1)).toBeFocused()
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
	expect(new URL(page.url()).searchParams.get('tab')).toBe('velden')
	await expect(root.locator('.cn-version-info')).toHaveCount(0)

	const cards = root.locator('[data-tab="velden"] > .settings-section')
	await expect(cards).toHaveCount(2)
	const [first, second] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()]
	expect(Math.abs(first.y - second.y)).toBeLessThan(2)
	expect(second.x).toBeGreaterThan(first.x + first.width)
	expect(await cards.nth(0).evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid')

	await page.reload({ waitUntil: 'domcontentloaded' })
	await expect(root.locator('[role="tab"]').nth(1)).toHaveAttribute('aria-selected', 'true', { timeout: 90_000 })
	await expect(root.locator('[data-tab="velden"]')).toBeVisible()
})
