/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnRelatedObjectsWidget shows each section when its own request returns.
 *
 * 🔴 `loadTabs()` used to wait for relations, uses, used, contracts and files
 * together behind one `Promise.all`. On pipelinq's lead page the relations
 * call answers in 0.45 s and uses/used take about 9 s, so the card said
 * "Loading …" for nine seconds while the mails it could show were already
 * in. These hold uses/used open on purpose and assert the fast section is on
 * screen before they settle.
 */

import { mount } from '@vue/test-utils'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

jest.mock('@nextcloud/router', () => ({
	generateUrl: (tpl, params = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => params[k]),
}))

const stubs = {
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /><slot name="footer" /></div>' },
	CnIcon: true,
	FileTreeOutline: true,
	Paperclip: true,
	ChevronRight: true,
}

const SELF = { '@self': { register: 'crm', schema: 'lead', id: 'L1' } }

/**
 * Let pending microtasks run and Vue re-render.
 *
 * @return {Promise<void>}
 */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 0))
	await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * A fetch mock whose answer per suffix is released by the test.
 *
 * @param {object} bodies Suffix to JSON body; a suffix listed in `held` waits.
 * @param {string[]} held Suffixes whose response waits for `release()`.
 * @param {object} [statuses] Suffix to HTTP status (default 200).
 * @return {{ fetch: Function, release: Function }}
 */
function controlledFetch(bodies, held, statuses = {}) {
	const waiting = []
	const respond = (suffix) => {
		const status = statuses[suffix] ?? 200
		return { ok: status < 400, status, json: () => Promise.resolve(bodies[suffix] ?? {}) }
	}
	const fetch = jest.fn((url) => {
		const suffix = String(url).split('/').pop()
		if (held.includes(suffix)) {
			return new Promise((resolve) => waiting.push(() => resolve(respond(suffix))))
		}
		return Promise.resolve(respond(suffix))
	})
	return { fetch, release: () => waiting.splice(0).forEach((go) => go()) }
}

const tabLabels = (wrapper) => wrapper.findAll('.cn-related-objects-widget__tab-label').map((w) => w.text())

describe('CnRelatedObjectsWidget — progressive sections', () => {
	beforeEach(() => {
		integrations.__resetForTests()
		global.OC = { requestToken: 'tok' }
	})

	afterEach(() => {
		delete global.fetch
		delete global.OC
	})

	it('🔴 shows the relations section before the slow uses/used calls return', async () => {
		const { fetch, release } = controlledFetch({
			relations: { emails: { results: [{ id: 'm1', subject: 'Offer' }], total: 1 } },
			uses: { results: [{ id: 'o1', title: 'Account' }], total: 1 },
			used: { results: [], total: 0 },
			files: { results: [], total: 0 },
		}, ['uses', 'used'])
		global.fetch = fetch

		const wrapper = mount(CnRelatedObjectsWidget, { propsData: { objectData: SELF, hideSingleTabTitle: false }, stubs })
		await flush()

		expect(tabLabels(wrapper)).toContain('Mails')
		expect(wrapper.text()).toContain('Offer')
		expect(wrapper.find('[data-testid="cn-related-pending"]').text()).toContain('Objects')
		expect(wrapper.text()).not.toContain(wrapper.vm.loadingLabel)

		release()
		await flush()

		// Objects joins in its fixed place before Mails, and the panel the
		// reader already sees stays open.
		expect(tabLabels(wrapper)).toEqual(['Objects', 'Mails'])
		expect(wrapper.text()).toContain('Offer')
		expect(wrapper.find('[data-testid="cn-related-pending"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('🔴 names a section whose request failed, and still shows the others', async () => {
		const { fetch } = controlledFetch({
			relations: { emails: { results: [{ id: 'm1', subject: 'Offer' }], total: 1 } },
			uses: { results: [], total: 0 },
			used: { results: [], total: 0 },
		}, [], { files: 500 })
		global.fetch = fetch

		const wrapper = mount(CnRelatedObjectsWidget, { propsData: { objectData: SELF, hideSingleTabTitle: false }, stubs })
		await flush()

		expect(tabLabels(wrapper)).toEqual(['Mails'])
		const errors = wrapper.findAll('[data-testid="cn-related-section-error"]')
		expect(errors).toHaveLength(1)
		expect(errors[0].attributes('data-section')).toBe('files')
		expect(errors[0].text()).toBe('Could not load Files.')
		wrapper.unmount()
	})

	it('drops answers from a load that a newer load replaced', async () => {
		const first = controlledFetch({
			relations: { emails: { results: [{ id: 'old', subject: 'Stale' }], total: 1 } },
		}, ['relations', 'uses', 'used', 'files'])
		global.fetch = first.fetch
		const wrapper = mount(CnRelatedObjectsWidget, { propsData: { objectData: SELF, hideSingleTabTitle: false }, stubs })
		await flush()

		global.fetch = controlledFetch({
			relations: { emails: { results: [{ id: 'new', subject: 'Fresh' }], total: 1 } },
			uses: { results: [], total: 0 },
			used: { results: [], total: 0 },
			files: { results: [], total: 0 },
		}, []).fetch
		await wrapper.vm.loadTabs()
		first.release()
		await flush()

		expect(wrapper.text()).toContain('Fresh')
		expect(wrapper.text()).not.toContain('Stale')
		wrapper.unmount()
	})
})
