/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCellRenderer: an `avatar` cell with nobody in it can name the group the row
 * waits on (DqTaken "TW  Team Woo, niet geclaimd" for a pooled task).
 *
 * @spec openspec/changes/avatar-cell-group-fallback/specs/data-table/spec.md#requirement-an-empty-avatar-cell-can-name-the-rows-group
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
	getCanonicalLocale: () => 'en-GB',
}))

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	resolveNextcloudUser: jest.fn(async (uid) => ({ id: uid, label: { pieter: 'Pieter Jansen' }[uid] || uid })),
}))

jest.mock('../../src/utils/groupAutocomplete.js', () => {
	const { reactive } = require('vue')
	const names = reactive({})
	return {
		groupDisplayName: (gid) => (typeof names[gid] === 'string' ? names[gid] : null),
		loadGroupDisplayName: jest.fn(async (gid) => {
			names[gid] = { 'woo-team': 'Team Woo' }[gid] || gid
			return names[gid]
		}),
	}
})

const { mount, flushPromises } = require('@vue/test-utils')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const PROPS = { user: true, groupField: 'candidateGroups', groupLabel: '{group}, unclaimed' }

describe('CnCellRenderer avatar widget with a group fallback', () => {
	it('names the row\'s first group when nobody holds the row', async () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: null, widget: 'avatar', widgetProps: PROPS, row: { assignee: null, candidateGroups: ['woo-team', 'other'] } },
		})
		await flushPromises()
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('Team Woo, unclaimed')
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').text()).toBe('TW')
	})

	it('keeps the person when somebody holds the row', async () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'pieter', widget: 'avatar', widgetProps: PROPS, row: { assignee: 'pieter', candidateGroups: ['woo-team'] } },
		})
		await flushPromises()
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('Pieter Jansen')
	})

	it('shows a dash with neither a person nor a group', async () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: '', widget: 'avatar', widgetProps: PROPS, row: { candidateGroups: [] } },
		})
		await flushPromises()
		expect(wrapper.find('.cn-cell-renderer__dash').exists()).toBe(true)
	})
})
