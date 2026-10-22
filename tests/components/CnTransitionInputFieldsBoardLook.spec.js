/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The summary and the notice of an act's form, as board DqArchiveren draws
 * them: the facts stack each label over its value (core's apps.css sets every
 * dt and dd inline-block with a fixed, end-aligned dt, which ran "Archiefstatus
 * na archiveren" into its value), and the notice is a tinted box with its own
 * icon and a bold heading ("Daarna alleen lezen", a lock) rather than a note
 * card, which a tinted parent swallows.
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnTransitionInputFields from '../../src/components/CnTransitionInputFields/CnTransitionInputFields.vue'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnTransitionInputFields/CnTransitionInputFields.vue'), 'utf8')
const style = sfc.slice(sfc.indexOf('<style'))

const stubs = {
	CnIcon: { name: 'CnIcon', props: ['name', 'size'], template: '<i class="cn-icon" :data-name="name" />' },
	NcNoteCard: { name: 'NcNoteCard', template: '<div class="note"><slot /></div>' },
}

/**
 * The declarations of one rule in the style block.
 *
 * @param {string} selector The selector, as written.
 * @return {string} The declarations.
 */
function rule(selector) {
	const at = style.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return style.slice(at, style.indexOf('}', at))
}

describe('CnTransitionInputFields board look', () => {
	it('stacks each fact\'s label over its value, whatever core does to dt and dd', () => {
		const cells = rule('.cn-transition-input-fields__facts dt,\n.cn-transition-input-fields__facts dd')
		expect(cells).toContain('display: block;')
		expect(cells).toContain('width: auto;')
		expect(cells).toContain('text-align: start;')
		expect(cells).toContain('white-space: normal;')
	})

	it('draws the notice as a tinted box with its icon, a bold heading and the text, not as a note card', () => {
		const notice = { type: 'info', icon: 'LockOutline', heading: 'Read only afterwards', text: 'Nothing can be changed.' }
		const w = mount(CnTransitionInputFields, { props: { inputs: [], notice }, global: { stubs } })

		expect(w.find('.note').exists()).toBe(false)
		const box = w.find('[data-testid="cn-transition-input-fields-notice"]')
		expect(box.attributes('role')).toBe('note')
		expect(box.classes()).toContain('cn-transition-input-fields__notice--info')
		expect(box.find('.cn-icon').attributes('data-name')).toBe('LockOutline')
		expect(box.find('strong').text()).toBe('Read only afterwards')
		expect(box.text()).toContain('Nothing can be changed.')

		const look = rule('.cn-transition-input-fields__notice')
		expect(look).toContain('background: var(--color-primary-element-light);')
		expect(look).toContain('border-radius: var(--border-radius-large, 8px);')
		expect(look).toContain('padding: 14px 16px;')
	})

	it('takes the information icon when the notice names none, and a warning keeps its own tone', () => {
		const w = mount(CnTransitionInputFields, {
			props: { inputs: [], notice: { type: 'warning', text: 'Mind the term.' } },
			global: { stubs },
		})
		const box = w.find('[data-testid="cn-transition-input-fields-notice"]')
		expect(box.find('.cn-icon').attributes('data-name')).toBe('InformationOutline')
		expect(box.classes()).toContain('cn-transition-input-fields__notice--warning')
		expect(box.find('strong').exists()).toBe(false)
	})
})
