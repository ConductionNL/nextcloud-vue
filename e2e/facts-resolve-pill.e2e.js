// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A facts pill on a reference (?factswidget=pill, FactsHarness.vue): the task
// holds the id of its status; the pill shows the status's name (through `map`)
// and takes its tone from the status's `state` (`resolve.toneField`).
//
// WHY PLAYWRIGHT: the label and the tone come from the real object store and
// its list request, stubbed here on the wire; a unit test mocks the resolver.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a pill on a reference shows the referenced name, coloured by a field of the referenced object', async ({ page }) => {
	const asked = []
	await page.route('**/apps/openregister/api/objects/dossiq/status**', async (route) => {
		asked.push(route.request().url())
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ id: 'st-9', name: 'In review', state: 'open' }] }) })
	})
	await page.goto('/?factswidget=pill', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const pill = page.locator('[data-testid="facts-harness-pill"] .cn-status-badge')
	await pill.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(pill).toHaveText('In behandeling')
	await expect(pill).toHaveClass(/warning/)
	await expect(page.locator('[data-testid="facts-harness-pill"]')).not.toContainText('st-9')
	expect(asked.length).toBeGreaterThan(0)
})
