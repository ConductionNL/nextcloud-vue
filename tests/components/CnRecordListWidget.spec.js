/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget: the objects of another schema that point at this
 * record, as the relation boards draw them (screens-relation-pages).
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import axios from '@nextcloud/axios'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const CASES = [
	{ id: 'c-1', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082', caseTypeName: 'Woo-verzoek', status: 'in_behandeling', deadline: '2099-11-01' },
	{ id: 'c-2', title: 'Kapotte lantaarnpaal Lindelaan', identifier: '2025-0412', caseTypeName: 'Melding', status: 'afgehandeld', closedAt: '2025-11-18', deadline: '2025-11-20' },
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
	axios.get.mockResolvedValue({ data: { results: CASES, total: 2 } })
})

describe('CnRecordListWidget', () => {
	it('fetches the list with the record id resolved, the sort, limit and extend', async () => {
		mountList({ filter: { requester: '@objectId' }, sort: { field: 'deadline', dir: 'asc' }, limit: 3, extend: ['assignee'] })
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/r/case', {
			params: { _limit: 3, '_order[deadline]': 'asc', _extend: ['assignee'], requester: 'p-1' },
		})
	})

	it('sends nothing while the record id is unknown', async () => {
		mountList({ filter: { requester: '@objectId' } }, { objectId: null })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('draws rows: title, meta, pill, the first trailing that fills, a chevron and a link', async () => {
		const w = mountList({
			title: '{title}',
			meta: '{identifier} · {caseTypeName}',
			pill: { field: 'status', labels: { in_behandeling: 'In behandeling', afgehandeld: 'Afgehandeld' }, colorMap: { in_behandeling: 'purple', afgehandeld: 'success' } },
			trailing: ['Klaar {closedAt|date}', 'Termijn {deadline|date}'],
			rowRoute: 'CaseDetail',
		})
		await flush()
		const items = w.findAll('[data-testid="cn-record-list-item"]')
		expect(items).toHaveLength(2)
		expect(items[0].find('.cn-record-list__title').text()).toBe('Verlichting fietspad Lindelaan')
		expect(items[0].find('.cn-record-list__meta').text()).toBe('2026-0082 · Woo-verzoek')
		expect(items[0].text()).toContain('In behandeling')
		expect(items[0].find('.cn-record-list__trailing').text()).toMatch(/^Termijn \S/)
		expect(items[1].find('.cn-record-list__trailing').text()).toMatch(/^Klaar \S/)
		expect(JSON.parse(items[0].find('.router-link').attributes('data-to'))).toEqual({ name: 'CaseDetail', params: { id: 'c-1' } })
		expect(items[0].find('.cn-record-list__chevron').exists()).toBe(true)
	})

	it('draws a row without a route as plain text, without a chevron', async () => {
		const w = mountList({ title: '{title}' })
		await flush()
		expect(w.find('.router-link').exists()).toBe(false)
		expect(w.find('.cn-record-list__chevron').exists()).toBe(false)
	})

	it('draws a feed: an icon by field, a meta line and the text', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'm-1', channel: 'phone', summary: 'Gebeld' }, { id: 'm-2', channel: 'balie', summary: 'Langs geweest' }], total: 2 } })
		const w = mountList({ presentation: 'feed', icon: { field: 'channel', map: { phone: 'Phone' }, default: 'EmailOutline' }, meta: '{channel}', text: '{summary}' })
		await flush()
		const icons = w.findAll('.icon').map((i) => i.attributes('data-name'))
		expect(icons).toEqual(['Phone', 'EmailOutline'])
		expect(w.findAll('.cn-record-list__text').map((n) => n.text())).toEqual(['Gebeld', 'Langs geweest'])
	})

	it('draws inline rows: a label and the title as a link to rowIdField', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'rel-1', role: 'Secretaris van', to: { id: 'org-9', name: 'Buurtvereniging Oost' } }], total: 1 } })
		const w = mountList({ presentation: 'inline', label: '{role}', title: '{to.name}', rowRoute: 'OrganisationDetail', rowIdField: 'to.id' })
		await flush()
		expect(w.find('.cn-record-list__label').text()).toBe('Secretaris van')
		const link = w.find('.router-link')
		expect(link.text()).toBe('Buurtvereniging Oost')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'OrganisationDetail', params: { id: 'org-9' } })
	})

	it('emits the header link and note with the total filled in and tokens resolved', async () => {
		const w = mountList({ filter: { requester: '@objectId' }, headerLink: { label: 'Alle {total} zaken bekijken', route: 'Cases', query: { requester: '@objectId' } }, headerNote: '{total} in totaal' })
		await flush()
		const events = w.emitted('header')
		const last = events[events.length - 1][0]
		expect(last.link).toEqual({ label: 'Alle 2 zaken bekijken', route: 'Cases', query: { requester: 'p-1' } })
		expect(last.note).toBe('2 in totaal')
	})

	it('translates the templates through the host', async () => {
		const w = mountList({ title: 'Case {identifier}', emptyText: 'No cases' }, { translate: (k) => k.replace('Case', 'Zaak') })
		await flush()
		expect(w.find('.cn-record-list__title').text()).toBe('Zaak 2026-0082')
	})

	it('shows the empty text, and one quiet line on a failure', async () => {
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
		const w = mountList({ emptyText: 'Geen zaken' })
		await flush()
		expect(w.find('[data-testid="cn-record-list-empty"]').text()).toBe('Geen zaken')
		axios.get.mockRejectedValue(new Error('Request failed with status code 500'))
		const failed = mountList({})
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		await flush()
		expect(failed.find('[data-testid="cn-record-list-error"]').text()).not.toContain('500')
		expect(failed.find('[data-testid="cn-record-list-empty"]').exists()).toBe(false)
		warn.mockRestore()
	})
})
