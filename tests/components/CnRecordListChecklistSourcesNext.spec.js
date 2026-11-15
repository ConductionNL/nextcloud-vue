/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakDocumenten "Volledigheid": each requirement says where it comes from
 * at the row end, or "ontbreekt"; the header pill reads the verdict of the
 * answer; two buttons sit side by side under the list. DqTenant "Inrichten":
 * the next step spans the row with a "Volgende stap" pill and its action.
 *
 * @spec openspec/changes/record-list-checklist-sources-and-next-step/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/** @return {Promise<void>} */
async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const ANSWER = {
	verdict: 'incomplete',
	requirements: [
		{ id: 'r1', label: 'Aanvraagformulier', met: true, evidence: 'aanvraag.pdf' },
		{ id: 'r2', label: 'Machtiging', met: false, evidence: '' },
	],
}

const DOCS = {
	endpointSource: { url: '/apps/dossiq/api/cases/@objectId/completeness', responsePath: 'requirements' },
	presentation: 'checklist',
	columns: 1,
	title: '{label}',
	done: { field: 'met', op: 'eq', value: true },
	meta: '{evidence}',
	metaAt: 'end',
	missingText: 'ontbreekt',
	headerPillFrom: { path: 'verdict', labels: { incomplete: 'Nog niet ontvankelijk', complete: 'Ontvankelijk' }, colorMap: { incomplete: 'warning', complete: 'success' } },
	footerActions: [
		{ id: 'confirm', label: 'Ontvankelijkheid bevestigen', type: 'navigate', route: 'CaseDetail' },
		{ id: 'request', label: 'Aanvulverzoek versturen', type: 'navigate', route: 'CaseDetail' },
	],
}

const STEPS = [
	{ id: 's1', title: 'Contract', status: 'completed' },
	{ id: 's2', title: 'SSO instellen', status: 'pending', isNext: true, note: 'Koppel de identiteitsprovider', action: { label: 'SSO instellen', href: '/settings/sso' } },
	{ id: 's3', title: 'Eerste zaaktype', status: 'pending' },
]

const TENANT = {
	endpointSource: { url: '/apps/dossiq/api/tenant/steps', responsePath: 'steps' },
	presentation: 'checklist',
	title: '{title}',
	done: { field: 'status', op: 'eq', value: 'completed' },
	meta: '{note}',
	next: { when: { field: 'isNext', op: 'eq', value: true }, label: 'Volgende stap' },
}

const dispatch = jest.fn()

beforeEach(() => {
	axios.get.mockReset()
	dispatch.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget checklist sources and next step', () => {
	it('draws the source at the row end, the missing text on an open row', async () => {
		axios.get.mockResolvedValue({ data: ANSWER })
		const w = mount(CnRecordListWidget, { props: { content: DOCS, objectId: 'c1' } })
		await flush()
		const rows = w.findAll('[data-testid="cn-record-list-check"]')
		expect(rows[0].classes()).toContain('cn-record-list__check--meta-end')
		expect(rows.map((r) => r.find('[data-testid="cn-record-list-check-meta"]').text())).toEqual(['aanvraag.pdf', 'ontbreekt'])
	})

	it('reports the verdict pill read from the answer', async () => {
		axios.get.mockResolvedValue({ data: ANSWER })
		const w = mount(CnRecordListWidget, { props: { content: DOCS, objectId: 'c1' } })
		await flush()
		const headers = w.emitted('header')
		expect(headers[headers.length - 1][0].pill).toEqual({ label: 'Nog niet ontvankelijk', variant: 'warning' })
	})

	it('draws the footer actions side by side and dispatches each', async () => {
		axios.get.mockResolvedValue({ data: ANSWER })
		const w = mount(CnRecordListWidget, { props: { content: DOCS, objectId: 'c1' }, global: { provide: { cnDispatchAction: dispatch } } })
		await flush()
		const buttons = w.findAll('[data-testid^="cn-record-list-footer-actions-"]')
		expect(buttons.map((b) => b.text())).toEqual(['Ontvankelijkheid bevestigen', 'Aanvulverzoek versturen'])
		await buttons[1].trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ id: 'request', type: 'navigate', route: 'CaseDetail' }))
		expect(dispatch.mock.calls[0][0].label).toBe('Aanvulverzoek versturen')
	})

	it('marks the next step with its pill and action, the meta under the title', async () => {
		axios.get.mockResolvedValue({ data: { steps: STEPS } })
		const w = mount(CnRecordListWidget, { props: { content: TENANT } })
		await flush()
		const rows = w.findAll('[data-testid="cn-record-list-check"]')
		expect(rows.map((r) => r.classes().includes('cn-record-list__check--next'))).toEqual([false, true, false])
		expect(rows[1].find('[data-testid="cn-record-list-check-next-pill"]').exists()).toBe(true)
		expect(rows[1].find('[data-testid="cn-record-list-check-meta"]').text()).toBe('Koppel de identiteitsprovider')
		const action = rows[1].find('[data-testid="cn-record-list-check-next-action"]')
		expect(action.text()).toBe('SSO instellen')
		expect(action.attributes('href')).toBe('/settings/sso')
		expect(rows[1].classes()).not.toContain('cn-record-list__check--meta-end')
	})

	it('draws neither pill, actions nor next step without the keys (control)', async () => {
		axios.get.mockResolvedValue({ data: { steps: STEPS } })
		const { next, meta, ...plain } = TENANT
		const w = mount(CnRecordListWidget, { props: { content: plain } })
		await flush()
		expect(w.find('[data-testid="cn-record-list-check-next-pill"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-record-list-check-meta"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-record-list-footer-actions"]').exists()).toBe(false)
		const headers = w.emitted('header')
		expect(headers[headers.length - 1][0].pill).toBeUndefined()
	})
})
