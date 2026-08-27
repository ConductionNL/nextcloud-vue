// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec openspec/changes/enrich-icon-picker-and-markdown-wysiwyg/specs/dialog-system/spec.md
//   REQ-DG-010 — schema-driven widget:'icon' renders CnIconPicker in CnFormDialog
//   and the selected value flows into the confirm payload.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	// ?fd=1 renders the CnFormDialog harness with a single widget:'icon' field.
	await page.goto('/?fd=1')
	await expect(page.locator('.cn-icon-browser__trigger')).toBeVisible({ timeout: 10_000 })
})

test.describe('CnFormDialog — schema-driven icon field (real browser)', () => {
	// ⚠️ THIS SPEC USED TO ASSERT `.cn-icon-picker__grid`.
	//
	// `widget: 'icon'` renders CnIconBrowser, not CnIconPicker — a deliberate
	// change the component's own docblock records. The browser is a COLLAPSED
	// TRIGGER that opens a panel, where the picker was an always-open grid, so
	// every selector here was looking for markup that is no longer produced.
	//
	// The failure that gives is "element not found", which reads like the field
	// did not render at all. It rendered fine; the spec was describing a
	// component the dialog stopped using.

	test('a widget:"icon" field renders an icon browser inside the dialog', async ({ page }) => {
		// A real browser control, not a plain text input.
		await page.locator('.cn-icon-browser__trigger').click()

		await expect(page.locator('.cn-icon-browser-panel__search')).toBeVisible()
		await expect(page.locator('.cn-icon-browser-panel__cell[aria-label="House"]')).toBeVisible()
	})

	test('selecting an icon flows into the confirm payload', async ({ page }) => {
		await page.locator('.cn-icon-browser__trigger').click()
		await page.locator('.cn-icon-browser-panel__cell[aria-label="House"]').click()

		// Confirm the create dialog (primary button; label "Create" in create mode).
		await page.locator('button', { hasText: 'Create' }).click()
		await expect(page.getByTestId('fd-result')).toContainText('"icon":"house"')
	})
})
