/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqBeheerMarketing "Labels": the label chips in the boards' soft ink
 * (#3d4047, with their remove control) and the "Nieuw label" field 40px tall.
 * The server forces every text input to `--default-clickable-area` (34px)
 * with a long :not() chain, so the field's own height loses; a min-height
 * does not.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnChipListManager', 'CnChipListManager.vue'), 'utf8')

describe('CnChipListManager board look', () => {
	it('🔴 draws a chip in the soft ink', () => {
		expect(css).toMatch(/\.cn-chip-list__chip \{[^}]*color: var\(--cn-board-text-soft, var\(--color-main-text\)\);/)
	})

	it('🔴 keeps the add field 40px against the server\'s input height', () => {
		expect(css).toMatch(/\.cn-chip-list__input \{[^}]*height: 40px;[^}]*min-height: 40px;/)
	})
})
