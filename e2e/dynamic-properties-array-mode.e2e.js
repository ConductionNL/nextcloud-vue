// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Array-mode dynamic properties must reach the parent's SAVED PAYLOAD.
//
// A schema can declare `x-openregister-extends-form`, letting records of a
// definitions schema add fields to a form at runtime. `values.mode: 'array'`
// stores those answers on the parent object rather than as one child record
// each, so the whole record saves in ONE write.
//
// WHY PLAYWRIGHT AND NOT JEST
// ---------------------------
// The fold happens between the dialog's confirm and the store's POST, and what
// matters is what the browser actually sends. A unit test can assert that the
// array BUILDER returns the right shape (and one does), but it cannot show that
// the array survives into the request body. The failure this guards against is
// precisely a silent one: answers collected, form closed, nothing saved, no
// error. Reading the real request is the only assertion that fails on that.

import { test, expect } from '@playwright/test'

const URL = '/?arr=1'

// CnActionButtons pulls the form dialog and the object store, so vite's first
// on-demand compile of this entry is slow. Serial, with a longer budget.
test.describe.configure({ mode: 'serial', timeout: 120_000 })

const SCHEMA = {
	id: 'case',
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title' },
		caseType: {
			type: 'string',
			title: 'Case type',
			enum: ['ct-1'],
			'x-openregister-extends-form': {
				definitions: { schema: 'propertyDefinition', filter: { caseType: '$value' } },
				map: { title: 'name', type: 'propertyType', required: 'isRequired' },
				values: {
					mode: 'array',
					arrayKey: 'properties',
					definitionRef: 'propertyDefinition',
					nameKey: 'name',
					valueKey: 'value',
				},
			},
		},
	},
}

const DEFINITIONS = [
	{ id: 'def-1', name: 'plafond', propertyType: 'string', isRequired: false },
	{ id: 'def-2', name: 'targetGroup', propertyType: 'string', isRequired: false },
]

/**
 * Stub every OpenRegister call the action makes, and capture what it POSTs.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {object[]} saved Array the captured POST bodies are pushed into.
 * @return {Promise<void>} Resolves once the routes are installed.
 */
async function stubOpenRegister(page, saved) {
	// ORDER MATTERS, and it is the opposite of what it looks like. Playwright
	// checks route handlers NEWEST FIRST, so a catch-all registered last wins
	// over every specific route above it. Registered last, `**/openregister/**`
	// answered the schema fetch with an empty envelope and the dialog rendered
	// with no fields at all — a dialog that opens and looks fine.
	// So: broadest first, most specific last.
	await page.route('**/apps/openregister/**', (route) => route.fulfill({
		status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }),
	}))

	await page.route('**/apps/openregister/api/objects/**', (route) => {
		const req = route.request()
		if (req.method() === 'POST' || req.method() === 'PUT') {
			let body = null
			try {
				body = JSON.parse(req.postData() || '{}')
			} catch (e) {
				body = null
			}
			saved.push({ url: req.url(), body, raw: req.postData() })
			return route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ id: 'case-1', ...(body || {}) }),
			})
		}
		const isDefs = /propertydefinition/i.test(req.url())
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(isDefs ? { results: DEFINITIONS } : { results: [] }),
		})
	})

	// `/api/schemas/case?register=…` is a SINGLE-schema fetch: the store uses
	// the parsed body AS the schema, so it must not be wrapped in an envelope.
	await page.route('**/apps/openregister/api/schemas/**', (route) => route.fulfill({
		status: 200, contentType: 'application/json', body: JSON.stringify(SCHEMA),
	}))
}

/**
 * Pick the one case type the harness schema offers.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {import('@playwright/test').Locator} dialog The open dialog.
 * @return {Promise<void>} Resolves once the selection is made.
 */
async function selectCaseType(page, dialog) {
	const select = dialog.locator('select').first()
	if (await select.count() > 0) {
		await select.selectOption({ index: 1 })
		return
	}
	// vue-select splits an option label across spans, so match a substring
	// rather than the full accessible name.
	await dialog.locator('.vs__search, input[role="combobox"]').first().click()
	await page.locator('.vs__dropdown-option', { hasText: 'ct-1' }).first().click()
}

test.describe('dynamic properties, array mode', () => {
	test('the dialog opens with the case type field (precondition)', async ({ page }) => {
		// A spec that never opens the dialog can pass while nothing works at
		// all. The first version of this file asserted "at most one POST" and
		// went green on ZERO, having never submitted anything.
		const saved = []
		await stubOpenRegister(page, saved)
		await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
		await page.getByRole('button', { name: /New case/i }).click()

		const dialog = page.locator('.modal-container, [role="dialog"]').first()
		await expect(dialog, 'the open-form action should mount the dialog').toBeVisible({ timeout: 30_000 })
		await expect(dialog).toContainText(/Case type/i, { timeout: 15_000 })
	})

	test('choosing a case type adds the definitions as fields', async ({ page }) => {
		const saved = []
		await stubOpenRegister(page, saved)
		await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
		await page.getByRole('button', { name: /New case/i }).click()
		const dialog = page.locator('.modal-container, [role="dialog"]').first()
		await expect(dialog).toBeVisible({ timeout: 30_000 })

		await selectCaseType(page, dialog)

		// The extension only means anything if the definitions actually become
		// fields. Without this the save assertion below could pass by saving a
		// case with no answers on it.
		await expect(dialog, 'the caseType definitions should render as fields')
			.toContainText(/plafond/i, { timeout: 20_000 })
	})

	test('the answers reach the saved payload as an array on the case', async ({ page }) => {
		const saved = []
		await stubOpenRegister(page, saved)
		await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
		await page.getByRole('button', { name: /New case/i }).click()
		const dialog = page.locator('.modal-container, [role="dialog"]').first()
		await expect(dialog).toBeVisible({ timeout: 30_000 })

		await selectCaseType(page, dialog)
		await expect(dialog).toContainText(/plafond/i, { timeout: 20_000 })

		// Fill the first dynamic field, whatever input it resolved to.
		const dynamicInput = dialog.locator('input[type="text"], textarea').last()
		await dynamicInput.fill('50000')

		await dialog.getByRole('button', { name: /^(Save|Create|Confirm|Opslaan)/i }).first().click()

		await expect.poll(() => saved.length, { timeout: 30_000 }).toBeGreaterThan(0)

		const post = saved[0].body
		// THE ASSERTION THAT MATTERS. Array mode means the answers travel on the
		// parent, in this one write. If they were still going out as child rows
		// this key would be absent and a second POST would follow.
		expect(post, 'the case payload should carry its answers').toHaveProperty('properties')
		expect(Array.isArray(post.properties)).toBe(true)
		expect(post.properties.length).toBeGreaterThan(0)
		expect(post.properties[0]).toHaveProperty('propertyDefinition')
		expect(post.properties[0]).toHaveProperty('name')
		expect(post.properties[0]).toHaveProperty('value')
		expect(saved.length, 'array mode should be ONE write, not a second for the answers').toBe(1)
	})
})
