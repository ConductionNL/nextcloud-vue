// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The field-list widget in a browser (abstract-field-list): rows, a real add
// through the form with the one-field PATCH on the wire, and a refusal shown in
// the server's words. OpenRegister is stubbed with page.route().

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const STORED = {
	id: 'p-1',
	slug: 'zuiddrecht',
	editors: [
		{ userId: 'pieter', displayName: 'Pieter Jansen', role: 'chief-editor' },
		{ userId: 'anouk', displayName: 'Anouk Bakker', role: 'editor' },
	],
}

test('rows, an add that PATCHes only the editors field, and a hairline between rows', async ({ page }) => {
	const patches = []
	await page.route('**/apps/openregister/api/objects/portaliq/portal/p-1', async (route) => {
		if (route.request().method() === 'PATCH') {
			const body = route.request().postDataJSON()
			patches.push(body)
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...STORED, ...body }) })
			return
		}
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STORED) })
	})
	await page.goto('/?fieldlist=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const widget = page.locator('[data-testid="field-list-harness"] .cn-field-list-widget')
	await widget.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(page.locator('[data-testid="field-list-harness"]')).toContainText('Beheerders')
	await expect(widget.locator('.cn-field-list-widget__row')).toHaveCount(2)
	await expect(widget.locator('[data-testid="cn-field-list-row-pieter"] .cn-field-list-widget__meta')).toHaveText('Hoofdredacteur')

	const second = widget.locator('.cn-field-list-widget__row').nth(1)
	expect(await second.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px')

	await widget.locator('[data-testid="cn-field-list-input-userId"] input').fill('lars')
	await widget.locator('[data-testid="cn-field-list-submit"]').click()
	await expect(widget.locator('.cn-field-list-widget__row')).toHaveCount(3)
	expect(patches).toEqual([{ editors: [...STORED.editors, { userId: 'lars' }] }])
})

test('a refused PATCH shows the server words and keeps the rows', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/portaliq/portal/p-1', async (route) => {
		if (route.request().method() === 'PATCH') {
			await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'U mag deze portal niet wijzigen.' }) })
			return
		}
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STORED) })
	})
	await page.goto('/?fieldlist=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const widget = page.locator('[data-testid="field-list-harness"] .cn-field-list-widget')
	await widget.waitFor({ state: 'visible', timeout: 60_000 })
	await widget.locator('[data-testid="cn-field-list-remove-anouk"]').click()
	await expect(widget.locator('[data-testid="cn-field-list-notice"]')).toContainText('U mag deze portal niet wijzigen.')
	await expect(widget.locator('.cn-field-list-widget__row')).toHaveCount(2)
})
