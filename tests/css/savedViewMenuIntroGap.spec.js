/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The menu views description sits 16px above its list, as a board section's
 * description does. Read as text: jsdom draws no layout.
 */
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '../../src/components/CnSavedViewMenuSettings/CnSavedViewMenuSettings.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('CnSavedViewMenuSettings: description gap', () => {
	it('sets the description 16px above the list', () => {
		const at = src.indexOf('.cn-saved-view-menu-settings__intro {')
		expect(src.slice(at, src.indexOf('}', at))).toContain('margin: 0 0 16px;')
	})
})
