// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An index page's built-in Add dialog can ask for `formSize` and `formColumns`.
//
// The unit lane (tests/components/CnFormDialogSizeColumnsForwarding.spec.js)
// proves the two props cross the boundary into CnFormDialog. It cannot prove
// the thing anyone actually wanted, because `columns: 2` is a CSS grid and
// jsdom gives every box a zero-sized rect: whether two fields end up SIDE BY
// SIDE, whether a textarea still spans both, and whether the layout folds back
// to one column on a narrow screen are geometry questions.
//
// This spec asserts geometry. Every assertion below reads a real bounding box
// out of Chromium, so a regression that keeps the class name but breaks the
// grid — a changed `grid-template-columns`, a `display` that stops being grid,
// a media query whose breakpoint moves — fails here and nowhere else.
//
// ⚠️ NOTHING HERE ASSUMES A FIELD ORDER. The dialog sorts its fields, so the
// first draft of this spec paired `title` with `identifier` because that is
// the order the schema declares them in, and failed against a form that
// renders them alphabetically. Every assertion is written against the SET of
// rendered fields instead, which is also what keeps it from breaking the next
// time a field is added to the harness schema.

import { test, expect } from '@playwright/test'

const FORM = '.cn-form-dialog__form'
const FIELD = '.cn-form-dialog__field'
const WIDE = '.cn-form-dialog__field--wide'

/**
 * Open the index page's Add dialog and wait for its form.
 *
 * @param {import('@playwright/test').Page} page The harness page.
 * @return {Promise<void>} Resolves once the form is on screen.
 */
async function openAddForm(page) {
	await page.getByTestId('cn-cta-primary').click()
	await expect(page.locator(FORM)).toBeVisible({ timeout: 10_000 })
	// The select field fetches its options; settle before measuring so a
	// mid-flight height change cannot make two boxes disagree about their row.
	await expect(page.locator(FIELD).first()).toBeVisible()
}

/**
 * Read every rendered field's geometry straight out of the browser.
 *
 * @param {import('@playwright/test').Page} page The harness page.
 * @return {Promise<{form: object, fields: object[]}>} Form box plus one entry
 *   per field, each carrying its rounded rect and whether it is a wide field.
 */
function readLayout(page) {
	return page.evaluate(({ formSel, fieldSel, wideSel }) => {
		const form = document.querySelector(formSel)
		const box = (el) => {
			const r = el.getBoundingClientRect()
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
		}
		return {
			form: { ...box(form), display: getComputedStyle(form).display },
			fields: [...form.querySelectorAll(fieldSel)].map((el) => ({
				...box(el),
				label: (el.textContent || '').trim().split('\n')[0],
				wide: el.matches(wideSel),
			})),
		}
	}, { formSel: FORM, fieldSel: FIELD, wideSel: WIDE })
}

test.describe('CnIndexPage — two-column Add form (real browser)', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 })
		await page.goto('/?twocol=1')
		await expect(page.getByTestId('cn-cta-primary')).toBeVisible({ timeout: 10_000 })
	})

	test('the page declares the two-column form and the grid actually applies', async ({ page }) => {
		await openAddForm(page)

		await expect(page.locator(FORM)).toHaveClass(/cn-form-dialog__form--two-column/)

		// The class alone proves nothing — it is the computed style that lays
		// the fields out, and that is what a broken stylesheet would drop.
		const template = await page.locator(FORM).evaluate((el) => getComputedStyle(el).gridTemplateColumns)
		const { form } = await readLayout(page)

		expect(form.display).toBe('grid')
		// Two tracks, resolved to pixels by the browser, and equal to each other.
		const tracks = template.split(' ').map(Number.parseFloat)
		expect(tracks).toHaveLength(2)
		expect(Math.abs(tracks[0] - tracks[1])).toBeLessThan(2)
	})

	test('the single-line fields occupy exactly two columns', async ({ page }) => {
		await openAddForm(page)
		const { fields } = await readLayout(page)

		const narrow = fields.filter((f) => !f.wide)
		expect(narrow.length).toBeGreaterThan(3)

		const lefts = [...new Set(narrow.map((f) => f.x))].sort((a, b) => a - b)
		expect(lefts).toHaveLength(2)
		// The second column starts past the first column's full width, so the
		// two are genuinely beside each other rather than merely indented.
		expect(lefts[1]).toBeGreaterThan(lefts[0] + narrow[0].width - 4)
	})

	test('fields are paired onto shared rows rather than stacked', async ({ page }) => {
		await openAddForm(page)
		const { fields } = await readLayout(page)

		const narrow = fields.filter((f) => !f.wide)
		const rows = new Map()
		for (const f of narrow) {
			// Round to the nearest 4px so a one-pixel difference in two
			// controls' heights does not read as two separate rows.
			const key = Math.round(f.y / 4)
			rows.set(key, (rows.get(key) || 0) + 1)
		}

		const paired = [...rows.values()].filter((n) => n === 2).length
		expect(paired).toBeGreaterThan(1)
		// And nothing landed in a third column.
		expect(Math.max(...rows.values())).toBe(2)
	})

	test('a textarea still spans both columns', async ({ page }) => {
		await openAddForm(page)
		const { form, fields } = await readLayout(page)

		const wide = fields.filter((f) => f.wide)
		expect(wide).toHaveLength(1)
		expect(wide[0].label).toContain('Description')

		const narrow = fields.filter((f) => !f.wide)
		expect(wide[0].width).toBeGreaterThan(narrow[0].width * 1.5)
		expect(wide[0].width).toBeGreaterThan(form.width - 8)
	})

	test('the layout folds back to one column on a narrow viewport', async ({ page }) => {
		await openAddForm(page)

		// Below the 700px breakpoint the two columns would each be too narrow
		// to hold a label and an input, so the grid stands down.
		//
		// ⚠️ The rule sets `display: block`; it does NOT rewrite
		// `grid-template-columns`, whose computed value stays `1fr 1fr` on a
		// non-grid box. Asserting the track list here passes on a broken
		// breakpoint and fails on a working one.
		await page.setViewportSize({ width: 600, height: 900 })
		await expect
			.poll(async () => (await readLayout(page)).form.display)
			.toBe('block')

		const { fields } = await readLayout(page)
		const narrow = fields.filter((f) => !f.wide)
		const lefts = new Set(narrow.map((f) => f.x))

		// One column: every field starts at the same left edge.
		expect(lefts.size).toBe(1)
	})
})
