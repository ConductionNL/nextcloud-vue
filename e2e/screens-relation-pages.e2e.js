// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-relation-pages: the person page as the canonical manifest configures
// it (RelationPagesHarness.vue, ?relation=person). Layout a real browser has to
// measure: the Overview tab's stack joins its first card to the strip and draws
// the next ones as separate cards; the Cases tab is a plain panel (control).
//
// @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-tab-can-hold-a-stack-of-widgets

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.setViewportSize({ width: 1440, height: 1200 })
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	await expect(page.locator('[data-testid="relation-box"] .cn-tabs__nav').first()).toBeVisible({ timeout: 120_000 })
}

/**
 * @param {import('@playwright/test').Locator} locator The element.
 * @return {Promise<{top: number, left: number, width: number, height: number, right: number, bottom: number}>} Its box.
 */
function rect(locator) {
	return locator.evaluate((el) => {
		const r = el.getBoundingClientRect()
		return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
	})
}

/**
 * @param {import('@playwright/test').Locator} locator The element.
 * @return {Promise<{borderTop: string, radius: string}>} Its frame.
 */
function frame(locator) {
	return locator.evaluate((el) => {
		const s = getComputedStyle(el)
		return { borderTop: s.borderTopWidth, radius: s.borderTopLeftRadius + ' ' + s.borderTopRightRadius }
	})
}

test.describe('a tab holds a stack of widgets', () => {
	test('the Overview joins its first card to the strip and draws the next ones as separate cards', async ({ page }) => {
		await open(page, '?relation=person')
		const stack = page.locator('[data-testid="cn-tabs-widget-stack"]').first()
		await expect(stack).toBeVisible()
		const first = page.locator('.cn-tabs-widget__stack-first .cn-widget-wrapper').first()
		const items = page.locator('.cn-tabs-widget__stack-item')
		await expect(items).toHaveCount(2)
		await expect(items.nth(0)).toContainText('Cases')
		await expect(items.nth(1)).toContainText('Latest contact moments')
		await expect(first).toContainText('Resident')
		// The first card starts where the strip starts: no panel padding.
		expect(Math.abs((await rect(first)).left - (await rect(page.locator('.cn-tabs__nav').first())).left)).toBeLessThanOrEqual(1)

		const strip = await rect(page.locator('.cn-tabs__nav').first())
		const a = await rect(first)
		const b = await rect(items.nth(0).locator('.cn-widget-wrapper').first())
		const c = await rect(items.nth(1).locator('.cn-widget-wrapper').first())
		// Joined: the first card starts where the strip ends.
		expect(Math.abs(a.top - strip.bottom)).toBeLessThanOrEqual(2)
		// Separate cards, 20px apart, in order.
		expect(b.top - a.bottom).toBeGreaterThanOrEqual(18)
		expect(b.top - a.bottom).toBeLessThanOrEqual(22)
		expect(c.top - b.bottom).toBeGreaterThanOrEqual(18)

		const f = await frame(first)
		expect(f.borderTop).toBe('1px')
		expect(f.radius).toBe('0px 12px')
		const g = await frame(items.nth(0).locator('.cn-widget-wrapper').first())
		expect(g.borderTop).toBe('1px')
		expect(g.radius).toBe('12px 12px')

		// The panel itself draws no frame around the stack.
		const panel = await frame(page.locator('.cn-tabs-widget__tabs .cn-tabs__content').first())
		expect(panel.borderTop).toBe('0px')
		await page.locator('[data-testid="relation-box"]').screenshot({ path: test.info().outputPath('relation-overview.png') })
	})

	test('control: the Cases tab is one panel, framed as before', async ({ page }) => {
		await open(page, '?relation=person')
		await page.locator('[role="tab"]', { hasText: 'Cases' }).first().click()
		await expect(page.locator('[data-testid="cn-tabs-widget-stack"]').first()).toBeHidden()
		const panel = await frame(page.locator('.cn-tabs-widget__tabs .cn-tabs__content').first())
		expect(panel.borderTop).toBe('1px')
		await page.locator('[data-testid="relation-box"]').screenshot({ path: test.info().outputPath('relation-cases.png') })
	})
})
