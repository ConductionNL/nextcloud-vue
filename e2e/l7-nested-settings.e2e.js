// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Settings widgets with a nested field path and a `save` endpoint
// (?l7=nested-settings, harness l7/NestedSettings.vue). OpenRegister and the
// app endpoint are stubbed with page.route(); the specs assert what goes on the
// wire: a nested leaf is written as the whole enclosing top-level object,
// re-read first, so a sibling changed elsewhere in the meantime is kept.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Stub the portal. The server holds an `authentication` object with one more
 * sibling (`registration.contact`) than the page loaded with.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {object} wire Collects `patches` and `puts`.
 */
async function stub(page, wire) {
	const server = {
		id: 'p-1',
		slug: 'zuiddrecht',
		title: 'Gemeente Zuiddrecht',
		authentication: {
			registration: { policy: 'approval', allowedDomains: ['zuiddrecht.nl'], notify: true, contact: 'secretariaat@zuiddrecht.nl' },
			methods: { digid: true },
		},
	}
	await page.route('**/apps/openregister/api/objects/portaliq/portal/p-1', async (route) => {
		if (route.request().method() === 'PATCH') {
			const body = route.request().postDataJSON()
			wire.patches.push(body)
			Object.assign(server, body)
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(server) })
			return
		}
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(server) })
	})
	await page.route('**/apps/portaliq/api/portals/zuiddrecht/signin', async (route) => {
		wire.puts.push({ method: route.request().method(), body: route.request().postDataJSON() })
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
	})
}

test('radio cards: a nested policy PATCHes the enclosing object with the sibling the server holds', async ({ page }) => {
	const wire = { patches: [], puts: [] }
	await stub(page, wire)
	await page.goto('/?l7=nested-settings', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cards = page.locator('[data-testid="nested-settings"] .cn-radio-cards')
	await cards.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(cards.locator('[data-testid="cn-radio-cards-option-approval"] input')).toBeChecked()
	await cards.locator('[data-testid="cn-radio-cards-option-open"] input').click({ force: true })
	await expect.poll(() => wire.patches.length).toBe(1)
	expect(wire.patches[0]).toEqual({
		authentication: {
			registration: { policy: 'open', allowedDomains: ['zuiddrecht.nl'], notify: true, contact: 'secretariaat@zuiddrecht.nl' },
			methods: { digid: true },
		},
	})
	await expect(cards.locator('[data-testid="cn-radio-cards-option-open"] input')).toBeChecked()
})

test('chips field: a nested list is read by path and written as the enclosing object', async ({ page }) => {
	const wire = { patches: [], puts: [] }
	await stub(page, wire)
	await page.goto('/?l7=nested-settings', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const chips = page.locator('[data-testid="nested-settings"] .cn-chips-field').first()
	await chips.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(chips).toContainText('zuiddrecht.nl')
	await chips.getByRole('button', { name: /Domein/ }).click()
	await chips.locator('input').fill('Oosthaven.NL')
	await chips.getByRole('button', { name: 'Toevoegen' }).click()
	await expect.poll(() => wire.patches.length).toBe(1)
	expect(wire.patches[0].authentication.registration.allowedDomains).toEqual(['zuiddrecht.nl', 'oosthaven.nl'])
	expect(wire.patches[0].authentication.registration.contact).toBe('secretariaat@zuiddrecht.nl')
})

test('settings form: a nested leaf and a top-level field go out as one PATCH', async ({ page }) => {
	const wire = { patches: [], puts: [] }
	await stub(page, wire)
	await page.goto('/?l7=nested-settings', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const form = page.locator('[data-testid="nested-settings"] .cn-settings-form').first()
	await form.waitFor({ state: 'visible', timeout: 60_000 })
	await form.locator('[data-testid="cn-settings-form-field-authentication.registration.policy"] select').selectOption('closed')
	await form.locator('[data-testid="cn-settings-form-field-title"] input').fill('Zuiddrecht')
	await form.locator('[data-testid="cn-settings-form-save"]').click()
	await expect.poll(() => wire.patches.length).toBe(1)
	expect(wire.patches[0].title).toBe('Zuiddrecht')
	expect(wire.patches[0].authentication.registration.policy).toBe('closed')
	expect(wire.patches[0].authentication.registration.contact).toBe('secretariaat@zuiddrecht.nl')
})

test('switch rows: a save template writes through the app endpoint, not the object', async ({ page }) => {
	const wire = { patches: [], puts: [] }
	await stub(page, wire)
	await page.goto('/?l7=nested-settings', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const rows = page.locator('[data-testid="nested-settings"] .cn-switch-rows')
	await rows.waitFor({ state: 'visible', timeout: 60_000 })
	const digid = rows.locator('[data-testid="cn-switch-rows-row-authentication.methods.digid"] input')
	await expect(digid).toBeChecked()
	await digid.click({ force: true })
	await expect.poll(() => wire.puts.length).toBe(1)
	expect(wire.puts[0]).toEqual({ method: 'PUT', body: { method: 'authentication.methods.digid', enabled: false } })
	expect(wire.patches).toEqual([])
})

test('settings form: a default is shown and written, a chips field joins the one Save and keeps its minimum', async ({ page }) => {
	const wire = { patches: [], puts: [] }
	await stub(page, wire)
	await page.goto('/?l7=nested-settings', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const form = page.locator('[data-testid="nested-settings"] .cn-settings-form').nth(1)
	await form.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(form.locator('[data-testid="cn-settings-form-field-headerVariant"] select')).toHaveValue('double')
	await expect(form.locator('.cn-chips-field__chip')).toHaveCount(1)
	// The last language cannot be removed: the message shows, nothing is sent.
	await form.locator('[data-testid="cn-chips-field-remove-nl"]').click()
	await expect(form.locator('[data-testid="cn-chips-field-error"]')).toContainText('Kies minstens een taal.')
	await expect(form.locator('.cn-chips-field__chip')).toHaveCount(1)
	expect(wire.patches).toEqual([])
	// Adding a chip sends nothing; Save writes the default and the list together.
	await form.locator('[data-testid="cn-chips-field-add"]').click()
	await form.locator('[data-testid="cn-chips-field-input"]').selectOption('en')
	await form.locator('[data-testid="cn-chips-field-submit"]').click()
	expect(wire.patches).toEqual([])
	await form.locator('[data-testid="cn-settings-form-save"]').click()
	await expect.poll(() => wire.patches.length).toBe(1)
	expect(wire.patches[0]).toEqual({ headerVariant: 'double', locales: ['nl', 'en'] })
})
