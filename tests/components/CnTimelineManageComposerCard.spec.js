/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The manage timeline's note form as its own card (board DqZaakHistorie,
 * "Notitie toevoegen"): `composer: "only"` draws the form alone,
 * `composer: "separate"` keeps the list's "Add note" without a form, and a
 * note saved in the form card reloads the list.
 *
 * @spec openspec/changes/timeline-composer-card/specs/timeline/spec.md
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))
jest.mock('@nextcloud/event-bus', () => {
	const handlers = {}
	return {
		subscribe: (name, fn) => { (handlers[name] = handlers[name] || []).push(fn) },
		unsubscribe: (name, fn) => { handlers[name] = (handlers[name] || []).filter((h) => h !== fn) },
		emit: (name, payload) => (handlers[name] || []).slice().forEach((fn) => fn(payload)),
	}
})

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const TIMELINE = '/index.php/apps/openregister/api/objects/reg/case/c-1/timeline'

const stubs = {
	NcButton: { props: ['disabled', 'type', 'variant'], emits: ['click'], template: '<button v-bind="$attrs" :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcSelect: true,
	NcLoadingIcon: true,
	NcEmptyContent: { props: ['name'], template: '<div v-bind="$attrs">{{ name }}</div>' },
	NcNoteCard: { template: '<div v-bind="$attrs"><slot /></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" v-bind="$attrs" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)">' },
}

function reads() {
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/timeline/kinds') || url.endsWith('/timeline/text-blocks')) {
			return Promise.resolve({ data: { results: [] } })
		}
		if (url === TIMELINE) {
			return Promise.resolve({ data: { canManage: true, results: [{ id: 'e1', message: 'Gebeld', author: 'ann', created: '2026-10-01T09:00:00Z' }] } })
		}
		return Promise.reject(new Error(`unexpected ${url}`))
	})
}

async function mountManage(content) {
	const wrapper = mount(CnTimelineWidget, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', content: { manage: true, ...content } },
		attachTo: document.body,
		global: { stubs },
	})
	await flushPromises()
	return wrapper
}

const timelineReads = () => axios.get.mock.calls.filter(([url]) => url === TIMELINE).length

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	reads()
})

describe('the note form as its own card', () => {
	it('draws the form alone with composer "only", checkbox and button on one row', async () => {
		const form = await mountManage({ composer: 'only' })
		expect(form.find('[data-testid="cn-timeline-composer"]').exists()).toBe(true)
		expect(form.find('[data-testid="cn-timeline-list"]').exists()).toBe(false)
		expect(form.find('[data-testid="cn-timeline-add-note"]').exists()).toBe(false)
		expect(form.find('.cn-timeline-manage__composer-title').exists()).toBe(false)
		const foot = form.find('.cn-timeline-manage__composer-foot')
		expect(foot.find('[data-testid="cn-timeline-draft-public"]').exists()).toBe(true)
		expect(foot.find('[data-testid="cn-timeline-save"]').exists()).toBe(true)
		form.unmount()
	})

	it('keeps "Add note" on the list without a form, and focuses the form card', async () => {
		const list = await mountManage({ composer: 'separate' })
		const form = await mountManage({ composer: 'only' })
		expect(list.find('[data-testid="cn-timeline-composer"]').exists()).toBe(false)
		await list.find('[data-testid="cn-timeline-add-note"]').trigger('click')
		expect(document.activeElement).toBe(form.find('[data-testid="cn-timeline-draft"]').element)
		list.unmount()
		form.unmount()
	})

	it('reloads the list when a note is saved in the form card', async () => {
		const list = await mountManage({ composer: 'separate' })
		const form = await mountManage({ composer: 'only' })
		axios.post.mockResolvedValue({ data: {} })
		const before = timelineReads()
		await form.find('[data-testid="cn-timeline-draft"]').setValue('Advies is binnen')
		await form.find('[data-testid="cn-timeline-composer"]').trigger('submit')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post.mock.calls[0][0]).toBe(TIMELINE)
		// The form reads again, and so does the list beside it.
		expect(timelineReads() - before).toBe(2)
		list.unmount()
		form.unmount()
	})
})
