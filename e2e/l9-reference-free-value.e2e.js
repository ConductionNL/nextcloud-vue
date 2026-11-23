// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A settings-form `reference` field with `free: true` (?l7=reference-free-value,
// harness l7/ReferenceFreeValue.vue): besides picking an object, the person
// types a logo URL, and the form saves it in the one Save. A typed value that
// does not match freePattern is refused before any write.
//
// WHY PLAYWRIGHT: the PATCH goes over the wire (stubbed) from a widget mounted
// the way a detail page mounts it, typed into a real input.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('type a logo URL besides the objects, the form saves it', async ({ page }) => {
	const patches = []
	await page.route('**/apps/openregister/api/objects/portaliq/asset**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [{ id: 'a-1', name: 'Wapen' }] }) }))
	await page.route('**/apps/openregister/api/objects/portaliq/portal/p-1', (route) => {
		if (route.request().method() === 'PATCH') {
			patches.push(route.request().postDataJSON())
		}
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'p-1', ...(patches[patches.length - 1] || {}) }) })
	})
	await page.goto('/?l7=reference-free-value', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const typed = page.getByLabel('Of een webadres')
	await typed.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(typed).toHaveValue('https://www.zuiddrecht.nl/logo.svg')

	await typed.fill('http://zuiddrecht.nl/oud.svg')
	await page.locator('[data-testid="cn-settings-form-save"]').click()
	await expect(page.getByText('Gebruik een https-adres.')).toBeVisible()
	expect(patches).toEqual([])

	await typed.fill('https://www.zuiddrecht.nl/nieuw.svg')
	await page.locator('[data-testid="cn-settings-form-save"]').click()
	await expect.poll(() => patches.length).toBe(1)
	expect(patches[0]).toEqual({ logo: 'https://www.zuiddrecht.nl/nieuw.svg' })
})
