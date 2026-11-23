// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// board-move-block-reasons: the move-targets handler answers a blocked target
// as `{ key, allowed: false, reason }`. The card menu shows it disabled with
// the reason under its name, the refused column shows the reason under its
// header while the card is dragged, and a drop there is refused with it and
// writes nothing. Plain ids keep working beside it.
//
// WHY PLAYWRIGHT: the handler runs on a real board fed by real list requests,
// the drag is a real HTML5 drag, and the faded column is computed style.
//
// @spec openspec/changes/board-move-block-reasons/specs/board-view/spec.md

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
	await page.goto('/?l8=board-block-reasons', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="board-block-reasons"] [data-testid="cn-board-card"]').first()).toBeVisible({ timeout: 90_000 })
	return seen
}

const REASON = 'Er is nog geen besluit vastgelegd.'

test('the card menu shows a blocked target disabled with its reason, and a plain id stays open', async ({ page }) => {
	await open(page)
	const card = page.locator('[data-testid="cn-board-card"][data-card-id="c1"]')
	await card.locator('[data-testid="cn-board-card-menu"]').click()
	const besluit = card.locator('[data-testid="cn-board-menu-move"][data-target="Besluit"]')
	await expect(besluit).toHaveAttribute('aria-disabled', 'true')
	await expect(besluit.locator('[data-testid="cn-board-menu-reason"]')).toHaveText(REASON)
	await expect(card.locator('[data-testid="cn-board-menu-move"][data-target="In behandeling"]')).not.toHaveAttribute('aria-disabled', 'true')
	// Not offered by the handler at all: still "not allowed", as before.
	await expect(card.locator('[data-testid="cn-board-menu-move"][data-target="Hoorzitting"] [data-testid="cn-board-menu-blocked"]')).toHaveText('not allowed')
	// The reason sits under the name, inside the menu.
	const box = await besluit.boundingBox()
	const reasonBox = await besluit.locator('[data-testid="cn-board-menu-reason"]').boundingBox()
	expect(reasonBox.y).toBeGreaterThan(box.y + 10)
})

test('during a drag the refused column shows the reason under its header at full contrast', async ({ page }) => {
	await open(page)
	const card = page.locator('[data-testid="cn-board-card"][data-card-id="c1"]')
	const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
	await card.dispatchEvent('dragstart', { dataTransfer })
	const reason = page.locator('[data-column="Besluit"] [data-testid="cn-board-column-reason"]')
	await expect(reason).toHaveText(REASON)
	await expect(page.locator('[data-column="In behandeling"] [data-testid="cn-board-column-reason"]')).toHaveCount(0)
	const opacity = await reason.evaluate((el) => {
		let value = 1
		for (let node = el; node; node = node.parentElement) {
			value *= Number(getComputedStyle(node).opacity)
		}
		return value
	})
	expect(opacity).toBe(1)
	const cardsFaded = await page.locator('[data-column="Besluit"] [data-testid="cn-board-column-empty"]').evaluate((el) => Number(getComputedStyle(el).opacity))
	expect(cardsFaded).toBeLessThan(1)
	await card.dispatchEvent('dragend', { dataTransfer })
	await expect(reason).toHaveCount(0)
})

test('a drop on the blocked column is refused with the reason and nothing is written', async ({ page }) => {
	const seen = await open(page)
	await page.locator('[data-testid="cn-board-card"][data-card-id="c1"]').dragTo(page.locator('[data-column="Besluit"]'))
	await expect(page.locator('[data-testid="cn-board-refusal"]')).toHaveText(REASON)
	expect(seen.patches).toHaveLength(0)
})

test('a card the handler leaves open moves as before', async ({ page }) => {
	const seen = await open(page)
	await page.locator('[data-testid="cn-board-card"][data-card-id="c3"]').dragTo(page.locator('[data-column="In behandeling"]'))
	await expect.poll(() => seen.patches.length).toBe(1)
	expect(seen.patches[0].body).toEqual({ status: 'b2' })
})
