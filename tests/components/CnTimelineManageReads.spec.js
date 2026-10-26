/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The manage timeline can show who read the record behind a footer switch,
 * off by default (board DqZaakHistorie, "Ook wie de zaak las").
 *
 * @spec openspec/changes/timeline-reads-toggle/specs/timeline/spec.md
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const TIMELINE = '/index.php/apps/openregister/api/objects/reg/case/c-1/timeline'
const TRAIL = '/index.php/apps/openregister/api/objects/reg/case/c-1/audit-trails'

const stubs = {
	NcButton: { props: ['variant'], template: '<button v-bind="$attrs"><slot /></button>' },
	NcSelect: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcNoteCard: { template: '<div><slot /></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue'], emits: ['update:modelValue'], template: '<label v-bind="$attrs"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
}

function reads({ trailFails = false, visible = true } = {}) {
	axios.get.mockImplementation((url) => {
		if (url === TIMELINE) {
			return Promise.resolve({ data: { canManage: true, results: [{ id: 'e1', message: 'Gebeld', author: 'ann', created: '2026-10-05T09:00:00Z' }] } })
		}
		if (url === TRAIL) {
			return trailFails
				? Promise.reject(new Error('403'))
				: Promise.resolve({ data: visible ? { readEventsVisible: true, results: [{ id: 7, action: 'read', actorDisplayName: 'Fatma Kaya', created: '2026-10-06T09:00:00Z' }, { id: 8, action: 'update', created: '2026-10-04T09:00:00Z' }] } : { readEventsVisible: false, results: [{ id: 8, action: 'update', created: '2026-10-04T09:00:00Z' }] } })
		}
		return Promise.resolve({ data: { results: [] } })
	})
}

async function mountManage(content) {
	const w = mount(CnTimelineWidget, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', content: { manage: true, ...content } },
		global: { stubs },
	})
	await flushPromises()
	return w
}

const trailCalls = () => axios.get.mock.calls.filter(([url]) => url === TRAIL)

beforeEach(() => {
	axios.get.mockReset()
})

describe('who read the record', () => {
	it('offers the switch only when asked, off, and says the list holds changes only', async () => {
		reads()
		const plain = await mountManage({})
		expect(plain.find('[data-testid="cn-timeline-include-reads"]').exists()).toBe(false)

		const w = await mountManage({ readsToggle: 'Also who read the case' })
		expect(w.find('[data-testid="cn-timeline-include-reads"]').text()).toBe('Also who read the case')
		expect(w.find('[data-testid="cn-timeline-count"]').text()).toBe('1 of 1 events, changes only')
		// One read of the trail asks whether reads are given to this reader.
		expect(trailCalls()).toHaveLength(1)
	})

	it('offers no switch to a reader OpenRegister does not give reads', async () => {
		reads({ visible: false })
		const w = await mountManage({ readsToggle: true })
		expect(w.find('[data-testid="cn-timeline-include-reads"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-timeline-count"]').text()).toBe('1 of 1 events')
	})

	it('puts the reads among the entries, newest first, without actions', async () => {
		reads()
		const w = await mountManage({ readsToggle: true })
		await w.find('[data-testid="cn-timeline-include-reads"] input').setValue(true)
		await flushPromises()
		expect(trailCalls().at(-1)[1]).toEqual({ params: { action: 'read', limit: 50 } })
		const entries = w.findAll('[data-testid="cn-timeline-entry"]')
		expect(entries).toHaveLength(2)
		expect(entries[0].text()).toContain('Fatma Kaya')
		expect(entries[0].text()).toContain('Opened the record')
		expect(entries[0].find('.cn-timeline-manage__actions').exists()).toBe(false)
		expect(w.find('[data-testid="cn-timeline-count"]').text()).toBe('2 of 2 events')
	})

	it('offers no switch when the trail cannot be read, and the history still shows', async () => {
		reads({ trailFails: true })
		const w = await mountManage({ readsToggle: true })
		expect(w.find('[data-testid="cn-timeline-include-reads"]').exists()).toBe(false)
		expect(w.findAll('[data-testid="cn-timeline-entry"]')).toHaveLength(1)
		expect(w.find('[data-testid="cn-timeline-error"]').exists()).toBe(false)
	})
})
