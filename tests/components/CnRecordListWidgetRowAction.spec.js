/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A record list row can end in one action (`rowAction`), labelled per row by a
 * field, and the list can report its total for the card's title chip
 * (`headerCount`) (screens-record-list-row-action).
 *
 * @spec openspec/changes/screens-record-list-row-action/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const ITEMS = [
	{ id: 'a-1', title: 'Kostenraming Havenpark aanvullen', status: 'overdue' },
	{ id: 'a-2', title: 'Reactie op inspraak verwerken', status: 'open' },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const router = { push: jest.fn(), resolve: () => ({ href: '#' }) }
const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>' }

function mountList(content, { objectId = 'p-1', translate, withRouter = true } = {}) {
	return mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'case', ...content }, objectId, objectData: objectId ? { id: objectId } : null },
		global: {
			provide: translate ? { cnTranslate: translate } : {},
			stubs: { RouterLink, CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' }, NcLoadingIcon: true },
			mocks: withRouter ? { $router: router } : {},
		},
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: ITEMS, total: 5 } })
})

const actionsOf = (w) => w.findAll('[data-testid="cn-record-list-action"]')

describe('rowAction', () => {
	const rowAction = { type: 'open-page', target: 'ActionItemDetail', label: 'Afronden', labels: { field: 'status', map: { open: 'Starten' } } }

	it('ends each row with one action, labelled by the row field, linking to the row page', async () => {
		const w = mountList({ title: '{title}', rowRoute: 'ActionItemDetail', rowAction })
		await flush()
		const actions = actionsOf(w)
		expect(actions.map((a) => a.text())).toEqual(['Afronden', 'Starten'])
		expect(JSON.parse(actions[0].attributes('data-to'))).toEqual({ name: 'ActionItemDetail', params: { id: 'a-1' } })
		// The title is the row's link; the row itself is no longer one, and there is no chevron.
		expect(w.findAll('.cn-record-list__title.router-link')).toHaveLength(2)
		expect(w.find('.cn-record-list__chevron').exists()).toBe(false)
	})

	it('reads @object tokens of a navigate target off the row', async () => {
		const resolve = jest.fn((to) => ({ href: '#' + JSON.stringify(to) }))
		const w = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'item', title: '{title}', rowAction: { type: 'navigate', target: '/items/@object.id/vote', label: 'Stem uitbrengen' } } },
			global: { stubs: { RouterLink: { name: 'RouterLink', props: ['to'], template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>' }, NcLoadingIcon: true }, mocks: { $router: { push: jest.fn(), resolve } } },
		})
		await flush()
		expect(actionsOf(w).map((a) => a.attributes('data-to'))).toEqual(['"/items/a-1/vote"', '"/items/a-2/vote"'])
	})

	it('dispatches any other action with the row', async () => {
		const dispatch = jest.fn()
		const w = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'item', title: '{title}', rowAction: { type: 'handler', handler: 'complete', label: 'Afronden' } } },
			global: { provide: { cnDispatchAction: dispatch }, stubs: { NcLoadingIcon: true }, mocks: { $router: { push: jest.fn(), resolve: () => ({ href: '#' }) } } },
		})
		await flush()
		const button = actionsOf(w)[0]
		expect(button.element.tagName).toBe('BUTTON')
		await button.trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'handler', handler: 'complete', args: [ITEMS[0]] }))
	})

	it('changes nothing without the key', async () => {
		const w = mountList({ title: '{title}', rowRoute: 'ActionItemDetail' })
		await flush()
		expect(actionsOf(w)).toHaveLength(0)
		expect(w.findAll('.cn-record-list__chevron').length).toBe(2)
	})
})

describe('headerCount', () => {
	it('reports the total with the header when asked, and not otherwise', async () => {
		const w = mountList({ title: '{title}', headerCount: true })
		await flush()
		const headers = w.emitted('header')
		expect(headers[headers.length - 1][0].count).toBe(5)
		const plain = mountList({ title: '{title}' })
		await flush()
		const plainHeaders = plain.emitted('header')
		expect('count' in plainHeaders[plainHeaders.length - 1][0]).toBe(false)
	})
})
