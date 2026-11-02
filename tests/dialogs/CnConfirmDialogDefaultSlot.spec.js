/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnConfirmDialog from '../../src/dialogs/CnConfirmDialog.vue'

const extra = () => h('label', { class: 'extra' }, 'Also remove the copies')

describe('CnConfirmDialog default slot', () => {
	for (const look of ['nextcloud', 'board']) {
		it(`renders the slot below the message in the confirm phase (${look})`, () => {
			const wrapper = mount(CnConfirmDialog, {
				propsData: { look, message: 'Restore this version?', confirmValue: 'v2' },
				slots: { default: extra },
			})
			const phase = wrapper.find('[data-testid-phase="confirm"]')
			const html = phase.html()
			expect(phase.find('.extra').text()).toBe('Also remove the copies')
			expect(html.indexOf('Restore this version?')).toBeLessThan(html.indexOf('class="extra"'))
			expect(html.indexOf('class="extra"')).toBeLessThan(html.indexOf('data-testid="cn-confirm-value-field"'))
		})
	}

	it('drops the slot in the result phase', async () => {
		const wrapper = mount(CnConfirmDialog, { slots: { default: extra } })
		wrapper.vm.setResult({ error: 'It failed' })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.extra').exists()).toBe(false)
	})

	it('lets open fall through to the dialog', () => {
		const wrapper = mount(CnConfirmDialog, { attrs: { open: true } })
		expect(wrapper.find('.stub.NcDialog').attributes('open')).toBe('true')
	})
})
