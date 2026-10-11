/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A content-only renderer can fill its card's header (screens-relation-pages):
 * the record list reports "Alle 2 zaken bekijken" and "3 in totaal" through a
 * `header` event, and the host puts them in the titled card it draws.
 */
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const Reporter = {
	name: 'Reporter',
	emits: ['header'],
	mounted() {
		this.$emit('header', { link: { label: 'Alle 2 zaken bekijken', href: '/cases' }, note: '3 in totaal' })
	},
	render() {
		return h('div', { class: 'reporter' })
	},
}

const Wrapper = {
	name: 'CnWidgetWrapper',
	props: ['title', 'headerLink', 'showActions'],
	render() {
		return h('section', { class: 'wrapper', 'data-link': this.headerLink ? this.headerLink.label : '' }, [
			this.$slots.actions ? h('div', { class: 'actions' }, this.$slots.actions()) : null,
			this.$slots.default ? this.$slots.default() : null,
		])
	},
}

function mountHost(type) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'w', type, title: 'Zaken', content: { register: 'r', schema: 'case' } }, chrome: 'card', objectId: 'p-1' },
		global: {
			provide: { cnRegistry: { [type]: Reporter } },
			stubs: { CnWidgetWrapper: Wrapper },
		},
	})
}

describe('CnDetailWidgetHost renderer header', () => {
	it('puts the reported link and note in the card header of a record list', async () => {
		const w = mountHost('record-list')
		await nextTick()
		await nextTick()
		expect(w.find('.wrapper').attributes('data-link')).toBe('Alle 2 zaken bekijken')
		expect(w.find('[data-testid="cn-detail-widget-header-note"]').text()).toBe('3 in totaal')
	})

	it('draws no note when the renderer reports none', async () => {
		const w = mountHost('object-list')
		await nextTick()
		expect(w.find('[data-testid="cn-detail-widget-header-note"]').exists()).toBe(true)
		w.vm.onRendererHeader({ link: null, note: '' })
		await nextTick()
		expect(w.find('[data-testid="cn-detail-widget-header-note"]').exists()).toBe(false)
		expect(w.find('.wrapper').attributes('data-link')).toBe('')
	})
})
