// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A settings-form `reference` field whose filter names the record being edited
// (?l7=reference-object-filter, harness l7/ReferenceObjectFilter.vue):
// `@objectId` and `@object.organisation` reach OpenRegister as the portal's id
// and organisation, so the logo list is this portal's logos.
//
// WHY PLAYWRIGHT: the claim is the query that goes over the wire from a widget
// mounted the way a detail page mounts it.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the reference list is read with the record\'s id and field in the filter', async ({ page }) => {
	const lists = []
	await page.route('**/apps/openregister/api/objects/portaliq/asset**', (route) => {
		lists.push(new URL(route.request().url()).searchParams)
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [{ id: 'a-1', name: 'Wapen' }] }) })
	})
	await page.goto('/?l7=reference-object-filter', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const select = page.locator('[data-testid="cn-settings-form-reference-logo"]')
	await select.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(select.locator('option')).toHaveText(['Geen logo', 'https://www.zuiddrecht.nl/logo.svg', 'Wapen'])
	expect(lists).toHaveLength(1)
	expect(lists[0].get('kind')).toBe('logo')
	expect(lists[0].get('portal')).toBe('p-1')
	expect(lists[0].get('organisation')).toBe('org-7')
})
