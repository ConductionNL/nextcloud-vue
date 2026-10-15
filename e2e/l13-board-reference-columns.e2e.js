// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-board-reference-columns: an index page's board takes its columns from
// a referenced field (board DqWerkbord). The statusType rows of two case types
// merge by name; the "Zaaktype:" select narrows them; the "Kolommen:" switch
// moves to the case type and to the handler; a drag writes the statusType row
// of the card's own case type; a column the card cannot reach fades.
//
// WHY PLAYWRIGHT: the columns come from a real list request, the move from a
// real HTML5 drag and a real PATCH, and the fade is computed style.
//
// @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const STATUSES = [
	{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo' },
	{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo' },
	{ id: 's3', name: 'Besluit', order: 3, caseType: 'woo' },
	{ id: 'b1', name: 'Ontvangen', order: 1, caseType: 'bez' },
	{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bez' },
	{ id: 'b4', name: 'Hoorzitting', order: 4, caseType: 'bez' },
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
		assignee: { type: 'string', title: 'Behandelaar' },
	},
}
const CASES = [
	{ id: 'c1', title: 'Rapport geluidsoverlast A16', identifier: '2026-0083', status: 's1', caseType: 'woo', assignee: 'Anouk Bakker' },
	{ id: 'c2', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082', status: 's2', caseType: 'woo', assignee: 'Pieter Jansen' },
	{ id: 'c3', title: 'Bezwaar parkeerboete Havenstraat', identifier: '2026-0074', status: 'b1', caseType: 'bez', assignee: '' },
]

/**
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<{patches: Array<object>}>} What the page wrote.
 */
async function open(page) {
	const seen = { patches: [], caseQueries: [] }
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
			seen.caseQueries.push(url)
			const params = new URL(request.url()).searchParams
			const type = params.get('caseType') || params.get('caseType[]')
			results = type ? CASES.filter((row) => row.caseType === type) : CASES
		}
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results, total: results.length, page: 1, pages: 1 }) })
	})
	await page.setViewportSize({ width: 1280, height: 1000 })
	await page.goto('/?l8=board-reference', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="board-reference"] [data-testid="cn-board-card"]').first()).toBeVisible({ timeout: 90_000 })
	return seen
}

const columnKeys = (page) => page.locator('[data-testid="cn-board-column"]').evaluateAll((els) => els.map((el) => el.dataset.column))

test('the columns are the statusType rows, merged by name and ordered, with each card in its column', async ({ page }) => {
	await open(page)
	await expect.poll(() => columnKeys(page)).toEqual(['Ontvangen', 'In behandeling', 'Besluit', 'Hoorzitting'])
	const ontvangen = page.locator('[data-column="Ontvangen"] [data-testid="cn-board-card"]')
	await expect(ontvangen).toHaveCount(2)
	// The empty stage is still a column to drop a card into.
	await expect(page.locator('[data-column="Besluit"] [data-testid="cn-board-column-empty"]')).toBeVisible()
	// wrap: the four columns share one row at 1180px, no sideways scroll.
	expect(await page.locator('.cn-board-view__columns').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('the controls after the search read "Zaaktype:", "Kolommen:" and the hint', async ({ page }) => {
	await open(page)
	await expect(page.locator('[data-testid="cn-board-narrow"]')).toContainText('Zaaktype:')
	await expect(page.locator('[data-testid="cn-board-narrow-select"] option')).toHaveText(['Alle zaaktypen', 'Bezwaar', 'Woo-verzoek'])
	await expect(page.locator('[data-testid="cn-board-column-switch"]')).toContainText('Kolommen:')
	await expect(page.locator('[data-testid="cn-board-column-switch-select"] option')).toHaveText(['status', 'type', 'behandelaar'])
	await expect(page.locator('[data-testid="cn-board-hint"]')).toHaveText('Een kolom per waarde van de eigenschap.')
	const height = await page.locator('[data-testid="cn-board-column-switch-select"]').evaluate((el) => Math.round(el.getBoundingClientRect().height))
	expect(height).toBe(36)
})

test('Zaaktype narrows the cases and the columns to one case type', async ({ page }) => {
	const seen = await open(page)
	await page.locator('[data-testid="cn-board-narrow-select"]').selectOption('bez')
	await expect.poll(() => columnKeys(page)).toEqual(['Ontvangen', 'In behandeling', 'Hoorzitting'])
	await expect(page.locator('[data-testid="cn-board-card"]')).toHaveCount(1)
	expect(seen.caseQueries.some((url) => /caseType(\[\])?=bez/.test(url))).toBe(true)
})

test('Kolommen switches the columns to the case type and to the handler', async ({ page }) => {
	await open(page)
	await page.locator('[data-testid="cn-board-column-switch-select"]').selectOption('caseType')
	await expect.poll(() => columnKeys(page)).toEqual(['woo', 'bez'])
	await expect(page.locator('[data-column="woo"]')).toContainText('Woo-verzoek')
	await page.locator('[data-testid="cn-board-column-switch-select"]').selectOption('assignee')
	await expect.poll(() => columnKeys(page)).toEqual(['Anouk Bakker', 'Pieter Jansen', '__none__'])
	await expect(page.locator('[data-column="__none__"]')).toContainText('Niemand')
})

test('a drag writes the statusType row of the card\'s own case type', async ({ page }) => {
	const seen = await open(page)
	const card = page.locator('[data-testid="cn-board-card"][data-card-id="c3"]')
	await card.dragTo(page.locator('[data-column="In behandeling"]'))
	await expect.poll(() => seen.patches.length).toBe(1)
	expect(seen.patches[0].url).toContain('/apps/openregister/api/objects/dossiq/case/c3')
	expect(seen.patches[0].body).toEqual({ status: 'b2' })
})

test('a column the card cannot reach reads "not allowed" in its menu, and a drop there is refused without a write', async ({ page }) => {
	const seen = await open(page)
	const card = page.locator('[data-testid="cn-board-card"][data-card-id="c1"]')
	await card.locator('[data-testid="cn-board-card-menu"]').click()
	const besluit = card.locator('[data-testid="cn-board-menu-move"][data-target="Besluit"]')
	await expect(besluit).toHaveAttribute('aria-disabled', 'true')
	await expect(besluit).toContainText('not allowed')
	await expect(card.locator('[data-testid="cn-board-menu-move"][data-target="In behandeling"]')).not.toHaveAttribute('aria-disabled', 'true')
	await page.keyboard.press('Escape')
	await card.dragTo(page.locator('[data-column="Besluit"]'))
	await expect(page.locator('[data-testid="cn-board-refusal"]')).toHaveText('Rapport geluidsoverlast A16 cannot move to Besluit.')
	expect(seen.patches).toHaveLength(0)
})

test('a card checkbox selects it for the bulk band', async ({ page }) => {
	await open(page)
	// The board look shows a card's checkbox on hover, focus or an existing selection.
	await page.locator('[data-testid="cn-board-card"][data-card-id="c2"]').hover()
	await page.locator('[data-testid="cn-board-card-select"][data-card-id="c2"]').check()
	await expect(page.locator('[data-testid="cn-board-card-select"][data-card-id="c2"]')).toBeChecked()
})
