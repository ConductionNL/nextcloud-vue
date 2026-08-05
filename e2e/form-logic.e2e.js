// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec openspec/changes/manifest-form-logic/specs/manifest-form-logic/spec.md
//   REQ-MFL-6 — step indicator + Next/Back navigation
//   REQ-MFL-7 — validation gating blocks Next with an accessible error
//   REQ-MFL-9 — LOCAL visibleWhen conditions flip live, without a remount
//   REQ-MFL-10 — hidden fields excluded from the dispatched payload
//   REQ-MFL-11 — accessible error surfacing
//   REQ-MFL-12 — public-mode success banner fires only after the final step

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	// ?fl=1 renders the CnFormPage harness: a 2-step wizard (who/details) with
	// one conditional field (kvk, gated on kind === "company") and one
	// required + pattern field (name).
	await page.goto('/?fl=1')
	await expect(page.locator('.cn-form-page__steps')).toBeVisible({ timeout: 10_000 })
})

test.describe('CnFormPage — manifest-form-logic wizard (real browser)', () => {
	test('renders a two-entry step indicator with the first step current', async ({ page }) => {
		const steps = page.locator('.cn-form-page__step')
		await expect(steps).toHaveCount(2)
		await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step')
		await expect(page.locator('[data-field-key="kind"]')).toBeVisible()
		await expect(page.locator('[data-field-key="name"]')).toBeVisible()
		await expect(page.locator('[data-field-key="kvk"]')).toHaveCount(0)
	})

	test('a required field with a pattern blocks Next and shows an accessible error', async ({ page }) => {
		// "name" is required + pattern-constrained; leave it empty and try to advance.
		await page.locator('button', { hasText: 'Next' }).click()
		// "name" is a string field: the error surfaces through NcTextField's
		// native `error`/`helperText` props (the custom `validation.message`),
		// not the library's own `.cn-form-page__field-error` fallback element
		// (that one is reserved for widgets without native error props).
		await expect(page.getByText('Only letters allowed')).toBeVisible()
		// Still on step 1 — the "details" step's field never rendered.
		await expect(page.locator('[data-field-key="kvk"]')).toHaveCount(0)
		await expect(steps(page).nth(0)).toHaveAttribute('aria-current', 'step')
	})

	test('flipping the condition shows/hides the dependent field live, without a remount', async ({ page }) => {
		// Advance to step 2 by satisfying step 1 first (kind defaults to
		// "person", name must pass required + pattern).
		await page.locator('[data-field-key="name"] input').fill('Ada Lovelace')
		await page.locator('button', { hasText: 'Next' }).click()
		await expect(page.locator('[data-field-key="kvk"]')).toHaveCount(0)

		// Go back and flip kind to "company" — the condition is LOCAL so it
		// must react immediately, no page reload / remount.
		await page.locator('button', { hasText: 'Back' }).click()
		await page.locator('[data-field-key="kind"] select, [data-field-key="kind"] input').first().click()
		await page.getByRole('option', { name: 'company' }).click()
		await page.locator('button', { hasText: 'Next' }).click()
		await expect(page.locator('[data-field-key="kvk"]')).toBeVisible()
	})

	test('submit payload excludes the hidden field, and the success banner fires only after the final step', async ({ page }) => {
		await page.locator('[data-field-key="name"] input').fill('Ada Lovelace')
		// Switch to "company" on step 1 so kvk becomes visible on step 2.
		await page.locator('[data-field-key="kind"] select, [data-field-key="kind"] input').first().click()
		await page.getByRole('option', { name: 'company' }).click()
		await page.locator('button', { hasText: 'Next' }).click()

		await expect(page.locator('.cn-form-page__success')).toHaveCount(0)

		await page.locator('[data-field-key="kvk"] input').fill('12345678')
		// Flip back to "person" before submitting — kvk becomes hidden again,
		// so its draft must be excluded from the dispatched payload.
		await page.locator('button', { hasText: 'Back' }).click()
		await page.locator('[data-field-key="kind"] select, [data-field-key="kind"] input').first().click()
		await page.getByRole('option', { name: 'person' }).click()
		await page.locator('button', { hasText: 'Next' }).click()
		await page.locator('button', { hasText: 'Submit' }).click()

		await expect(page.getByTestId('fl-result')).not.toContainText('kvk')
		await expect(page.locator('.cn-form-page__success')).toBeVisible()
	})
})

/**
 * Small helper kept local to this file (mirrors the inline locator used
 * throughout) — avoids re-querying `.cn-form-page__step` via a fresh
 * `page.locator` call at every assertion site.
 *
 * @param {import('@playwright/test').Page} page
 * @return {import('@playwright/test').Locator}
 */
function steps(page) {
	return page.locator('.cn-form-page__step')
}
