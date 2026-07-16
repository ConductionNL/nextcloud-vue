// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A dialog opened from inside another dialog must paint ON TOP of it.
//
// Reported live (twice): "Add schema" opened its editor UNDERNEATH the "Manage data"
// dialog that launched it. The earlier attempt raised both masks to the same z-index,
// which does not fix it — equal z-index falls back to DOM order, and NcDialog teleports
// its mask to <body>, so insertion order is a mount-timing race. Measured on the live
// instance: nested editor at DOM index 641, the parent that opened it at 1143 — the
// parent painted over its own child. A different run produced the opposite order and
// looked fine, which is why the bug kept "coming back".
//
// So the assertion that matters is the ORDER-INDEPENDENT one: the nested mask's
// z-index must be strictly GREATER than the parent's. Asserting only "it looks right"
// would pass on a lucky DOM order and guard nothing.

import { test, expect } from '@playwright/test'

const REGISTER = { id: 1, slug: 'harness-register', title: 'Harness register', schemas: [10] }
const SCHEMA = { id: 10, slug: 'hello-message', title: 'Hello Message', properties: { greeting: { type: 'string' } } }

/**
 * Stub OpenRegister so the real dialog runs against real HTTP responses.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the routes are installed.
 */
async function stubOpenRegister(page) {
	await page.route('**/apps/openregister/api/registers**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify(route.request().method() === 'GET' ? { results: [REGISTER] } : REGISTER),
	}))
	await page.route('**/apps/openregister/api/schemas/**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify(SCHEMA),
	}))
}

/*
 * Both dialogs are found by the NAME the user reads, never by the class the fix
 * happens to add. A test that looks for `.cn-dialog--nested` would only be asserting
 * that its own fix is still present — it would go red if the bug were fixed a
 * different way, and it would never have caught the original tie-on-one-layer bug.
 */
const stackingOf = (page, parentName, nestedName) => page.evaluate(([p, n]) => {
	const masks = [...document.querySelectorAll('.modal-mask')]
	const all = [...document.body.querySelectorAll('*')]
	const read = (name) => {
		const m = masks.find((x) => ((x.querySelector('h2, .dialog__name') || {}).textContent || '').includes(name))
		if (!m) return null
		const dialog = m.querySelector('.dialog, .modal-container') || m
		const box = dialog.getBoundingClientRect()
		return { zIndex: Number(getComputedStyle(m).zIndex), domIndex: all.indexOf(m), box: { x: box.x, y: box.y, w: box.width, h: box.height } }
	}
	const parent = read(p)
	const nested = read(n)
	let topAtNestedCentre = null
	if (nested) {
		const el = document.elementFromPoint(nested.box.x + nested.box.w / 2, nested.box.y + nested.box.h / 2)
		const mask = el && el.closest('.modal-mask')
		topAtNestedCentre = mask ? ((mask.querySelector('h2, .dialog__name') || {}).textContent || '').trim() : null
	}
	return { parent, nested, topAtNestedCentre }
}, [parentName, nestedName])

test.describe('a dialog opened from a dialog stacks above it', () => {
	test('the nested schema editor outranks the dialog that opened it', async ({ page }) => {
		await stubOpenRegister(page)
		await page.goto('/?sd=1')
		await expect(page.locator('.cn-edit-data')).toBeVisible()

		await page.getByRole('button', { name: 'Add schema' }).click()
		await page.waitForFunction(() => document.querySelectorAll('.modal-mask').length >= 2)

		const { parent, nested, topAtNestedCentre } = await stackingOf(page, 'Manage data', 'New schema')
		expect(parent).toBeTruthy()
		expect(nested).toBeTruthy()

		// THE invariant, and the only order-independent one: a shared z-index makes the
		// painting order fall back to DOM order, which for teleported masks is a race.
		expect(nested.zIndex).toBeGreaterThan(parent.zIndex)

		// And the consequence the user actually sees.
		expect(topAtNestedCentre).toContain('New schema')
	})
})
