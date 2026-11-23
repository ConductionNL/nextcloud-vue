// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A record list says why a personal lens is empty, in a browser
// (screens-record-list-lens-reason).

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('an unavailable lens explains the empty list, in the library wording and in the app wording', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/dossiq/case**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({
			results: [],
			total: 0,
			'@self': { lenses: { recent: { available: false, reason: 'audit-trail-disabled' } } },
		}),
	}))
	await page.goto('/?l6=record-list-lens-reason', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const first = page.locator('.l6-lens-default [data-testid="cn-record-list-empty"]')
	await first.waitFor({ state: 'visible', timeout: 60_000 })

	await expect(first).toHaveText(/This server does not keep track of what you open\.|Deze server houdt niet bij welke items je opent\./)
	await expect(page.locator('.l6-lens-own [data-testid="cn-record-list-empty"]')).toHaveText('Recente zaken vragen om de audit trail.')
})
