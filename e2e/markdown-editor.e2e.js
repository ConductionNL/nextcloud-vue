// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec openspec/changes/enrich-icon-picker-and-markdown-wysiwyg/specs/markdown-editor/spec.md
//   Covers scenarios: Opt-in WYSIWYG mode, Lazy-loaded editor dependency,
//   Preserved v-model contract.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/')
})

test.describe('CnMarkdownEditor — WYSIWYG (real browser)', () => {
	const sec = (page) => page.getByTestId('section-md-wysiwyg')

	test('lazily mounts the real Toast UI editor', async ({ page }) => {
		// The Toast UI editor is dynamically imported only in wysiwyg mode.
		await expect(sec(page).locator('.toastui-editor-defaultUI')).toBeVisible({ timeout: 15_000 })
		// The component's own textarea path must NOT render in wysiwyg mode.
		// (Toast UI has its own internal textarea for the markdown pane — that's
		// its concern, not ours; assert only against our BEM textarea.)
		await expect(sec(page).locator('[data-testid="cn-markdown-textarea"]')).toHaveCount(0)
	})

	test('typing in the editor round-trips through v-model', async ({ page }) => {
		// Toast UI renders two ProseMirror roots (wysiwyg + markdown pane); the
		// wysiwyg contents editor carries the toastui-editor-contents class.
		const editor = sec(page).locator('.ProseMirror.toastui-editor-contents')
		await expect(editor).toBeVisible({ timeout: 15_000 })
		await editor.click()
		await editor.pressSequentially(' world')
		await expect(page.getByTestId('wysiwyg-value')).not.toHaveText('# Hello')
		await expect(page.getByTestId('wysiwyg-value')).toContainText('world')
	})
})

test.describe('CnMarkdownEditor — default textarea (real browser)', () => {
	test('default mode renders a textarea and no Toast UI editor', async ({ page }) => {
		const sec = page.getByTestId('section-md-default')
		await expect(sec.locator('.toastui-editor-defaultUI')).toHaveCount(0)
		const ta = sec.locator('textarea')
		await expect(ta).toBeVisible()
		await ta.fill('edited in textarea')
		await expect(page.getByTestId('plain-value')).toHaveText('edited in textarea')
	})
})
