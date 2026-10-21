/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every card of a grouped-cards widget can carry actions, their `@item` and
 * `@group` tokens read from the card and its group and their `visibleWhen`
 * decided on both (join, move or leave a work group; sign up or withdraw).
 * Also: a counted meta part, a conditional group line, a group progress bar
 * and a second list per group with its own actions.
 *
 * @spec openspec/changes/grouped-cards-item-actions/specs/grouped-cards-item-actions/spec.md#requirement-every-card-can-carry-actions
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const CnGroupedCardsWidget = require('../../src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue').default

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/**
 * Let the endpoint read settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const SETS = {
	sets: [
		{ id: 'set-1', setName: 'Project', open: true, joined: true, done: 40, groups: [
			{ id: 'g 1', name: 'Group A', free: 1, mine: true, members: ['Ann'] },
			{ id: 'g2', name: 'Group B', free: 2, mine: false, members: [] },
			{ id: 'g3', name: 'Group C', free: 0, mine: false, members: ['Bo', 'Cy'] },
		], missing: ['lrn-9', 'lrn-8'] },
		{ id: 'set-2', setName: 'Closed', open: false, joined: false, groups: [{ id: 'g4', name: 'Group D', free: 3, mine: false }] },
	],
}

const CONTENT = {
	endpointSource: { url: '/apps/school/api/my/work-groups' },
	groupsPath: 'sets',
	itemsKey: 'groups',
	groupTitle: '{setName}',
	groupLines: [{ text: 'Sign-up is open.', when: { field: 'open', op: 'eq', value: true } }, { text: 'Sign-up has closed.', when: { field: 'open', op: 'eq', value: false } }],
	groupProgress: { valuePath: 'done', label: '{done}% done' },
	itemTitle: '{name}',
	itemMeta: [{ count: 'free', one: '{count} free place', other: '{count} free places' }, '{members}'],
	itemActions: [
		{ id: 'leave', label: 'Leave', type: 'api-call', url: '/apps/school/api/work-groups/@item.id/leave', visibleWhen: { all: [{ field: 'group.open', value: true }, { field: 'item.mine', value: true }] } },
		{ id: 'join', label: 'Join', type: 'api-call', url: '/apps/school/api/work-groups/@item.id/join', payload: { free: '@item.free', set: 'set @group.setName' }, visibleWhen: { all: [{ field: 'group.open', value: true }, { field: 'item.mine', value: false }, { field: 'item.free', op: 'gt', value: 0 }, { field: 'group.joined', value: false }] } },
		{ id: 'move', label: 'Move here', type: 'api-call', url: '/apps/school/api/work-groups/@item.id/join', visibleWhen: { all: [{ field: 'group.open', value: true }, { field: 'item.mine', value: false }, { field: 'item.free', op: 'gt', value: 0 }, { field: 'group.joined', value: true }] } },
	],
	extraItemsKey: 'missing',
	extraItemsHeading: 'Not in a group',
	extraItemTitle: '{value}',
	extraItemActions: [{ id: 'place', label: 'Place', type: 'api-call', url: '/apps/school/api/sets/@group.id/place', payload: { learnerId: '@item.value' } }],
}

const stubs = {
	CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="actions-stub" />' },
	NcProgressBar: { name: 'NcProgressBar', props: ['value'], template: '<progress :value="value" />' },
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: SETS })
})

/**
 * The ids of the actions drawn on each card of the first group.
 *
 * @param {object} wrapper The mounted widget.
 * @return {Array<Array<string>>}
 */
function actionIdsOfFirstGroup(wrapper) {
	const group = wrapper.findAll('[data-testid="cn-grouped-cards-group"]')[0]
	return group.findAll('[data-testid="cn-grouped-cards-item"]').map((item) => {
		const buttons = item.findComponent({ name: 'CnActionButtons' })
		return buttons.exists() ? buttons.props('actions').map((a) => a.id.split('-')[0]) : []
	})
}

describe('CnGroupedCardsWidget itemActions', () => {
	it('shows each card only the actions its visibleWhen allows', async () => {
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT }, global: { stubs } })
		await flush()
		expect(actionIdsOfFirstGroup(w)).toEqual([['leave'], ['move'], []])
		const closed = w.findAll('[data-testid="cn-grouped-cards-group"]')[1]
		expect(closed.findAllComponents({ name: 'CnActionButtons' }).filter((c) => c.props('actions').some((a) => a.id.startsWith('join') || a.id.startsWith('move') || a.id.startsWith('leave')))).toHaveLength(0)
	})

	it('fills the card and group tokens, encoding urls and keeping a whole token typed', async () => {
		const content = { ...CONTENT, itemActions: [{ ...CONTENT.itemActions[1], visibleWhen: undefined }] }
		const w = mount(CnGroupedCardsWidget, { props: { content }, global: { stubs } })
		await flush()
		const action = w.findAll('[data-testid="cn-grouped-cards-item"]')[0].findComponent({ name: 'CnActionButtons' }).props('actions')[0]
		expect(action.url).toBe('/apps/school/api/work-groups/g%201/join')
		expect(action.payload).toEqual({ free: 1, set: 'set Project' })
		expect(action.id).toBe('join-g 1-0')
	})

	it('counts in the singular or plural, draws conditional lines and the progress', async () => {
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT }, global: { stubs } })
		await flush()
		const [first, second] = w.findAll('[data-testid="cn-grouped-cards-group"]')
		expect(first.findAll('[data-testid="cn-grouped-cards-item"]')[0].text()).toContain('1 free place · Ann')
		expect(first.findAll('[data-testid="cn-grouped-cards-item"]')[1].text()).toContain('2 free places')
		expect(first.find('[data-testid="cn-grouped-cards-group-line"]').text()).toBe('Sign-up is open.')
		expect(second.find('[data-testid="cn-grouped-cards-group-line"]').text()).toBe('Sign-up has closed.')
		expect(first.find('[data-testid="cn-grouped-cards-progress"]').text()).toContain('40% done')
		expect(second.find('[data-testid="cn-grouped-cards-progress"]').exists()).toBe(false)
	})

	it('draws a heading filled from the payload', async () => {
		axios.get.mockResolvedValue({ data: { ...SETS, name: 'Optional maths' } })
		const w = mount(CnGroupedCardsWidget, { props: { content: { ...CONTENT, heading: '{name}' } }, global: { stubs } })
		await flush()
		expect(w.find('[data-testid="cn-grouped-cards-heading"]').text()).toBe('Optional maths')
	})

	it('draws a second list per group with its own actions', async () => {
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT }, global: { stubs } })
		await flush()
		const first = w.findAll('[data-testid="cn-grouped-cards-group"]')[0]
		expect(first.find('[data-testid="cn-grouped-cards-extra-heading"]').text()).toBe('Not in a group')
		const extra = first.findAll('[data-testid="cn-grouped-cards-extra-item"]')
		expect(extra.map((e) => e.text())).toEqual(['lrn-9', 'lrn-8'])
		const place = extra[0].findComponent({ name: 'CnActionButtons' }).props('actions')[0]
		expect(place.url).toBe('/apps/school/api/sets/set-1/place')
		expect(place.payload).toEqual({ learnerId: 'lrn-9' })
	})
})
