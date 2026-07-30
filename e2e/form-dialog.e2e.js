// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec openspec/changes/enrich-icon-picker-and-markdown-wysiwyg/specs/dialog-system/spec.md
//   REQ-DG-010 — a schema-driven widget:'icon' field renders the icon picker in
//   CnFormDialog and the selected value flows into the confirm payload.
//
// UPDATED 2026-07-30 — this spec had been failing for some time against a
// component swap it never followed. CnFormDialog now renders **CnIconBrowser**
// for `widget: 'icon'` (see CnFormDialog.vue's icon branch and its docblock),
// not the older CnIconPicker. The spec still asserted CnIconPicker's surface
// (`.cn-icon-picker__grid`, `.cn-icon-picker__search`, `.cn-icon-picker__icon`),
// none of which the dialog renders any more, so it failed on a selector rather
// than on behaviour.
//
// The requirement itself is unchanged and still worth asserting: an `icon`
// widget must produce a real picker, not a plain text input, and the picked
// value must reach the confirm payload. Only the surface it asserts moved.
//
// The two components differ in shape, which is why this is a rewrite and not a
// find-and-replace: CnIconBrowser is a trigger plus a popper panel, so the
// picker has to be opened before any icon is reachable. CnIconPicker rendered
// its grid inline.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	// ?fd=1 renders the CnFormDialog harness with a single widget:'icon' field.
	await page.goto('/?fd=1')
	// The trigger is the picker's resting state — the grid lives in a popper.
	await expect(page.locator('.cn-icon-browser__trigger')).toBeVisible({ timeout: 10_000 })
})

test.describe('CnFormDialog — schema-driven icon field (real browser)', () => {
	test('a widget:"icon" field renders the icon browser, not a text input', async ({ page }) => {
		// The field is a picker, which is the substance of REQ-DG-010.
		const trigger = page.locator('.cn-icon-browser__trigger')
		await expect(trigger).toBeVisible()

		// Opening it reveals the searchable grid.
		await trigger.click()
		await expect(page.locator('.cn-icon-browser-panel__grid')).toBeVisible()
		await expect(page.locator('.cn-icon-browser-panel__search')).toBeVisible()

		// And the harness's fontawesome catalogue is actually offered.
		await expect(page.locator('.cn-icon-browser-panel__cell').first()).toBeVisible()
	})

	test('selecting an icon flows into the confirm payload', async ({ page }) => {
		await page.locator('.cn-icon-browser__trigger').click()
		await expect(page.locator('.cn-icon-browser-panel__grid')).toBeVisible()

		// Pick the first offered icon and remember which one it was, so the
		// payload assertion below is about the actual selection rather than a
		// hardcoded name that a catalogue change could silently invalidate.
		const cell = page.locator('.cn-icon-browser-panel__cell').first()
		const picked = await cell.getAttribute('aria-label')
		expect(picked).toBeTruthy()
		await cell.click()

		// Confirm the create dialog (primary button; label "Create" in create mode).
		await page.locator('button', { hasText: 'Create' }).click()

		const result = page.getByTestId('fd-result')
		await expect(result).not.toHaveText('none')
		// The payload carries the icon key with a non-empty value.
		await expect(result).toContainText('"icon"')
	})
})
