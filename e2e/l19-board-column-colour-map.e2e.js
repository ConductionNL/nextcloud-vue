// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// board-column-colour-map: statusType rows store NL Design System palette
// names, and `source.colorMap` maps them to `var(--nl-color-<hue>, <hex>)`. A
// merged column draws the mapped colour of the hue `neutralColor` picked, and a
// `-light` tint, which is no CSS colour on its own, still draws a dot.
//
// WHY PLAYWRIGHT: the rows come from a real list request and the colour is the
// computed style of the column dot.
//
// @spec openspec/changes/board-column-colour-map/specs/board-view/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const STATUSES = [
	{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo', colour: 'grey-light' },
	{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo', colour: 'grey' },
	{ id: 'b1', name: 'Ontvangen', order: 1, caseType: 'bez', colour: 'grey-light' },
	{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bez', colour: 'orange' },
]
const TYPES = [{ id: 'woo', title: 'Woo-verzoek' }, { id: 'bez', title: 'Bezwaar' }]
const SCHEMA = {
	id: 'case',
	slug: 'case',
	title: 'Zaak',
	properties: {
		title: { type: 'string', title: 'Titel' },
		identifier: { type: 'string', title: 'Nummer' },
		status: { type: 'string', $ref: 'statusType', title: 'Status' },
		caseType: { type: 'string', $ref: 'caseType', title: 'Zaaktype' },
	},
}
const CASES = [
	{ id: 'c1', title: 'Rapport geluidsoverlast A16', identifier: '2026-0083', status: 's1', caseType: 'woo' },
	{ id: 'c2', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082', status: 's2', caseType: 'woo' },
	{ id: 'c3', title: 'Bezwaar parkeerboete Havenstraat', identifier: '2026-0074', status: 'b2', caseType: 'bez' },
]

/**
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function open(page) {
	await page.route('**/apps/openregister/api/**', (route) => {
		const request = route.request()
		const url = decodeURIComponent(request.url())
		if (url.includes('/api/schemas/')) {
			return route.fulfill({ contentType: 'application/json', body: JSON.stringify(SCHEMA) })
		}
		if (url.includes('/api/registers/')) {
			return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'dossiq', slug: 'dossiq', schemas: ['case'] }) })
		}
		let results = []
		if (url.includes('/dossiq/statusType')) {
			results = STATUSES
		} else if (url.includes('/dossiq/caseType')) {
			results = TYPES
		} else if (url.includes('/dossiq/case')) {
			results = CASES
		}
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results, total: results.length, page: 1, pages: 1 }) })
	})
	await page.setViewportSize({ width: 1280, height: 1000 })
	await page.goto('/?l8=board-colour-map', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="board-colour-map"] [data-testid="cn-board-card"]').first()).toBeVisible({ timeout: 90_000 })
}

const dot = (page, column) => page.locator(`[data-column="${column}"] [data-testid="cn-board-dot"]`).first()
const background = (locator) => locator.evaluate((el) => getComputedStyle(el).backgroundColor)

test('a merged column draws the mapped colour of the hue it picked', async ({ page }) => {
	await open(page)
	await expect.poll(() => background(dot(page, 'In behandeling'))).toBe('rgb(225, 112, 0)')
})

test('a -light tint draws a dot in its mapped colour', async ({ page }) => {
	await open(page)
	await expect.poll(() => background(dot(page, 'Ontvangen'))).toBe('rgb(240, 240, 240)')
})
