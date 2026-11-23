/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTimelineWidget `manage: true` with `auditTrailLink`: a link beside the
 * event count opens the object sidebar on its audit trail tab, and is absent
 * when the page has no object sidebar.
 *
 * @spec openspec/changes/timeline-audit-trail-link/specs/timeline/spec.md
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
const { reactive } = require('vue')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const TIMELINE = '/index.php/apps/openregister/api/objects/reg/case/c-1/timeline'

const stubs = {
	NcButton: { props: ['disabled', 'type', 'variant'], emits: ['click'], template: '<button v-bind="$attrs" :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcSelect: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcNoteCard: true,
	NcCheckboxRadioSwitch: true,
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url) => {
		if (url === TIMELINE) {
			return Promise.resolve({ data: { canManage: false, results: [{ id: 'e1', message: 'Gebeld', kind: '', author: 'ann', created: '2026-10-01T09:00:00Z', visibility: 'internal' }] } })
		}
		return Promise.resolve({ data: { results: [] } })
	})
})

async function mountManage(content, provide = {}) {
	const wrapper = mount(CnTimelineWidget, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', content: { manage: true, ...content } },
		global: { stubs, provide },
	})
	await flushPromises()
	return wrapper
}

describe('CnTimelineManage auditTrailLink', () => {
	it('opens the object sidebar on its audit trail tab', async () => {
		const objectSidebarState = reactive({ open: false, requestedTab: null })
		const wrapper = await mountManage({ auditTrailLink: true }, { objectSidebarState })
		const link = wrapper.find('[data-testid="cn-timeline-audit-link"]')
		expect(link.exists()).toBe(true)
		expect(link.text()).toBe('Full audit trail in the sidebar')
		await link.trigger('click')
		expect(objectSidebarState.open).toBe(true)
		expect(objectSidebarState.requestedTab).toBe('auditTrail')
	})

	it('takes its own label', async () => {
		const objectSidebarState = reactive({ open: false, requestedTab: null })
		const wrapper = await mountManage({ auditTrailLink: 'Every change' }, { objectSidebarState })
		expect(wrapper.find('[data-testid="cn-timeline-audit-link"]').text()).toBe('Every change')
	})

	it('opens a tab the page declares under its own id', async () => {
		const objectSidebarState = reactive({ open: false, requestedTab: null })
		const wrapper = await mountManage({ auditTrailLink: true, auditTrailTab: 'audit' }, { objectSidebarState })
		await wrapper.find('[data-testid="cn-timeline-audit-link"]').trigger('click')
		expect(objectSidebarState.requestedTab).toBe('audit')
	})

	it('is absent without an object sidebar or without the key', async () => {
		const noSidebar = await mountManage({ auditTrailLink: true })
		expect(noSidebar.find('[data-testid="cn-timeline-audit-link"]').exists()).toBe(false)
		const noKey = await mountManage({}, { objectSidebarState: reactive({ open: false, requestedTab: null }) })
		expect(noKey.find('[data-testid="cn-timeline-audit-link"]').exists()).toBe(false)
	})
})
