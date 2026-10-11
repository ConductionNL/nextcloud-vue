// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The help line under a form field, measured in a real browser. jsdom lays
// out nothing, so where a line starts against the control above it cannot be
// judged there.
//
// Found in the round-6 cloud check of pipelinq's contact dialog: under every
// plain text input the help line started 6px above the input's bottom edge,
// so its top was hidden behind the input. Under selects it sat correctly. The
// board look makes inputs 40px tall inside NcTextField's 34px wrapper; the
// help line follows the wrapper, not the input.
//
// @spec openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-help-text-starts-below-every-input

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

/**
 * For every help line in the dialog: where it starts, and where the control
 * above it ends.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<Array<{text: string, kind: string, helperTop: number, controlBottom: number}>>} The measurements.
 */
async function measure(page) {
	return page.evaluate(() => [...document.querySelectorAll('.cn-field-helper')].map((helper) => {
		const holder = helper.previousElementSibling
		const control = holder.querySelector('input, textarea, .vs__dropdown-toggle') || holder
		return {
			text: helper.textContent.trim(),
			kind: control.classList.contains('vs__dropdown-toggle') ? 'select' : control.tagName.toLowerCase(),
			helperTop: helper.getBoundingClientRect().top,
			controlBottom: control.getBoundingClientRect().bottom,
		}
	}))
}

for (const look of ['board', 'nextcloud']) {
	for (const colorScheme of ['light', 'dark']) {
		test(`help text starts below every control (${look} look, ${colorScheme})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme })
			await page.goto(look === 'board' ? '/?fieldhint=1' : '/?fieldhint=1&plain=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
			await page.locator('.cn-field-helper').first().waitFor({ state: 'visible', timeout: 60_000 })

			const lines = await measure(page)
			// Text, e-mail, number and the select: four help lines, or this
			// measured less than it claims.
			expect(lines.map((l) => l.kind).sort()).toEqual(['input', 'input', 'input', 'select'])

			for (const line of lines) {
				// 🔴 THE DEFECT: in the board look the help line under an input
				// started 6px above the input's bottom edge.
				expect(line.helperTop, `"${line.text}" starts above its ${line.kind}`).toBeGreaterThanOrEqual(line.controlBottom)
				// And it still belongs to its field: no wide gap either.
				expect(line.helperTop - line.controlBottom, `"${line.text}" drifted from its ${line.kind}`).toBeLessThanOrEqual(12)
			}
		})
	}
}

test('a description shows once: as the help line, not also as the placeholder', async ({ page }) => {
	await page.goto('/?fieldhint=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('.cn-field-helper').first().waitFor({ state: 'visible', timeout: 60_000 })

	await expect(page.locator('.cn-field-helper', { hasText: 'Job title or role within the organisation' })).toBeVisible()
	const placeholders = await page.locator('.cn-form-dialog__field input').evaluateAll((inputs) => inputs.map((i) => i.getAttribute('placeholder') || ''))
	expect(placeholders).not.toContain('Job title or role within the organisation')
})
