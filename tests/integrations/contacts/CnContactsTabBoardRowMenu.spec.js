/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * In the board look each party row ends in a "…" menu holding Unlink
 * (DqZaakBetrokkenen Partijen). NcActions draws a single action inline as
 * its own icon button, so the menu has to be forced or the row ends in an X.
 *
 * @spec openspec/changes/board-contacts-row-menu/specs/integrations/contacts/spec.md
 */

import { mount } from '@vue/test-utils'
import CnContactsTab from '../../../src/integrations/builtin/contacts/CnContactsTab.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const NcActions = {
	name: 'NcActions',
	props: ['forceMenu', 'variant', 'ariaLabel'],
	template: '<div class="nc-actions-stub" :data-force="String(forceMenu)"><slot /></div>',
}

const stubs = {
	NcButton: { name: 'NcButton', template: '<button><slot /></button>' },
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcAvatar: true,
	NcActions,
	NcActionButton: { name: 'NcActionButton', template: '<button class="nc-action-button-stub" @click="$emit(\'click\')"><slot /></button>' },
	Close: true,
}

function mountTab(look) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: async () => ({ results: [{ id: 1, contactUid: 'uid-1', displayName: 'J. van Wijk', role: 'gemachtigde' }], total: 1 }),
	})
	return mount(CnContactsTab, {
		stubs,
		provide: { cnLook: look },
		propsData: { objectId: 'obj-1', register: 'reg', schema: 'sch' },
	})
}

describe('CnContactsTab board row menu', () => {
	const originalFetch = global.fetch
	afterEach(() => {
		global.fetch = originalFetch
	})

	it('forces the row menu in the board look, so Unlink sits behind "…"', async () => {
		const wrapper = mountTab('board')
		await flush()
		await wrapper.vm.$nextTick()
		const menu = wrapper.find('[data-testid="cn-contacts-tab-menu"]')
		expect(menu.exists()).toBe(true)
		expect(menu.attributes('data-force')).toBe('true')
		expect(wrapper.find('.cn-contacts-tab__unlink').exists()).toBe(false)
	})

	it('keeps the inline unlink button in the Nextcloud look', async () => {
		const wrapper = mountTab('nextcloud')
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-contacts-tab-menu"]').exists()).toBe(false)
		expect(wrapper.find('.cn-contacts-tab__unlink').exists()).toBe(true)
	})
})
