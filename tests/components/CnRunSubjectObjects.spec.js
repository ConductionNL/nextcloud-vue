/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A run that changed nothing still has objects, and the panel must say so.
 *
 * THE DEFECT
 * ----------
 * The Objects panel was filled from `GET /flow-runs/{uuid}/objects`, which
 * answers the AUDIT: the objects this run CHANGED. A run that waited on a
 * locked object and then failed changed nothing, so that endpoint answers
 * `nodes: []` while the run's own error reads:
 *
 *   "Waited as long as allowed for object 2e98a265-…, and it is still locked"
 *
 * and the panel said "this run changed no objects", with the object named in
 * the error one line above it. Reported from a live instance: the reader
 * expected to find that object in the list and found an empty one.
 *
 * WHERE THE ANSWER WAS ALL ALONG
 * ------------------------------
 * On the run's own record, which `inspectRun` fetched and then threw away
 * except for its log and version. `subjects` is what the run was started on,
 * `placeItems` is what it is holding at a step. Both are listed now, under
 * their own heading, because "worked on" and "changed" are different claims.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowSidebar from '../../src/components/CnFlowDetail/CnFlowSidebar.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const CASE_UUID = '2e98a265-401c-426f-9dc5-1e07f7f442c9'

/** The shape the server answers, trimmed to what this panel reads. */
const FAILED_RUN = {
	uuid: 'run-1',
	status: 'failed',
	created: '2026-09-05T15:59:48+00:00',
	error: `Waited as long as allowed for object ${CASE_UUID}, and it is still locked`,
	subjects: {
		trigger: { uuid: CASE_UUID, register: 'dossiq', schema: 'case' },
	},
	placeItems: {
		lock: [{ json: { id: CASE_UUID, title: 'Dakkapel Kerkstraat 12' } }],
	},
}

/**
 * Mount the sidebar over a store seeded with the given state.
 *
 * @param {object} state Store overrides.
 * @return {Promise<object>} The wrapper and the store.
 */
async function mountSidebar(state = {}) {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowSidebar, {
		global: {
			stubs: {
				NcAppSidebar: { template: '<aside class="app-sidebar"><slot name="description" /><slot /></aside>' },
				NcAppSidebarTab: { template: '<div class="app-sidebar-tab" :data-tab="name"><slot /></div>', props: ['name'] },
				NcActions: { template: '<div><slot /></div>' },
				NcActionButton: { template: '<button><slot /></button>' },
				NcButton: { template: '<button><slot /></button>' },
				NcCheckboxRadioSwitch: true,
				NcSelect: true,
				NcTextField: true,
				CnFlowSettingsModal: true,
				Cog: true,
				History: true,
				Sitemap: true,
			},
			mocks: { t: (app, s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '') },
		},
	})

	Object.assign(wrapper.vm.store, {
		flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
		runs: [],
		inspectedRunUuid: 'run-1',
		runDetail: FAILED_RUN,
		runObjects: [],
		...state,
	})
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('the Objects panel of a run that changed nothing', () => {
	it('lists the object the run is about, which the audit list cannot hold', async () => {
		const wrapper = await mountSidebar()

		const subjects = wrapper.find('[data-testid="flow-run-subjects"]')
		expect(subjects.exists()).toBe(true)
		expect(subjects.text()).toContain(CASE_UUID)
		// The title comes from the item held at the step; the subject record
		// carries only a uuid, and a bare uuid names nothing a reader knows.
		expect(subjects.text()).toContain('Dakkapel Kerkstraat 12')
	})

	it('separates the parts of a row, rather than running them together', async () => {
		const wrapper = await mountSidebar()

		// 🔴 WHAT THE LIVE INSTANCE SHOWED: "triggerDakkapel Kerkstraat
		// 122e98a265-401c-426f-9dc5-1e07f7f442c9". Three adjacent spans with
		// nothing between them read as one string, and a CSS gap would fix
		// only the look: the text itself is what anything reading the DOM
		// gets, so the separator has to be a character.
		const row = wrapper.find('[data-testid="flow-run-subjects"] li').text()

		expect(row).toMatch(/trigger\s*·\s*Dakkapel Kerkstraat 12/)
		expect(row).toMatch(/Dakkapel Kerkstraat 12\s*·\s*2e98a265/)
	})

	it('names the role, so a subject is not confused with a change', async () => {
		const wrapper = await mountSidebar()

		expect(wrapper.find('[data-testid="flow-run-subjects"]').text()).toContain('trigger')
		// And the panel still says, truthfully, that nothing was changed.
		expect(wrapper.find('[data-testid="flow-run-panel-objects"]').text())
			.toContain('This run changed no objects.')
	})

	it('lists one row per object, not one per place it appears in', async () => {
		const wrapper = await mountSidebar()

		// The same case is the subject AND the item held at `lock`. Two rows
		// would read as two objects, which is the wrong answer to "what is this
		// run stuck on".
		const rows = wrapper.findAll('[data-testid="flow-run-subjects"] li')
		expect(rows).toHaveLength(1)
	})

	it('names the step an object is waiting at when there is no subject record', async () => {
		const wrapper = await mountSidebar({
			runDetail: { ...FAILED_RUN, subjects: {} },
		})

		// A run started by hand has no `subjects` entry; what it holds is still
		// the answer to which object it is stuck on, and at which step.
		expect(wrapper.find('[data-testid="flow-run-subjects"]').text()).toContain('at lock')
	})

	it('shows no subject list when the run names no objects at all', async () => {
		const wrapper = await mountSidebar({
			runDetail: { ...FAILED_RUN, subjects: {}, placeItems: {} },
		})

		// An empty heading over an empty list is chrome around nothing.
		expect(wrapper.find('[data-testid="flow-run-subjects"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="flow-run-panel-objects"]').text())
			.toContain('This run changed no objects.')
	})

	it('reads the run’s own record, so a deep-linked run is not blank', async () => {
		// The history list is capped at 25 and a `?run=` link can name a run
		// outside it. Reading only that list left such a run with no status and
		// no error on screen, which reads as a run that recorded nothing.
		const wrapper = await mountSidebar({ runs: [] })

		expect(wrapper.find('[data-testid="run-status"]').text()).toBe('failed')
		expect(wrapper.find('[data-testid="run-error"]').text()).toContain(CASE_UUID)
	})
})
