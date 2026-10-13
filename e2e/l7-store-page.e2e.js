// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The store page reads in the user's language (?l7=store-page, harness
// l7/StorePage.vue): the manifest description goes through the app's
// translate, and the kind chips and the cards name a kind by its label.
// Launchpad's store showed the English description and the raw ids
// ("app-template", "adapter").
//
// WHY PLAYWRIGHT: the real page against its endpoint on the wire, with the
// real NcButton chips.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the description is translated and no kind is shown by its id', async ({ page }) => {
	await page.route('**/apps/launchpad/api/store/items**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ outcome: 'ok', cards: [{ slug: 'zaken', title: 'Zaken', description: 'Een startpagina voor zaken.', kind: 'app-template', publisher: 'Conduction', version: '1.0.0' }] }),
	}))
	await page.goto('/?l7=store-page', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="store-page-host"]')
	await host.locator('[data-testid="store-results"]').waitFor({ state: 'visible', timeout: 60_000 })

	await expect(host.locator('.cn-store-page__intro')).toHaveText('Sjablonen en koppelingen voor je startpagina.')
	await expect(host.locator('.cn-store-page__title')).toHaveText('Winkel')

	const chips = await host.locator('[data-testid^="store-kind-"]').allInnerTexts()
	expect(chips.map((text) => text.trim())).toEqual(['All kinds', 'App template', 'Adapter', 'Source template', 'Configuration template', 'Agent template'])
	await expect(host.locator('[data-testid="store-card-kind"]').first()).toHaveText('App template · Conduction')
	await expect(host).not.toContainText('app-template')
	await expect(host).not.toContainText('source-template')
})
