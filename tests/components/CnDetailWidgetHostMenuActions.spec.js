/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A content-only renderer can put actions in its card's Actions menu
 * (`menuActions` on the `header` event), so a flow the board leaves out of
 * the title row stays reachable (DqTaak Afspraken: "Bestaande koppelen").
 *
 * @spec openspec/changes/appointment-create-quiet/specs/appointments/spec.md#requirement-a-cards-flows-can-sit-in-its-actions-menu
 */
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const link = jest.fn()
const Reporter = {
	name: 'Reporter',
	emits: ['header'],
	mounted() {
		this.$emit('header', { actions: [], menuActions: [{ label: 'Link an existing one', icon: 'LinkVariant', run: link }] })
	},
	render() {
		return h('div', { class: 'reporter' })
	},
}

const Wrapper = {
	name: 'CnWidgetWrapper',
	props: ['title', 'headerLink', 'showActions'],
	render() {
		return h('section', { class: 'wrapper', 'data-show-actions': String(this.showActions) }, [
			this.$slots['action-items'] ? h('div', { class: 'menu' }, this.$slots['action-items']()) : null,
			this.$slots.default ? this.$slots.default() : null,
		])
	},
}

const NcActionButton = { name: 'NcActionButton', emits: ['click'], template: '<button class="menu-item" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' }

describe('CnDetailWidgetHost menuActions', () => {
	it('draws the reported menu actions in the card\'s Actions menu and runs them', async () => {
		const w = mount(CnDetailWidgetHost, {
			props: { widget: { id: 'w', type: 'events', title: 'Appointments', content: {} }, chrome: 'card', objectId: 't-1', cnRegistry: { events: Reporter } },
			global: { stubs: { CnWidgetWrapper: Wrapper, NcActionButton, CnIcon: true } },
		})
		await nextTick()
		await nextTick()
		expect(w.find('.wrapper').attributes('data-show-actions')).toBe('true')
		const items = w.findAll('[data-testid="cn-detail-widget-menu-action"]')
		expect(items.map((i) => i.text())).toEqual(['Link an existing one'])
		await items[0].trigger('click')
		expect(link).toHaveBeenCalledTimes(1)
	})
})
