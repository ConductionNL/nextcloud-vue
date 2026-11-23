// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// admin-settings-underline-tabs: with `tabsVariant: "underline"` the admin
// shell draws board LpBeheerAlgemeen's strip: labels without fill or frame,
// 44px high, the open one bold over a 3px primary underline on the strip's
// rule. Moving the selection moves the underline and the address.
//
// WHY PLAYWRIGHT: computed borders and heights, and real keyboard focus.
//
// @spec openspec/changes/admin-settings-underline-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-an-underline-tab-strip

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Locator} tab A tab button.
 * @return {Promise<object>} The styles the board fixes.
 */
function look(tab) {
	return tab.evaluate((el) => {
		const s = getComputedStyle(el)
		return {
			bottomWidth: s.borderBottomWidth,
			bottomColor: s.borderBottomColor,
			topWidth: s.borderTopWidth,
			background: s.backgroundColor,
			weight: s.fontWeight,
			height: el.getBoundingClientRect().height,
		}
	})
}

test('the admin shell draws an underline strip', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/?l8=admin-underline-tabs', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="admin-underline-tabs"]')
	const strip = root.locator('[role="tablist"]')
	await expect(strip).toBeVisible({ timeout: 90_000 })
	const tabs = strip.locator('[role="tab"]')
	await expect(tabs).toHaveText(['Algemeen', 'Sjablonen', 'Delen'])

	const primary = await page.evaluate(() => {
		const probe = document.createElement('span')
		probe.style.color = 'var(--color-primary-element)'
		document.body.append(probe)
		const colour = getComputedStyle(probe).color
		probe.remove()
		return colour
	})

	const open = await look(tabs.nth(0))
	expect(open.bottomWidth).toBe('3px')
	expect(open.bottomColor).toBe(primary)
	expect(open.topWidth).toBe('0px')
	expect(open.background).toBe('rgba(0, 0, 0, 0)')
	expect(open.weight).toBe('700')
	expect(Math.round(open.height)).toBe(44)

	const idle = await look(tabs.nth(1))
	expect(idle.bottomWidth).toBe('3px')
	expect(idle.bottomColor).toBe('rgba(0, 0, 0, 0)')
	expect(idle.background).toBe('rgba(0, 0, 0, 0)')
	expect(idle.weight).toBe('500')

	// The underline sits on the strip's rule.
	const tabBox = await tabs.nth(0).boundingBox()
	const barBox = await root.locator('.cn-tabs__bar').boundingBox()
	expect(Math.abs((tabBox.y + tabBox.height) - (barBox.y + barBox.height))).toBeLessThanOrEqual(1)

	await tabs.nth(0).focus()
	await page.keyboard.press('ArrowRight')
	await expect(tabs.nth(1)).toBeFocused()
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
	expect(new URL(page.url()).searchParams.get('tab')).toBe('sjablonen')
	expect((await look(tabs.nth(1))).bottomColor).toBe(primary)
	expect((await look(tabs.nth(0))).bottomColor).toBe('rgba(0, 0, 0, 0)')
})
