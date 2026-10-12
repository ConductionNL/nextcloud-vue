// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The settings widgets in a browser (abstract-settings-form and its siblings).
// OpenRegister is stubbed with page.route(); the specs assert what goes on the
// wire and what the person sees.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const STORED = {
	id: 'p-1',
	slug: 'zuiddrecht',
	title: 'Gemeente Zuiddrecht',
	tagline: 'Samen maken we Zuiddrecht',
	kind: 'site',
	loginLabel: '',
	pageLimit: 33,
	signup: 'approval',
	signinDigid: true,
	signinEherkenning: false,
	hiddenCaseTypes: ['c3'],
	autoApproveDomains: ['zuiddrecht.nl', 'oosthaven.nl'],
}

/**
 * Stub the portal object: GET answers the stored object, PATCH merges and records the body.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {object[]} patches Collects PATCH bodies.
 * @param {number} [status] Status for PATCH (non-200 refuses).
 */
async function stubPortal(page, patches, status = 200) {
	await page.route('**/apps/openregister/api/objects/portaliq/portal/p-1', async (route) => {
		if (route.request().method() === 'PATCH') {
			const body = route.request().postDataJSON()
			patches.push(body)
			await route.fulfill({
				status,
				contentType: 'application/json',
				body: JSON.stringify(status === 200 ? { ...STORED, ...body } : { error: 'U mag deze portal niet wijzigen.' }),
			})
			return
		}
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STORED) })
	})
}

