// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// toggle-table-objects-and-map: a settings card of switches, one per object
// (board ShInstellingen "Verplichte velden"). Each switch reads its object's
// own boolean, and flipping one PATCHes that object only.
//
// WHY PLAYWRIGHT: the real NcCheckboxRadioSwitch, a real click, and the real
// list request and PATCH.
//
// @spec openspec/changes/toggle-table-objects-and-map/specs/toggle-table/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const ROWS = [
	{ id: 'fr-1', title: 'Kostenplaats op elke inkoopfactuurregel', reason: 'Nodig voor de budgetbewaking.', active: true },
	{ id: 'fr-2', title: 'Project op declaraties', reason: 'Declaraties worden per project verantwoord.', active: false },
	{ id: 'fr-3', title: 'Referentie van de klant op verkoopfacturen', reason: '', active: true },
]

test('one switch per object, and a toggle writes that object', async ({ page }) => {
	const patches = []
	await page.route('**/apps/openregister/api/objects/**', (route) => {
		const request = route.request()
		if (request.method() === 'PATCH') {
			patches.push({ url: new URL(request.url()).pathname, body: request.postDataJSON() })
			return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...request.postDataJSON() }) })
		}
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: ROWS, total: ROWS.length }) })
	})
	await page.setViewportSize({ width: 1000, height: 700 })
	await page.goto('/?l8=toggle-objects', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="toggle-objects"]')
	const row = (id) => root.locator(`[data-testid="cn-toggle-table-row-${id}"]`)
	const box = (id) => row(id).locator('input[type="checkbox"]')

	await expect(row('fr-1')).toContainText('Kostenplaats op elke inkoopfactuurregel', { timeout: 90_000 })
	await expect(row('fr-2')).toContainText('Declaraties worden per project verantwoord.')
	await expect(box('fr-1')).toBeChecked()
	await expect(box('fr-2')).not.toBeChecked()
	await expect(box('fr-3')).toBeChecked()

	await row('fr-2').locator('.checkbox-radio-switch').click()
	await expect(box('fr-2')).toBeChecked()
	await expect.poll(() => patches.length).toBe(1)
	expect(patches[0].url).toMatch(/\/apps\/openregister\/api\/objects\/shillinq\/FieldRequirement\/fr-2$/)
	expect(patches[0].body).toEqual({ active: true })
})
