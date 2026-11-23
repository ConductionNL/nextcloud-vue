/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The interaction form's submit label on a dashboard, through the real chain:
 * CnAppRoot (with the host's translate) > CnDashboardPage > the widget.
 *
 * A dashboard binds a widget's `content` keys as attributes as well as passing
 * `content`. The widget does not declare `submitLabel` as a prop, so the raw
 * text fell through to CnFormWidgetBase and replaced the translated label: a
 * Dutch reader of pipelinq's werkplek saw "Save contact moment" while the
 * channel labels beside it were Dutch.
 *
 * @spec openspec/changes/interaction-form-fits-and-reads-dutch/specs/interaction-form-widget/spec.md#requirement-the-interaction-form-fits-its-card-and-reads-in-the-readers-language
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	objects: {},
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	unregisterObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	fetchSchema: jest.fn().mockResolvedValue({ properties: {} }),
	getSchema: jest.fn(() => null),
	saveObject: jest.fn(),
	getCollection: jest.fn(() => []),
	isLoading: jest.fn(() => false),
	getError: jest.fn(() => null),
}
jest.mock('../../src/store/index.js', () => ({ __esModule: true, useObjectStore: () => mockStore, createObjectStore: () => () => mockStore }))
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnAppRoot from '../../src/components/CnAppRoot/CnAppRoot.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnFormWidgetBase from '../../src/components/CnFormWidgetBase/CnFormWidgetBase.vue'
import { registerTranslations } from '../../src/l10n/index.js'

const widgets = [{
	id: 'interaction',
	type: 'interaction-form',
	title: 'New contact moment',
	content: {
		register: 'pipelinq',
		schema: 'ticket',
		channels: [{ value: 'telefoon', label: 'Phone' }],
		submitLabel: 'Save contact moment',
	},
}]
const layout = [{ id: 'wi', widgetId: 'interaction', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 8 }]
const manifest = {
	id: 'pipelinq',
	menu: [],
	pages: [{ id: 'KccWerkplek', route: '/werkplek', type: 'dashboard', title: 'Customer Support', config: { widgets, layout } }],
}

const WerkplekPage = { render: () => h(CnDashboardPage, { title: 'Customer Support', widgets, layout }) }
const stubs = {
	'router-view': WerkplekPage,
	RouterView: WerkplekPage,
	CnResourceSelect: { template: '<div />' },
	CnDashboardGrid: {
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
		template: '<div><div v-for="item in layout" :key="item.id"><slot name="widget" :item="item" /></div></div>',
	},
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mount the werkplek under CnAppRoot and return the form the widget renders.
 *
 * @param {Function} translate The host app's translate.
 * @return {Promise<object>} The CnFormWidgetBase wrapper.
 */
async function mountForm(translate) {
	const wrapper = mount({ render: () => h(CnAppRoot, { manifest, appId: 'pipelinq', translate, requiresApps: [] }) }, {
		mocks: { $route: { name: 'KccWerkplek', params: {}, query: {} } },
		stubs,
	})
	await flush()
	await flush()
	return wrapper.findComponent(CnFormWidgetBase)
}

describe('the interaction form on a dashboard', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('shows the host app\'s translation of the submit label', async () => {
		const form = await mountForm((key) => (key === 'Save contact moment' ? 'Contactmoment opslaan' : key))

		expect(form.props('submitLabel')).toBe('Contactmoment opslaan')
	})

	it('falls back to the library catalogue when the host has none', async () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		const form = await mountForm((key) => key)

		expect(form.props('submitLabel')).toBe('Contactmoment opslaan')
	})

	it('keeps the written label when nothing translates it', async () => {
		const form = await mountForm((key) => key)

		expect(form.props('submitLabel')).toBe('Save contact moment')
	})

	it('still hands other attributes to the form', async () => {
		const form = await mountForm((key) => key)

		expect(form.attributes('register')).toBe('pipelinq')
	})
})
