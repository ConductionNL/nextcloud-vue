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
	await expect(page.locator('.cn-icon-picker__grid')).toBeVisible({ timeout: 10_000 })
})

test.describe('CnFormDialog — schema-driven icon field (real browser)', () => {
	test('a widget:"icon" field renders CnIconPicker inside the dialog', async ({ page }) => {
		// The picker (not a plain text input) is mounted for the icon field.
		await expect(page.locator('.cn-icon-picker__search')).toBeVisible()
		await expect(page.locator('.cn-icon-picker__icon[aria-label="House"]')).toBeVisible()
	})

	test('selecting an icon flows into the confirm payload', async ({ page }) => {
		await page.locator('.cn-icon-picker__icon[aria-label="House"]').click()
		// Confirm the create dialog (primary button; label "Create" in create mode).
		await page.locator('button', { hasText: 'Create' }).click()
		await expect(page.getByTestId('fd-result')).toContainText('"icon":"house"')
	})
})
