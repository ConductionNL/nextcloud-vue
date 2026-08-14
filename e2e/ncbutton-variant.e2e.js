// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec NcButton v8 -> v9 prop migration: the style variant is `variant`, not `type`.
//
// WHY THIS EXISTS IN e2e AND NOT IN THE JEST SUITE.
//
// The jest suite STUBS NcButton, so it renders as <div class="stub NcButton">
// and never produces a real class list. That makes 5652 green unit tests
// structurally incapable of catching this bug: they can assert which prop we
// pass, but not what the component does with it.
//
// @nextcloud/vue 9 derives the styling class from `variant` only —
//     variantWithPressed = computed(() => { ... return props.variant })
// — with `variant` defaulting to "secondary". So the v8 spelling `type="primary"`
// produced a button that looked SECONDARY while the author had asked for primary,
// and put an invalid value on the native `type` attribute as a side effect.
//
// Reading that from NcButton's source is good evidence; seeing the class in a
// real Chromium is proof. That is what this spec adds.
//
// CnWalkthrough is the vehicle because its footer buttons were part of the
// migrated set and the harness already mounts the real component behind ?wt=1.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/?wt=1')
	await expect(page.locator('.cn-walkthrough__card')).toBeVisible({ timeout: 10_000 })
})

test.describe('NcButton variant rendering (real browser)', () => {
	test('a migrated primary button actually carries the primary class', async ({ page }) => {
		const next = page.locator('.cn-walkthrough__actions button', { hasText: 'Next' })
		await expect(next).toBeVisible()

		// The assertion that the stubbed unit suite cannot make.
		await expect(next).toHaveClass(/button-vue--primary/)

		// And the regression it guards: with the v8 spelling this would have been
		// `button-vue--secondary`, because `variant` fell back to its default.
		await expect(next).not.toHaveClass(/button-vue--secondary/)
	})

	test('the native type attribute is a valid ButtonType, not a style name', async ({ page }) => {
		const next = page.locator('.cn-walkthrough__actions button', { hasText: 'Next' })
		const nativeType = await next.getAttribute('type')

		// "primary" here would be an invalid ButtonType. HTML's invalid-value
		// default for <button> is "submit", which is how the v8 spelling turned a
		// plain button into a form-submitting one.
		expect(['button', 'submit', 'reset', null]).toContain(nativeType)
		expect(nativeType).not.toBe('primary')
	})

	test('a migrated secondary button carries the secondary class', async ({ page }) => {
		// Advancing reveals Back, which is variant="secondary" in this component.
		await page.locator('.cn-walkthrough__actions button', { hasText: 'Next' }).click()
		const back = page.locator('.cn-walkthrough__actions button', { hasText: 'Back' })
		await expect(back).toBeVisible()
		await expect(back).toHaveClass(/button-vue--secondary/)
	})

	test('a migrated tertiary button carries the tertiary class', async ({ page }) => {
		// The close X is the tertiary one in this component — not Back, which is
		// secondary. Worth stating: my first draft of this spec asserted tertiary
		// on Back and failed, which is the test doing its job on my own wrong
		// assumption rather than on the code.
		const close = page.locator('.cn-walkthrough__close')
		await expect(close).toBeVisible()
		await expect(close).toHaveClass(/button-vue--tertiary/)
	})
})
