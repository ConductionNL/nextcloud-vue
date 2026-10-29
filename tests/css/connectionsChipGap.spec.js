/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The connections panel's status chips sit 8px apart (board PqIntegrations).
 * Nextcloud's server rule
 * `button:not(.button-vue,[class^=vs__]):not(.app-navigation-entry-button)`
 * gives every plain button `margin: 3px; margin-inline-start: 0` at
 * specificity (0,2,1), which beats a scoped single-class rule (0,2,0) and
 * made the gap 11px. The chip rule carries the group class to win.
 *
 * @spec openspec/changes/connections-chip-gap/specs/connections-chip-gap/spec.md#requirement-the-status-chips-stand-8px-apart
 */
const fs = require('fs')
const path = require('path')

const style = fs.readFileSync(path.join(__dirname, '../../src/components/CnConnectionsPanel/CnConnectionsPanel.vue'), 'utf8')
	.split('<style')[1]
	.replace(/\/\*[\s\S]*?\*\//g, '')

describe('connections panel status chips', () => {
	it('drops the server button margin with a rule that outranks it', () => {
		expect(style).toMatch(/\.cn-connections__chips \.cn-connections__chip\s*\{[^}]*margin: 0;/)
	})

	it('keeps the 8px gap between the chips', () => {
		expect(style).toMatch(/\.cn-connections__chips\s*\{[^}]*gap: 8px;/)
	})
})
