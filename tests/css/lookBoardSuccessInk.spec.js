/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look's success tint and ink read the theme's green first, as a
 * success badge does: DqZaak Zaakplan "Bereikt" is #1e6b2a on #e7f3ea, where
 * the theme's --color-success-text (#005416) inked it darker (r32).
 *
 * @spec openspec/changes/board-plan-rows/specs/plan-widget/spec.md
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('board success ink', () => {
	it('reads the theme green before the success text', () => {
		expect(css).toContain('--cn-board-success-ink: var(--nl-color-green-text, var(--color-success-text, #1e6b2a));')
		expect(css).toContain('--cn-board-success-tint: var(--nl-color-green-light, var(--color-success-light, #e7f3ea));')
	})
})
