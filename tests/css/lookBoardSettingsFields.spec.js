const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A text field or text area in a board settings card has its label above the
 * control, as PqBeheer (Leadbeheer) and PqBeheerKassa (Btw) draw it, instead
 * of Nextcloud's floating label; the placeholder shows at rest. jsdom draws no
 * layout, so the rules are read from the stylesheet text. And the section
 * header holds the card's action at the end of the title row.
 *
 * @spec openspec/changes/settings-section-board-fields/specs/settings-board-look/spec.md#requirement-a-settings-card-labels-its-text-fields-above-the-control
 */
const fs = require('fs')
const path = require('path')
const CnSettingsSection = require('../../src/components/CnSettingsSection/CnSettingsSection.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list holds the selector.
 *
 * @param {string} selector One selector, as written in the stylesheet.
 * @return {string}
 */
function rulesFor(selector) {
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

const card = '.cn-look-board .settings-section:not(.cn-look-nextcloud *)'

describe('look-board.css: fields in a settings card', () => {
	it('moves a text field label above the control and makes room for it', () => {
		const label = rulesFor(`${card} .input-field__input + .input-field__label`)
		expect(label).toMatch(/inset-block-start: auto/)
		expect(label).toMatch(/inset-block-end: calc\(100% \+ 6px\)/)
		expect(label).toMatch(/font-size: 14px/)
		expect(label).toMatch(/font-weight: 600/)
		expect(label).toMatch(/background: none/)
		expect(label).toMatch(/line-height: normal/)
		expect(rulesFor(`${card} .input-field:has(.input-field__label)`)).toMatch(/margin-block-start: 22px/)
	})

	it('hands the theme the label weight and ink, which it sets with !important', () => {
		const tokens = rulesFor(card)
		expect(tokens).toMatch(/--nldesign-component-form-field-label-font-weight: 600/)
		expect(tokens).toMatch(/--nldesign-component-form-field-label-color: var\(--color-main-text\)/)
	})

	it('does the same for a text area', () => {
		expect(rulesFor(`${card} .textarea__input + .textarea__label`)).toMatch(/inset-block-end: calc\(100% \+ 6px\)/)
		expect(rulesFor(`${card} .textarea:has(.textarea__label)`)).toMatch(/margin-block-start: 22px/)
	})

	it('shows the placeholder at rest once the label is outside the field', () => {
		expect(rulesFor(`${card} .input-field:has(.input-field__label) .input-field__input:not(:focus)::placeholder`)).toMatch(/opacity: 1 !important/)
	})
})

describe('CnSettingsSection: the header action', () => {
	it('draws the actions slot before the content, where the board puts it in the title row', () => {
		const wrapper = mount(CnSettingsSection, {
			props: { name: 'Lead sources' },
			slots: { actions: '<button type="button">Add source</button>', default: '<p>chips</p>' },
			global: { stubs: { NcSettingsSection: { template: '<div class="settings-section"><h2 class="settings-section__name">x</h2><slot /></div>' } } },
		})
		const children = [...wrapper.find('.settings-section').element.children].map((el) => el.className)
		expect(children.indexOf('cn-settings-section__actions')).toBeLessThan(children.indexOf('cn-settings-section__content'))
		expect(wrapper.find('.cn-settings-section__actions').text()).toBe('Add source')
	})
})
