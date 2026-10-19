// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// board-column-capacity: a board column built from statusType rows carries the
// limit its row declares (`source.capacityField`). The header reads
// "count / capacity" and turns full at the limit, a move into a full column is
// refused with a sentence and no write, and a column merged from two case
// types shows no limit but still refuses a move into the row that is full.
//
// WHY PLAYWRIGHT: the limits come from a real list request, the move from a
// real HTML5 drag, and the full tone is computed style.
//
// @spec openspec/changes/board-column-capacity/specs/board-view/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const STATUSES = [
	{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo' },
	{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo', capacity: 1 },
	{ id: 's3', name: 'Besluit', order: 3, caseType: 'woo', capacity: 2 },
	{ id: 'b1', name: 'Ontvangen', order: 1, caseType: 'bez' },
	{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bez', capacity: 5 },
	{ id: 'b4', name: 'Hoorzitting', order: 4, caseType: 'bez', capacity: 1 },
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
	{ id: 'c3', title: 'Bezwaar parkeerboete Havenstraat', identifier: '2026-0074', status: 'b1', caseType: 'bez' },
	{ id: 'c4', title: 'Bezwaar bouwvergunning Kerkstraat', identifier: '2026-0071', status: 'b4', caseType: 'bez' },
]

/**
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<{patches: Array<object>}>} What the page wrote.
 */
async function open(page) {
	const seen = { patches: [] }
	await page.route('**/apps/openregister/api/**', (route) => {
		const request = route.request()
		const url = decodeURIComponent(request.url())
		if (request.method() === 'PATCH') {
			seen.patches.push({ url, body: request.postDataJSON() })
			return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
		}
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
			const params = new URL(request.url()).searchParams
			const type = params.get('caseType') || params.get('caseType[]')
			results = type ? CASES.filter((row) => row.caseType === type) : CASES
		}
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results, total: results.length, page: 1, pages: 1 }) })
	})
	await page.setViewportSize({ width: 1280, height: 1000 })
	await page.goto('/?l8=board-capacity', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="board-capacity"] [data-testid="cn-kanban-card"]').first()).toBeVisible({ timeout: 90_000 })
	return seen
}

const count = (page, column) => page.locator(`[data-column="${column}"] [data-testid="cn-kanban-count"]`)

test('the header reads "count / capacity", turns full at the limit, and a column without a limit reads its count', async ({ page }) => {
	await open(page)
	await expect(count(page, 'Hoorzitting')).toHaveText(/^1 \/ 1\s*full$/)
	await expect(count(page, 'Besluit')).toHaveText('0 / 2')
	await expect(count(page, 'Ontvangen')).toHaveText('2')
	// Merged from two case types with two limits: no limit is shown.
	await expect(count(page, 'In behandeling')).toHaveText('1')
	await expect(page.locator('[data-column="Hoorzitting"]')).toHaveAttribute('data-full', 'true')
	const tone = await count(page, 'Hoorzitting').evaluate((el) => {
		const probe = document.createElement('span')
		probe.style.color = 'var(--color-error-text, var(--color-error))'
		el.parentElement.appendChild(probe)
		const expected = getComputedStyle(probe).color
		probe.remove()
		return { actual: getComputedStyle(el).color, expected, weight: getComputedStyle(el).fontWeight }
	})
	expect(tone.actual).toBe(tone.expected)
	expect(tone.weight).toBe('600')
})

test('a drop on a full column is refused with a sentence and nothing is written', async ({ page }) => {
	const seen = await open(page)
	await page.locator('[data-testid="cn-kanban-card"][data-card-id="c3"]').dragTo(page.locator('[data-column="Hoorzitting"]'))
	await expect(page.locator('[data-testid="cn-kanban-refusal"]')).toHaveText('Hoorzitting is full: 1 of 1.')
	expect(seen.patches).toHaveLength(0)
})

test('the card menu marks a full column "full"', async ({ page }) => {
	await open(page)
	const card = page.locator('[data-testid="cn-kanban-card"][data-card-id="c3"]')
	await card.locator('[data-testid="cn-kanban-card-menu"]').click()
	const full = card.locator('[data-testid="cn-kanban-menu-move"][data-target="Hoorzitting"]')
	await expect(full).toHaveAttribute('aria-disabled', 'true')
	await expect(full).toContainText('full')
})

test('a merged column refuses the row that is full and takes the one that is not', async ({ page }) => {
	const seen = await open(page)
	await page.locator('[data-testid="cn-kanban-card"][data-card-id="c1"]').dragTo(page.locator('[data-column="In behandeling"]'))
	await expect(page.locator('[data-testid="cn-kanban-refusal"]')).toHaveText('In behandeling is full: 1 of 1.')
	expect(seen.patches).toHaveLength(0)
	await page.locator('[data-testid="cn-kanban-card"][data-card-id="c3"]').dragTo(page.locator('[data-column="In behandeling"]'))
	await expect.poll(() => seen.patches.length).toBe(1)
	expect(seen.patches[0].body).toEqual({ status: 'b2' })
})

test('narrowed to one case type, the merged column shows that row\'s limit', async ({ page }) => {
	await open(page)
	await page.locator('[data-testid="cn-kanban-narrow-select"]').selectOption('woo')
	await expect(count(page, 'In behandeling')).toHaveText(/^1 \/ 1\s*full$/)
})
