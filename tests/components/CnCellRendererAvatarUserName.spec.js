/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCellRenderer: an `avatar` cell that holds a user id names the user.
 *
 * @spec openspec/changes/avatar-cell-user-display-name/specs/data-table/spec.md#requirement-an-avatar-cell-holding-a-user-id-shows-the-users-display-name
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
	getCanonicalLocale: () => 'en-GB',
}))

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	resolveNextcloudUser: jest.fn(async (uid) => ({ id: uid, label: { pieter: 'Pieter Jansen' }[uid] || uid })),
}))

const { mount, flushPromises } = require('@vue/test-utils')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default
const { clearUserDisplayNames } = require('../../src/utils/userDisplayName.js')

describe('CnCellRenderer avatar widget with a user id', () => {
	beforeEach(() => clearUserDisplayNames())

	it('shows the display name of the user the cell holds', async () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'pieter', widget: 'avatar', widgetProps: { user: true } },
		})
		await flushPromises()
		expect(wrapper.vm.avatarUserId).toBe('pieter')
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('Pieter Jansen')
	})

	it('shows the user id while the name is looked up, and when no name is known', async () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'someone-else', widget: 'avatar', widgetProps: { user: true } },
		})
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('someone-else')
		await flushPromises()
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('someone-else')
	})

	it('keeps a nameField name over the looked-up display name', async () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'pieter', widget: 'avatar', widgetProps: { user: true, nameField: 'handlerName' }, row: { handlerName: 'P. Jansen' } },
		})
		await flushPromises()
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('P. Jansen')
	})

	it('leaves a free name alone', async () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: 'pieter', widget: 'avatar' } })
		await flushPromises()
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('pieter')
	})
})
