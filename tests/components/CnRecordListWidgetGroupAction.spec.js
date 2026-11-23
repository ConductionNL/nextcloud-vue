/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list's action can end a group heading, drawn as a tonal pill
 * (DqZaakGerelateerd: "Gepland vervolg" with "Vervolg plannen").
 *
 * @spec openspec/changes/record-list-group-action/specs/record-list/spec.md#requirement-a-record-lists-action-can-end-a-group-heading-as-a-tonal-pill
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const ROWS = [
	{ id: 'r-1', title: 'Aanleg fietspad', group: 'subject' },
	{ id: 'r-2', title: 'Bericht na publicatie', group: 'planned' },
]

const ACTION = { label: 'Plan follow-up', icon: 'CalendarClock', type: 'handler', handler: 'plan', group: 'planned', variant: 'tonal' }

async function render(rows, action = ACTION, provide = {}) {
	axios.get.mockResolvedValue({ data: { results: rows, total: rows.length } })
	const wrapper = mount(CnRecordListWidget, {
		props: {
			content: {
				register: 'r',
				schema: 'relation',
				title: '{title}',
				groupBy: 'group',
				emptyText: 'No related cases yet',
				valueLabels: { group: { subject: 'Subject of this case', planned: 'Planned follow-up' } },
				footerAction: action,
			},
		},
		global: { provide, stubs: { NcLoadingIcon: true, CnIcon: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

/**
 * The group heading rows that carry an action.
 *
 * @param {object} wrapper The mounted widget.
 * @return {Array<{heading: string, action: string}>} Heading text and action label.
 */
function headedActions(wrapper) {
	return wrapper.findAll('[data-testid="cn-record-list-group-head"]').map((head) => ({
		heading: head.find('[data-testid="cn-record-list-group-heading"]').text(),
		action: head.find('[data-testid="cn-record-list-footer-action"]').exists() ? head.find('[data-testid="cn-record-list-footer-action"]').text() : '',
	}))
}

describe('CnRecordListWidget footerAction.group', () => {
	beforeEach(() => axios.get.mockReset())

	it('ends the named group heading with the action, as a tonal pill, and leaves the footer empty', async () => {
		const dispatch = jest.fn()
		const wrapper = await render(ROWS, ACTION, { cnDispatchAction: dispatch })
		expect(headedActions(wrapper).filter((h) => h.action)).toEqual([{ heading: 'Planned follow-up', action: 'Plan follow-up' }])
		expect(wrapper.find('[data-testid="cn-record-list-footer"]').exists()).toBe(false)
		const button = wrapper.find('[data-testid="cn-record-list-footer-action"]')
		expect(button.classes()).toContain('cn-record-list__action--tonal')
		await button.trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ handler: 'plan' }))
		expect(dispatch.mock.calls[0][0].group).toBeUndefined()
		expect(dispatch.mock.calls[0][0].variant).toBeUndefined()
	})

	it('draws the group heading with the action after the groups when no row is in it', async () => {
		const wrapper = await render([ROWS[0]])
		const heads = wrapper.findAll('[data-testid="cn-record-list-group-heading"]').map((h) => h.text())
		expect(heads).toEqual(['Subject of this case', 'Planned follow-up'])
		expect(headedActions(wrapper).filter((h) => h.action)).toEqual([{ heading: 'Planned follow-up', action: 'Plan follow-up' }])
	})

	it('draws the group heading with the action under the empty text when there are no rows', async () => {
		const wrapper = await render([])
		expect(wrapper.find('[data-testid="cn-record-list-empty"]').text()).toBe('No related cases yet')
		expect(headedActions(wrapper)).toEqual([{ heading: 'Planned follow-up', action: 'Plan follow-up' }])
	})

	it('keeps the secondary button under the list without group or variant', async () => {
		const { group, variant, ...plain } = ACTION
		const wrapper = await render(ROWS, plain)
		expect(wrapper.find('[data-testid="cn-record-list-footer"] [data-testid="cn-record-list-footer-action"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-record-list-footer-action"]').classes()).not.toContain('cn-record-list__action--tonal')
		expect(group).toBe('planned')
		expect(variant).toBe('tonal')
	})
})
