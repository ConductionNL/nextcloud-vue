// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An NcSelect's options must be clickable when the select is inside a dialog.
//
// `NcSelect.appendToBody` defaults to TRUE, so vue-select teleports its menu out
// of the dialog and makes it a <body> sibling, positioned with inline top/left.
// @nextcloud/vue gives that menu `--vs-dropdown-z-index: 9999`.
//
// Stock NcModal masks sit at 9998, so 9999 clears them and the combination works
// upstream. THIS library raises every dialog mask to 10005 (the unscoped
// `.modal-mask.dialog__modal` rule) — which silently inverts the stacking and
// paints the dialog over its own dropdown. The options render, they are visible,
// and every click on them is swallowed by the mask.
//
// Reported live on pipelinq (#757); a real user hits this, not just Playwright.
//
// The assertion that matters is on the OPTION, not on the menu: the menu was
// always in the DOM and always "visible" — asserting `toBeVisible()` on it
// passes with the bug fully present. What fails is the click landing, and the
// selection changing as a result.
//
// The first hypothesis on pipelinq was to pass `append-to-body` explicitly. That
// would have been a silent no-op — it is already the default. Checking the built
// bundle is what caught it, so this spec asserts behaviour rather than props.

import { test, expect } from '@playwright/test'

const HARNESS = '/?selz=1'

test.describe('NcSelect inside a dialog', () => {
	test('an option can actually be clicked, and it selects', async ({ page }) => {
		await page.goto(HARNESS)

		const dialog = page.locator('.modal-mask')
		await expect(dialog).toBeVisible()

		// Open the dropdown.
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
		await page.goto(HARNESS)
		await page.locator('.vs__dropdown-toggle').click()
		await expect(page.getByRole('option', { name: 'Banana' })).toBeVisible()

		// Order-independent structural check, in the spirit of
		// nested-dialog-stacking: read both computed layers and compare them,
		// rather than asserting a specific magic number that a later change to
		// the modal baseline would make wrong without making it unsafe.
		const layers = await page.evaluate(() => {
			const menu = document.querySelector('.vs__dropdown-menu')
			const mask = document.querySelector('.modal-mask')
			const z = (el) => (el ? Number(getComputedStyle(el).zIndex) : null)
			return { menu: z(menu), mask: z(mask) }
		})

		expect(layers.menu).not.toBeNull()
		expect(layers.mask).not.toBeNull()
		expect(layers.menu).toBeGreaterThan(layers.mask)
	})

	// Discriminating control: the same option, the same component, OUTSIDE a
	// dialog. pipelinq's `pos-money` clicks `.vs__dropdown-option` in three
	// PASSING tests for exactly this reason. If this one ever fails too, the
	// fault is in the select or the harness, not in the dialog stacking — which
	// keeps the two specs above from being read as evidence for the wrong cause.
	test('control: an option outside a dialog was always clickable', async ({ page }) => {
		await page.goto('/?selz=1&nodialog=1')
		await page.evaluate(() => {
			// Drop the mask so the select is on a bare page; nothing else changes.
			document.querySelectorAll('.modal-mask').forEach((m) => { m.style.zIndex = '0' })
		})
		await page.locator('.vs__dropdown-toggle').click()
		await page.getByRole('option', { name: 'Cherry' }).click({ timeout: 5000 })
		await expect(page.getByTestId('selz-value')).toHaveText('Cherry')
	})
})