test('settings form: framed two-column grid, PATCH of the changed fields only, then against the last save', async ({ page }) => {
	const patches = []
	await stubPortal(page, patches)
	await page.goto('/?settingswidgets=form', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const form = page.locator('[data-testid="settings-widgets-harness"] .cn-settings-form')
	await form.waitFor({ state: 'visible', timeout: 60_000 })

	// Two columns: the first two fields share a row.
	const a = await form.locator('[data-testid="cn-settings-form-field-title"]').boundingBox()
	const b = await form.locator('[data-testid="cn-settings-form-field-tagline"]').boundingBox()
	expect(Math.abs(a.y - b.y)).toBeLessThan(2)
	expect(b.x).toBeGreaterThan(a.x + a.width)
	// Framed input: a 1px border and rounded corners.
	const frame = await form.locator('[data-testid="cn-settings-form-field-title"] input').evaluate((el) => {
		const s = getComputedStyle(el)
		return { width: s.borderTopWidth, radius: s.borderTopLeftRadius }
	})
	expect(frame).toEqual({ width: '1px', radius: '8px' })
	await expect(form.locator('[data-testid="cn-settings-form-field-slug"] .cn-settings-form__hint')).toContainText('horen via dit adres')

	await form.locator('[data-testid="cn-settings-form-field-title"] input').fill('Zuiddrecht')
	await form.locator('[data-testid="cn-settings-form-field-pageLimit"] input').fill('50')
	await form.locator('[data-testid="cn-settings-form-save"]').click()
	await expect(form.locator('[data-testid="cn-settings-form-notice"]')).toContainText('De portal is opgeslagen.')
	expect(patches).toEqual([{ title: 'Zuiddrecht', pageLimit: 50 }])

	// Back to the value the page LOADED with: still a change, because the baseline moved on.
	await form.locator('[data-testid="cn-settings-form-field-title"] input').fill('Gemeente Zuiddrecht')
	await form.locator('[data-testid="cn-settings-form-save"]').click()
	await expect.poll(() => patches.length).toBe(2)
	expect(patches[1]).toEqual({ title: 'Gemeente Zuiddrecht' })
})

test('settings form: an invalid value is refused before any write, a refused PATCH shows the server words', async ({ page }) => {
	const patches = []
	await stubPortal(page, patches, 403)
	await page.goto('/?settingswidgets=form', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const form = page.locator('[data-testid="settings-widgets-harness"] .cn-settings-form')
	await form.waitFor({ state: 'visible', timeout: 60_000 })

	await form.locator('[data-testid="cn-settings-form-field-slug"] input').fill('Niet Geldig')
	await form.locator('[data-testid="cn-settings-form-save"]').click()
	await expect(form.locator('[data-testid="cn-settings-form-field-slug"] .cn-settings-form__error')).toContainText('Alleen kleine letters')
	expect(patches).toEqual([])

	await form.locator('[data-testid="cn-settings-form-field-slug"] input').fill('zuiddrecht-2')
	await form.locator('[data-testid="cn-settings-form-save"]').click()
	await expect(form.locator('[data-testid="cn-settings-form-notice"]')).toContainText('U mag deze portal niet wijzigen.')
	expect(patches).toHaveLength(1)
})

test('switch rows: a toggle PATCHes that one field, a refusal puts the switch back', async ({ page }) => {
	const patches = []
	await stubPortal(page, patches)
	await page.goto('/?settingswidgets=switches', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const rows = page.locator('[data-testid="settings-widgets-harness"] .cn-switch-rows')
	await rows.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(rows.locator('.cn-switch-rows__row')).toHaveCount(2)
	await expect(rows).toContainText('Zonder cookies, op de eigen server')
	// Hairline between rows, none above the first.
	expect(await rows.locator('.cn-switch-rows__row').nth(1).evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px')

	const traffic = rows.locator('[data-testid="cn-switch-rows-row-trafficEnabled"] input')
	await expect(traffic).toBeChecked()
	await traffic.click({ force: true })
	await expect.poll(() => patches.length).toBe(1)
	expect(patches[0]).toEqual({ trafficEnabled: false })
	await expect(traffic).not.toBeChecked()

	// Inverted row: showing "on" means installDisabled false; switching off stores true.
	const install = rows.locator('[data-testid="cn-switch-rows-row-installDisabled"] input')
	await expect(install).toBeChecked()
	await install.click({ force: true })
	await expect.poll(() => patches.length).toBe(2)
	expect(patches[1]).toEqual({ installDisabled: true })
})

test('switch rows: a refused PATCH shows the server words and the switch stays as stored', async ({ page }) => {
	await stubPortal(page, [], 403)
	await page.goto('/?settingswidgets=switches', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const rows = page.locator('[data-testid="settings-widgets-harness"] .cn-switch-rows')
	await rows.waitFor({ state: 'visible', timeout: 60_000 })
	const traffic = rows.locator('[data-testid="cn-switch-rows-row-trafficEnabled"] input')
	await traffic.click({ force: true })
	await expect(rows.locator('[data-testid="cn-switch-rows-notice"]')).toContainText('U mag deze portal niet wijzigen.')
	await expect(traffic).toBeChecked()
})

test('radio cards: the stored card is selected, choosing another PATCHes that one field, a refusal puts it back', async ({ page }) => {
	const patches = []
	await stubPortal(page, patches)
	await page.goto('/?settingswidgets=radio', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cards = page.locator('[data-testid="settings-widgets-harness"] .cn-radio-cards')
	await cards.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(cards.locator('.cn-radio-cards__card')).toHaveCount(3)
	// Two columns: the first two cards share a row, the third wraps.
	const first = await cards.locator('[data-testid="cn-radio-cards-option-nobody"]').boundingBox()
	const second = await cards.locator('[data-testid="cn-radio-cards-option-approval"]').boundingBox()
	const third = await cards.locator('[data-testid="cn-radio-cards-option-anyone"]').boundingBox()
	expect(Math.abs(first.y - second.y)).toBeLessThan(2)
	expect(third.y).toBeGreaterThan(first.y + first.height - 1)
	await expect(cards.locator('[data-testid="cn-radio-cards-option-approval"]')).toHaveClass(/cn-radio-cards__card--selected/)
	await expect(cards.locator('[data-testid="cn-radio-cards-option-approval"] input')).toBeChecked()

	await cards.locator('[data-testid="cn-radio-cards-option-anyone"]').click()
	await expect.poll(() => patches.length).toBe(1)
	expect(patches[0]).toEqual({ signup: 'anyone' })
	await expect(cards.locator('[data-testid="cn-radio-cards-option-anyone"]')).toHaveClass(/cn-radio-cards__card--selected/)
})

test('radio cards: a refused PATCH shows the server words and keeps the stored card', async ({ page }) => {
	await stubPortal(page, [], 403)
	await page.goto('/?settingswidgets=radio', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cards = page.locator('[data-testid="settings-widgets-harness"] .cn-radio-cards')
	await cards.waitFor({ state: 'visible', timeout: 60_000 })
	await cards.locator('[data-testid="cn-radio-cards-option-nobody"]').click()
	await expect(cards.locator('[data-testid="cn-radio-cards-notice"]')).toContainText('U mag deze portal niet wijzigen.')
	await expect(cards.locator('[data-testid="cn-radio-cards-option-approval"]')).toHaveClass(/cn-radio-cards__card--selected/)
})

test('chips field: chips with a remove, an add chip that opens an input, a pattern refusal, then one PATCH of the full list', async ({ page }) => {
	const patches = []
	await stubPortal(page, patches)
	await page.goto('/?settingswidgets=chips', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const chips = page.locator('[data-testid="settings-widgets-harness"] .cn-chips-field')
	await chips.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(chips.locator('.cn-chips-field__chip')).toHaveCount(2)
	// A chip is a pill: fully rounded.
	expect(await chips.locator('.cn-chips-field__chip').first().evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(10)

	await chips.locator('[data-testid="cn-chips-field-add"]').click()
	await chips.locator('[data-testid="cn-chips-field-input"]').fill('geen domein')
	await chips.locator('[data-testid="cn-chips-field-submit"]').click()
	await expect(chips.locator('[data-testid="cn-chips-field-error"]')).toContainText('Dit is geen domeinnaam.')
	expect(patches).toEqual([])

	await chips.locator('[data-testid="cn-chips-field-input"]').fill('Nieuw-Stad.nl')
	await chips.locator('[data-testid="cn-chips-field-submit"]').click()
	await expect(chips.locator('.cn-chips-field__chip')).toHaveCount(3)
	expect(patches).toEqual([{ autoApproveDomains: ['zuiddrecht.nl', 'oosthaven.nl', 'nieuw-stad.nl'] }])

	await chips.locator('[data-testid="cn-chips-field-remove-oosthaven.nl"]').click()
	await expect(chips.locator('.cn-chips-field__chip')).toHaveCount(2)
	expect(patches[1]).toEqual({ autoApproveDomains: ['zuiddrecht.nl', 'nieuw-stad.nl'] })
})

test('chips field: a refused PATCH shows the server words and keeps the chips', async ({ page }) => {
	await stubPortal(page, [], 403)
	await page.goto('/?settingswidgets=chips', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const chips = page.locator('[data-testid="settings-widgets-harness"] .cn-chips-field')
	await chips.waitFor({ state: 'visible', timeout: 60_000 })
	await chips.locator('[data-testid="cn-chips-field-remove-zuiddrecht.nl"]').click()
	await expect(chips.locator('[data-testid="cn-chips-field-error"]')).toContainText('U mag deze portal niet wijzigen.')
	await expect(chips.locator('.cn-chips-field__chip')).toHaveCount(2)
})

test('toggle table: sign-in rows with an extra column, each switch PATCHes its own field', async ({ page }) => {
	const patches = []
	await stubPortal(page, patches)
	await page.goto('/?settingswidgets=signin', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const table = page.locator('[data-testid="settings-widgets-harness"] .cn-toggle-table')
	await table.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(table.locator('thead th')).toHaveText(['Inlogwijze', 'Route', 'Aan'])
	await expect(table.locator('[data-testid="cn-toggle-table-row-digid"]')).toContainText('via integriq, de koppeling van de gemeente')
	await expect(table.locator('[data-testid="cn-toggle-table-row-digid"] input')).toBeChecked()
	await expect(table.locator('[data-testid="cn-toggle-table-row-eherkenning"] input')).not.toBeChecked()
	await table.locator('[data-testid="cn-toggle-table-row-eherkenning"] input').click({ force: true })
	await expect.poll(() => patches.length).toBe(1)
	expect(patches[0]).toEqual({ signinEherkenning: true })
})

test('toggle table: rows from a source, a hidden case type reads as off, switching writes the one list field', async ({ page }) => {
	const patches = []
	await stubPortal(page, patches)
	await page.route('**/apps/portaliq/api/case-types*', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [
				{ id: 'c1', name: 'Woo-verzoek', hint: '' },
				{ id: 'c3', name: 'Handhavingszaak', hint: 'Verborgen in dit portaal.' },
			] }),
		})
	})
	await page.goto('/?settingswidgets=casetypes', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const table = page.locator('[data-testid="settings-widgets-harness"] .cn-toggle-table')
	await table.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(table.locator('.cn-toggle-table__row')).toHaveCount(2)
	await expect(table.locator('[data-testid="cn-toggle-table-row-c1"] input')).toBeChecked()
	await expect(table.locator('[data-testid="cn-toggle-table-row-c3"] input')).not.toBeChecked()
	await expect(table.locator('[data-testid="cn-toggle-table-row-c3"]')).toContainText('Verborgen in dit portaal.')
	expect(await table.locator('.cn-toggle-table__row').nth(1).evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px')

	await table.locator('[data-testid="cn-toggle-table-row-c1"] input').click({ force: true })
	await expect.poll(() => patches.length).toBe(1)
	expect(patches[0]).toEqual({ hiddenCaseTypes: ['c3', 'c1'] })
})
