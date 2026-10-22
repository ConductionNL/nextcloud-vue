/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings form's text field and select are 40px tall (PtPortalInstellingen
 * "Gemeente Zuiddrecht", "Mijn Zuiddrecht"). The component set `height`, but
 * Nextcloud's core stylesheet sets a text input's height through a selector
 * of eleven attribute tests, which no component class outranks, so the field
 * drew 34px. `min-height`, which core sets only through a bare `input`,
 * carries the height instead. jsdom draws no layout, so the rule is read from
 * the component's style block.
 *
 * @spec openspec/changes/settings-form-control-height/specs/settings-form/spec.md#requirement-a-settings-forms-field-is-40px-tall-under-nextclouds-core-input-rule
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue'), 'utf8')
const css = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('CnSettingsFormWidget: control height', () => {
	it('carries the 40px height as min-height too', () => {
		const body = ruleFor('.cn-settings-form__control')
		expect(body).toContain('min-height: var(--cn-board-control-height, 40px);')
	})
})
