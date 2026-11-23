// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A settings-form field of type `reference` (?l7=reference-field, harness
// l7/ReferenceField.vue): the logo of a portal is picked from the objects of a
// configured register and schema and stored as a reference in the configured
// format; the URL that was stored stays selectable until another is chosen.
//
// WHY PLAYWRIGHT: the list read and the PATCH go over the wire (stubbed), and
// the choice is made in a real select.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('pick an object, the form stores its reference in the one Save', async ({ page }) => {
	const wire = { lists: [], patches: [] }
	await page.route('**/apps/openregister/api/objects/portaliq/asset**', (route) => {
		wire.lists.push(decodeURIComponent(route.request().url()))
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [{ id: 'a-1', name: 'Wapen' }, { id: 'a-2', name: 'Woordmerk' }] }) })
	})
	await page.route('**/apps/openregister/api/objects/portaliq/portal/p-1', (route) => {
		if (route.request().method() === 'PATCH') {
			wire.patches.push(route.request().postDataJSON())
		}
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'p-1', ...(wire.patches[0] || {}) }) })
	})
	await page.goto('/?l7=reference-field', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const select = page.locator('[data-testid="cn-settings-form-reference-logo"]')
	await select.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(select.locator('option')).toHaveText(['Geen logo', 'https://www.zuiddrecht.nl/logo.svg', 'Wapen', 'Woordmerk'])
	await expect(select).toHaveValue('https://www.zuiddrecht.nl/logo.svg')
	expect(wire.lists[0]).toContain('kind=logo')
	// The label names the select.
	await expect(page.getByLabel('Logo')).toHaveValue('https://www.zuiddrecht.nl/logo.svg')

	await select.selectOption({ label: 'Woordmerk' })
	expect(wire.patches).toEqual([])
	await page.locator('[data-testid="cn-settings-form-save"]').click()
	await expect.poll(() => wire.patches.length).toBe(1)
	expect(wire.patches[0]).toEqual({ logo: 'openregister://portaliq/asset/a-2' })
})
