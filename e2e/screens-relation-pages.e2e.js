// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-relation-pages: the person page as the canonical manifest configures
// it (RelationPagesHarness.vue, ?relation=person). Layout a real browser has to
// measure: the Overview tab's stack joins its first card to the strip and draws
// the next ones as separate cards; the Cases tab is a plain panel (control);
// the record list draws board rows, a feed and a stacked side row.
//
// @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-tab-can-hold-a-stack-of-widgets
// @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-record-list-shows-the-objects-that-point-at-this-record

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

const CASES = [
	{ id: 'c-1', title: 'Street lighting cycle path', identifier: '2026-0082', caseTypeName: 'Information request', status: 'open', deadline: '2099-11-01' },
	{ id: 'c-2', title: 'Broken lamp post', identifier: '2025-0412', caseTypeName: 'Report', status: 'closed', closedAt: '2025-11-18', deadline: '2025-11-20' },
]
const MOMENTS = [
	{ id: 'm-1', channel: 'portal', direction: 'in', startTime: '2026-10-04T10:52:00', summary: 'Would like to see all documents about the lighting.' },
	{ id: 'm-2', channel: 'phone', direction: 'in', startTime: '2026-10-03T14:10:00', summary: 'Asked how to file a request.' },
	{ id: 'm-3', channel: 'portal', direction: 'out', startTime: '2026-10-04T10:24:00', summary: 'Explained the works start in March.' },
]

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.route('**/apps/openregister/api/objects/**', (route) => {
		const url = new URL(route.request().url())
		let results = []
		if (url.pathname.endsWith('/case')) {
			results = url.searchParams.get('status') === 'open' ? CASES.slice(0, 1) : CASES
		} else if (url.pathname.endsWith('/moment')) {
			results = MOMENTS
		}
		return route.fulfill({ json: { results, total: results.length } })
	})
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

test.describe('a record list draws the board rows', () => {
	test('rows: title and meta on the left, pill and date on the right, the total in the header link', async ({ page }) => {
		await open(page, '?relation=person')
		const card = page.locator('[data-testid="cn-tabs-widget-stack-person-cases"]')
		const rows = card.locator('[data-testid="cn-record-list-item"]')
		await expect(rows).toHaveCount(2)
		await expect(rows.nth(0)).toContainText('Street lighting cycle path')
		await expect(rows.nth(0)).toContainText('2026-0082 · Information request')
		await expect(rows.nth(0)).toContainText('In progress')
		await expect(rows.nth(0).locator('.cn-record-list__trailing')).toHaveText(/^Due /)
		await expect(rows.nth(1).locator('.cn-record-list__trailing')).toHaveText(/^Done /)
		await expect(card.locator('[data-testid="cn-widget-wrapper-header-link"]')).toHaveText('View all 2 cases')

		const title = await rect(rows.nth(0).locator('.cn-record-list__title'))
		const pill = await rect(rows.nth(0).locator('.cn-record-list__aside'))
		// One line: the pill sits right of the title, vertically within the row.
		expect(pill.left).toBeGreaterThan(title.right)
		expect(Math.abs((pill.top + pill.height / 2) - (title.top + title.height))).toBeLessThan(20)
		// A hairline between rows.
		const border = await rows.nth(1).evaluate((el) => getComputedStyle(el).borderTopWidth)
		expect(border).toBe('1px')
	})

	test('feed: a round icon per row, the meta line and the text, the total as a note', async ({ page }) => {
		await open(page, '?relation=person')
		const card = page.locator('[data-testid="cn-tabs-widget-stack-person-moments"]')
		await expect(card.locator('[data-testid="cn-record-list-item"]')).toHaveCount(3)
		await expect(card.locator('[data-testid="cn-detail-widget-header-note"]')).toHaveText('3 in total')
		const icon = card.locator('.cn-record-list__feed-icon').first()
		const box = await rect(icon)
		expect(Math.round(box.width)).toBe(36)
		expect(await icon.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('50%')
		await expect(card.locator('.cn-record-list__text').first()).toHaveText('Would like to see all documents about the lighting.')
		await page.locator('[data-testid="relation-box"]').screenshot({ path: test.info().outputPath('relation-lists.png') })
	})

	test('in the side column a row stacks: title, meta, then pill and date', async ({ page }) => {
		await open(page, '?relation=person')
		const side = page.locator('[data-testid="cn-detail-page-side-side-open"]')
		const row = side.locator('[data-testid="cn-record-list-item"]')
		await expect(row).toHaveCount(1)
		const title = await rect(row.locator('.cn-record-list__title'))
		const pill = await rect(row.locator('.cn-record-list__aside'))
		expect(pill.top).toBeGreaterThanOrEqual(title.bottom)
		await expect(row.locator('.cn-record-list__chevron')).toHaveCount(0)
	})
})

test.describe('the facts card draws the relation side cards', () => {
	test('identity: a lead tile, a masked BSN that shows on request, a constant note', async ({ page }) => {
		await open(page, '?relation=person')
		const card = page.locator('[data-testid="cn-detail-page-side-side-identity"]')
		await expect(card.locator('[data-testid="cn-fact-digid"]')).toContainText('Signed in with DigiD')
		const tile = await rect(card.locator('.cn-facts-widget__lead-tile'))
		expect(Math.round(tile.width)).toBe(40)
		await expect(card.locator('[data-testid="cn-fact-bsn"] dd')).toContainText('*****7609')
		await card.locator('[data-testid="cn-fact-reveal-bsn"]').click()
		await expect(card.locator('[data-testid="cn-fact-bsn"] dd')).toContainText('123457609')
		await expect(card.locator('[data-testid="cn-fact-logged"]')).toHaveText('Showing the BSN is logged.')
	})

	test('contact channels: links, and the header action shows on a side card', async ({ page }) => {
		await open(page, '?relation=person')
		const card = page.locator('[data-testid="cn-detail-page-side-side-channels"]')
		await expect(card.locator('a[href="mailto:s.devries@example.nl"]')).toBeVisible()
		await expect(card.locator('a[href="tel:0612345678"]')).toBeVisible()
		const action = card.locator('[data-testid="cn-detail-widget-header-action"]')
		await expect(action).toBeVisible()
		await expect(action).toHaveText('Add')
		// In the header, level with the title.
		const title = await rect(card.locator('.cn-widget-wrapper__title').first())
		const button = await rect(action)
		expect(Math.abs((button.top + button.height / 2) - (title.top + title.height / 2))).toBeLessThan(12)
		await page.locator('[data-testid="cn-detail-page-side"]').screenshot({ path: test.info().outputPath('relation-side.png') })
	})
})
