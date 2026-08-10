// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An NcSelect's options must be clickable when the select is inside a dialog.
//
// `NcSelect.appendToBody` defaults to TRUE, so vue-select teleports its menu out
// of the dialog and makes it a <body> sibling, leaving the dialog's stacking
// context entirely. @nextcloud/vue gives that menu `--vs-dropdown-z-index: 9999`.
//
// Stock NcModal masks sit at 9998, so 9999 clears them and the combination works
// upstream. THIS library raises every dialog mask to 10005 (the unscoped
// `.modal-mask.dialog__modal` rule shipped from CnEditDataModal) — which
// silently inverts the stacking and paints the dialog over its own dropdown. The
// options render, they are visible, and every click on them is swallowed by the
// mask.
//
// Reported live on pipelinq (#757); a real user hits this, not just Playwright.
//
// WHY THE HARNESS HAS TO DROP ONE UPSTREAM STYLESHEET
// ---------------------------------------------------
// @nextcloud/vue v8 already ships the rescue this fix adopts —
// `.vs__dropdown-menu--floating { z-index: 100001 !important }` — but it lives
// inside NcDateTimePicker's OWN stylesheet chunk. An app therefore gets it only
// if it happens to load that component's CSS.
//
// This harness does load it (it mounts CnSchemaFormDialog, which pulls the
// picker in), so with that sheet active the bug cannot reproduce here at all —
// measured: the menu computes to 100001 and every assertion below passes with
// the defect fully present. pipelinq's BUILT bundle does not carry the rule
// (`--vs-dropdown-z-index: 1000`/`9999` against a 10005 mask, and no z-index on
// `--floating` anywhere), which is why the bug is real there.
//
// So each test disables that one upstream sheet, reproducing a consumer that
// does not load NcDateTimePicker's CSS. It is emulating pipelinq's measured
// condition, not manufacturing a failure — and it is precisely the accident
// that makes this bug look intermittent across apps, which is why the rule
// belongs in our own patches.css where every consumer gets it.

import { test, expect } from '@playwright/test'

const HARNESS = '/?selz=1'

/**
 * Disable the `.vs__dropdown-menu--floating` z-index rule that arrives with
 * NcDateTimePicker's stylesheet, leaving this library's own patches.css rule
 * (whichever way it is delivered) untouched.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<number>} How many stylesheets were disabled.
 */
async function dropDateTimePickerStylesheet(page) {
	return page.evaluate(() => {
		let disabled = 0
		for (const ss of document.styleSheets) {
			const id = ss.ownerNode?.getAttribute?.('data-vite-dev-id') || ss.href || ''
			if (id.includes('NcDateTimePicker')) {
				ss.disabled = true
				disabled++
			}
		}
		return disabled
	})
}

test.describe('NcSelect inside a dialog', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(HARNESS)
		const dropped = await dropDateTimePickerStylesheet(page)
		// If this ever reaches 0 the emulation silently stopped working and the
		// tests below would be measuring the rescued state, i.e. passing for the
		// wrong reason.
		expect(dropped).toBeGreaterThan(0)
	})

	test('an option can actually be clicked, and it selects', async ({ page }) => {
		await expect(page.locator('.modal-mask')).toBeVisible()
		await page.locator('.vs__dropdown-toggle').click()

		const option = page.getByRole('option', { name: 'Banana' })
		await expect(option).toBeVisible()

		// The real assertion. Playwright's actionability check hit-tests the
		// point it is about to click, so a mask painted over the option fails
		// here with "intercepts pointer events" — exactly what a user's mouse
		// experiences. No force:true: forcing the click would bypass the very
		// condition under test and make this spec unable to fail.
		await option.click({ timeout: 5000 })

		// And the click has to have MEANT something.
		await expect(page.getByTestId('selz-value')).toHaveText('Banana')
	})

	test('the dropdown paints above the dialog mask', async ({ page }) => {
		await page.locator('.vs__dropdown-toggle').click()
		await expect(page.getByRole('option', { name: 'Banana' })).toBeVisible()

		// Order-independent structural check, in the spirit of
		// nested-dialog-stacking: read both computed layers and compare them,
		// rather than asserting a magic number that a later change to the modal
		// baseline would make wrong without making it unsafe.
		const layers = await page.evaluate(() => {
			const z = (sel) => {
				const el = document.querySelector(sel)
				return el ? Number(getComputedStyle(el).zIndex) : null
			}
			return { menu: z('.vs__dropdown-menu'), mask: z('.modal-mask') }
		})

		expect(layers.menu).not.toBeNull()
		expect(layers.mask).not.toBeNull()
		expect(layers.menu).toBeGreaterThan(layers.mask)
	})

	// Discriminating control: the same option, the same component, with the
	// dialog's mask taken out of the way. pipelinq's `pos-money` clicks
	// `.vs__dropdown-option` in three PASSING tests for exactly this reason —
	// those selects are on a page rather than in a dialog. If this ever fails
	// too, the fault is in the select or the harness, not in the stacking.
	test('control: the same option is clickable with no dialog above it', async ({ page }) => {
		await page.evaluate(() => {
			// `setProperty(..., 'important')`, not `style.zIndex = '0'`: on this
			// line the mask's 10005 is itself `!important`, so a plain inline
			// value loses the cascade and the mask stays on top — which would
			// make this "control" fail for the very reason it exists to rule out.
			document.querySelectorAll('.modal-mask').forEach((m) => {
				m.style.setProperty('z-index', '0', 'important')
			})
		})
		await page.locator('.vs__dropdown-toggle').click()
		await page.getByRole('option', { name: 'Cherry' }).click({ timeout: 5000 })
		await expect(page.getByTestId('selz-value')).toHaveText('Cherry')
	})
})
