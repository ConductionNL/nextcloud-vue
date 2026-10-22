/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a board dialog a field's label stands above the control, raised out of
 * NcInputField's border, and the field makes room for it. NcSelect's search
 * is an NcInputField inside the select, where that room was never made: the
 * label rose over whatever stood above the select (COMPDIFF r22
 * DqZaakLocatie "Locatie toevoegen": the label 1px over the dialog title;
 * DqZaakSamenwerken: the labels under the selects above them). The select
 * now makes the room. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dialog-select-label-room/specs/board-dialog-select-label-room/spec.md#requirement-a-board-dialog-select-makes-room-for-its-raised-label
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('dialog.css: a select with a raised label', () => {
	it('reserves the label\'s room above the select, as a text field does', () => {
		const at = css.indexOf('.cn-dialog-board .dialog__content .v-select:has(.input-field__label) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('margin-block-start: 26px;')
	})
})
