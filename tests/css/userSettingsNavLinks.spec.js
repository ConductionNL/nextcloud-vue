/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The user settings dialog's navigation entries are not underlined, also
 * under a theme whose `a { text-decoration: underline !important }` beats a
 * plain class rule (thematiq). jsdom applies no stylesheet, so the rule is
 * read from the component.
 *
 * @spec openspec/changes/app-shown-name-in-chrome/specs/app-root/spec.md#requirement-the-user-settings-navigation-is-not-underlined
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue'), 'utf8')
	.split('<style')[1]
	.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rules whose selector list holds the selector.
 *
 * @param {string} selector The selector.
 * @return {string} The joined declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('CnUserSettingsDialog navigation links', () => {
	it.each([
		'.cn-user-settings-dialog__nav-link',
		'.cn-user-settings-dialog__nav-link:visited',
		'.cn-user-settings-dialog__nav-link:hover',
	])('%s has no underline, with !important', (selector) => {
		expect(bodyOf(selector)).toMatch(/text-decoration:\s*none\s*!important/)
	})
})
