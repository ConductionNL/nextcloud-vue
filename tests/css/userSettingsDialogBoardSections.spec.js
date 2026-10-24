/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqPersoonlijkeInstellingen: a section heading starts where its text starts
 * (live: 12px further in), and the notification grid's head is white and
 * 31.5px under a theme that colours every th. jsdom draws no layout, so the
 * rules are read from the component sources.
 *
 * @spec openspec/changes/user-settings-dialog-board-sections/specs/user-settings-dialog-board-sections/spec.md#requirement-the-dialogs-sections-read-as-the-board-draws-them
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/components', file), 'utf8')

/**
 * @param {string} source The component source.
 * @param {string} selector The rule's selector.
 * @return {string} Its body, or ''.
 */
function body(source, selector) {
	const at = source.indexOf(`${selector} {`)
	return at === -1 ? '' : source.slice(at, source.indexOf('}', at))
}

describe('the user settings dialog in the board look', () => {
	it('sets a section\'s heading and description at the text edge', () => {
		expect(body(read('CnUserSettingsDialog/CnUserSettingsDialog.vue'), '.cn-user-settings-dialog__sections :deep(.app-settings-section)')).toContain('--app-settings-section-text-offset: 0;')
	})

	it('draws the notification grid head white, 13px at 1.2', () => {
		const matrix = read('CnNotificationMatrix/CnNotificationMatrix.vue')
		expect(body(matrix, '	.cn-notification-matrix__table')).toContain('--nldesign-component-table-header-background-color: transparent;')
		expect(body(matrix, '	.cn-notification-matrix__table thead th')).toContain('line-height: 1.2;')
	})

	it('hides the saved-view list\'s label the section heading repeats', () => {
		expect(read('CnSavedViewMenuSettings/CnSavedViewMenuSettings.vue')).toContain(':hideLabel="true"')
	})
})
