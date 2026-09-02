/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailWidgetHost — `requiredApp`.
 *
 * A widget may lean on another Nextcloud app: its data lives in that app's
 * register, or its component comes from that app's integration leaf. When the
 * app is absent the widget must render its normal chrome and a set-up state,
 * and must ask its backend nothing.
 *
 * The load-bearing assertion in every case below is the NEGATIVE one — that the
 * real widget did not render. A test that only checks the set-up text appears
 * would pass just as happily if both rendered, which is the bug.
 *
 * Why not hide it instead: a hidden widget leaves a hole a reader cannot
 * interpret, and letting the query run is worse. dossiq's hours tile aggregated
 * humaniq's register; on an install without humaniq the request 404'd and the
 * tile rendered `0` — indistinguishable from a real zero, on every case, in
 * every such install, looking correct throughout.
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { __resetAppInstalledCacheForTests } from '../../src/utils/appInstalled.js'

/** A schema the `data` widget will accept, so it renders when NOT guarded. */
const SCHEMA = {
	type: 'object',
	properties: { title: { type: 'string', title: 'Title' } },
}

function mountHost(widget, extra = {}) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget,
			schemaObject: SCHEMA,
			object: { title: 'A case' },
			objectId: 'case-1',
			...extra,
		},
		global: { stubs: { CnIcon: true } },
	})
}

/**
 * The set-up state's text.
 *
 * NcEmptyContent is auto-stubbed by this project's jest config, so its `name`
 * and `description` arrive as ATTRIBUTES rather than rendered text. Reading
 * them is also the more precise assertion: it pins the exact strings rather
 * than a substring of whatever else the page happens to render.
 *
 * @param {object} wrapper The mounted host.
 * @return {{name: string, description: string}} The set-up copy.
 */
function setupState(wrapper) {
	const el = wrapper.find('.NcEmptyContent')
	return {
		name: el.exists() ? el.attributes('name') || '' : '',
		description: el.exists() ? el.attributes('description') || '' : '',
	}
}

/** Declare which apps this page load can see. */
function installApps(...ids) {
	global.OC = { appswebroots: Object.fromEntries(ids.map((id) => [id, `/apps/${id}`])) }
	__resetAppInstalledCacheForTests()
}

describe('CnDetailWidgetHost — requiredApp', () => {
	beforeEach(() => installApps())
	afterEach(() => {
		delete global.OC
		__resetAppInstalledCacheForTests()
	})

	const guarded = {
		id: 'case-hours',
		type: 'data',
		title: 'Hours booked',
		requiredApp: 'humaniq',
	}

	describe('when the required app is absent', () => {
		it('renders the set-up state INSTEAD of the widget', () => {
			const w = mountHost(guarded)
			// The negative half is the point: the data widget must not render,
			// because rendering it is what fires the query that 404s.
			expect(w.findComponent({ name: 'CnObjectDataWidget' }).exists()).toBe(false)
			expect(setupState(w).name).toBe('Humaniq is not installed')
		})

		it('still says WHICH widget is inert', () => {
			// A bare "not installed" box on a busy detail page tells the reader
			// nothing about what they are missing — the title has to survive
			// into both the chrome and the description.
			const w = mountHost(guarded)
			expect(w.text()).toContain('Hours booked')
			expect(setupState(w).description).toBe(
				'Hours booked needs the Humaniq app. Install and enable it to see this.',
			)
		})

		it('reads requiredApp from `content` as well as the definition', () => {
			const w = mountHost({
				id: 'case-hours',
				type: 'data',
				title: 'Hours booked',
				content: { requiredApp: 'humaniq' },
			})
			expect(w.findComponent({ name: 'CnObjectDataWidget' }).exists()).toBe(false)
			expect(setupState(w).name).toBe('Humaniq is not installed')
		})

		it('guards a NON-data widget too — the rule is about the app, not the type', () => {
			const w = mountHost({
				id: 'case-decisions',
				type: 'object-list',
				title: 'Decisions',
				requiredApp: 'decidiq',
				content: { register: 'decidiq', schema: 'Decision' },
			})
			expect(setupState(w).name).toBe('Decidiq is not installed')
		})
	})

	describe('when the required app is present', () => {
		it('renders the real widget and no set-up state', () => {
			installApps('humaniq')
			const w = mountHost(guarded)
			expect(w.findComponent({ name: 'CnObjectDataWidget' }).exists()).toBe(true)
			expect(w.find('.NcEmptyContent').exists()).toBe(false)
		})
	})

	describe('when no app is declared', () => {
		it('never guards — the vast majority of widgets are unaffected', () => {
			const w = mountHost({ id: 'case-core', type: 'data', title: 'Core case data' })
			expect(w.findComponent({ name: 'CnObjectDataWidget' }).exists()).toBe(true)
			expect(w.find('.NcEmptyContent').exists()).toBe(false)
		})
	})
})
