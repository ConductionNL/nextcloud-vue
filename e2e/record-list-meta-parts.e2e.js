// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A record-list meta line built from parts, in a browser
// (screens-record-list-meta-parts): a row without a handler keeps its line.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a row that misses one part keeps the rest of its meta line', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/dossiq/case**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({
			results: [
				{ id: 'a', title: 'Verlichting', identifier: '2026-0082', caseTypeName: 'Woo-verzoek', handler: 'Sanne' },
				{ id: 'b', title: 'Lantaarnpaal', identifier: '2025-0412', caseTypeName: 'Melding' },
			],
			total: 2,
		}),
	}))
	await page.goto('/?l6=record-list-meta-parts', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const rows = page.locator('[data-testid="cn-record-list-item"]')
	await rows.first().waitFor({ state: 'visible', timeout: 60_000 })

	await expect(rows.nth(0).locator('.cn-record-list__meta')).toHaveText('2026-0082 · Woo-verzoek · Sanne')
	await expect(rows.nth(1).locator('.cn-record-list__meta')).toHaveText('2025-0412 · Melding')
})
