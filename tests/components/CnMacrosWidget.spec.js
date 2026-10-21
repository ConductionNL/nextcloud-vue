/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The macros widget (DqZaakAssistent "Macro's"): what the record's schema
 * declares as a macro, a button that runs it through OpenRegister's
 * declared-action endpoint, and the last run from the audit trail.
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/event-bus', () => ({
	__esModule: true,
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

const axios = require('@nextcloud/axios').default
const { emit } = require('@nextcloud/event-bus')
const CnMacrosWidget = require('../../src/components/CnMacrosWidget/CnMacrosWidget.vue').default
const { declaredMacros, pickMacros } = require('../../src/utils/declaredMacros.js')
const { DASHBOARD_CATALOG_WIDGET_KEYS } = require('../../src/utils/libraryWidgetKeys.js')

/**
 * An OpenRegister that predates the object-actions list: its actions and
 * history routes answer 404, so the widget reads the schema's declared macros
 * and the audit trail, as it did before object-actions-ui.
 *
 * @param {(url: string) => Promise<object>} impl The other routes.
 * @return {(url: string, options?: object) => Promise<object>}
 */
function oldServer(impl) {
	return (url, options) => (/\/actions(\/history)?$/.test(url)
		? Promise.reject({ response: { status: 404, data: {} } })
		: impl(url, options))
}

const SCHEMA = {
	configuration: {
		'x-openregister-action': {
			'woo-finish': { name: 'Woo-verzoek afronden', description: 'Status naar Besluit', macro: true, flow: 'f-1' },
			suspend: { name: 'Opschorten voor aanvulling', macro: true, flow: 'f-2' },
			publish: { name: 'Publiceren' },
			broken: { name: 'Zonder flow', macro: true },
		},
	},
}
const OBJECT = { id: 'c-1', '@self': { id: 'c-1', register: '5', schema: '9' } }

function mountWidget() {
	return mount(CnMacrosWidget, { props: { objectData: OBJECT, objectId: 'c-1', content: {} } })
}

beforeEach(() => {
	jest.clearAllMocks()
	axios.get.mockImplementation(oldServer((url) => Promise.resolve(url.includes('/audit-trails')
		? { data: { results: [{ created: '2026-10-06T10:00:00Z', changed: { declaredAction: 'suspend', changes: [{ step: 'termijn opgeschort', kind: 'write' }, { step: 'bericht verstuurd', kind: 'message' }] } }] } }
		: { data: SCHEMA })))
	axios.post.mockResolvedValue({ data: { run: 'r-1', outcome: 'completed' } })
})

describe('pickMacros', () => {
	const declared = declaredMacros(SCHEMA)

	it('keeps every macro when the widget reads no list', () => {
		expect(pickMacros(declared, undefined, false)).toBe(declared)
	})

	it('keeps the listed keys in the list\'s order, skipping unknown ones', () => {
		expect(pickMacros(declared, ['suspend', 'nope', 'woo-finish'], true).map((m) => m.key)).toEqual(['suspend', 'woo-finish'])
	})

	it('keeps none when the record lists none', () => {
		expect(pickMacros(declared, undefined, true)).toEqual([])
	})
})

describe('declaredMacros', () => {
	it('keeps the declared actions that are macros with a flow, in order', () => {
		expect(declaredMacros(SCHEMA).map((m) => m.key)).toEqual(['woo-finish', 'suspend'])
		expect(declaredMacros(SCHEMA)[1]).toEqual({ key: 'suspend', name: 'Opschorten voor aanvulling', description: '' })
	})

	it('finds none on a schema that declares none', () => {
		expect(declaredMacros(null)).toEqual([])
		expect(declaredMacros({ configuration: {} })).toEqual([])
	})
})

describe('CnMacrosWidget', () => {
	it('lists the macros of the record\'s schema and its last run', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(axios.get.mock.calls[0][0]).toContain('/apps/openregister/api/objects/5/9/c-1/actions')
		expect(axios.get.mock.calls.some(([url]) => url.includes('/apps/openregister/api/schemas/9'))).toBe(true)
		expect(w.findAll('.cn-macros-widget__name').map((n) => n.text())).toEqual(['Woo-verzoek afronden', 'Opschorten voor aanvulling'])
		expect(w.find('[data-testid="cn-macros-widget-last-run"]').text()).toContain('Opschorten voor aanvulling')
		expect(w.find('[data-testid="cn-macros-widget-last-run"]').text()).toContain('2 changes: termijn opgeschort, bericht verstuurd')
	})

	it('runs a macro through the declared-action endpoint and refreshes the page', async () => {
		const w = mountWidget()
		await flushPromises()
		axios.get.mockImplementation(oldServer((url) => Promise.resolve(url.includes('/audit-trails')
			? { data: { results: [{ created: '2026-10-07T10:00:00Z', changed: { declaredAction: 'woo-finish', changes: [{ step: 'status naar Besluit', kind: 'write' }] } }] } }
			: { data: SCHEMA })))
		await w.find('[data-testid="cn-macros-widget-run-woo-finish"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-macros-widget-last-run"]').text()).toContain('1 change: status naar Besluit')
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/objects/5/9/c-1/actions/woo-finish')
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', expect.any(Object))
		expect(w.find('[data-testid="cn-macros-widget-last-run"]').text()).toContain('Woo-verzoek afronden')
	})

	it('says so when a run is refused, and invents no last run', async () => {
		axios.post.mockRejectedValue({ response: { data: { error: 'You may not perform "woo-finish" on this object.' } } })
		const w = mountWidget()
		await flushPromises()
		await w.find('[data-testid="cn-macros-widget-run-woo-finish"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-macros-widget-error"]').text()).toContain('You may not perform')
		expect(emit).not.toHaveBeenCalled()
	})

	it('shows its empty text when the schema declares no macros', async () => {
		axios.get.mockResolvedValue({ data: { configuration: {} } })
		const w = mountWidget()
		await flushPromises()
		expect(w.find('[data-testid="cn-macros-widget-empty"]').exists()).toBe(true)
	})

	it('names a macro in the app\'s language', async () => {
		const w = mount(CnMacrosWidget, {
			props: { objectData: OBJECT, objectId: 'c-1', content: {} },
			global: { provide: { cnTranslate: (key) => ({ 'Woo-verzoek afronden': 'Finish the Woo request' }[key] ?? key) } },
		})
		await flushPromises()
		expect(w.findAll('.cn-macros-widget__name')[0].text()).toBe('Finish the Woo request')
	})

	it('shows only the macros the record lists through macrosFrom, in its order', async () => {
		const w = mount(CnMacrosWidget, {
			props: { objectData: OBJECT, objectId: 'c-1', content: { macrosFrom: '@context.caseType.macros' } },
			global: { provide: { cnDetailVisibilityRows: { value: { caseType: { macros: ['suspend', 'publish', 'woo-finish'] } } } } },
		})
		await flushPromises()
		expect(w.findAll('.cn-macros-widget__name').map((n) => n.text())).toEqual(['Opschorten voor aanvulling', 'Woo-verzoek afronden'])
	})

	it('shows none for a record that lists none', async () => {
		const w = mount(CnMacrosWidget, {
			props: { objectData: OBJECT, objectId: 'c-1', content: { macrosFrom: '@context.caseType.macros' } },
			global: { provide: { cnDetailVisibilityRows: { value: { caseType: {} } } } },
		})
		await flushPromises()
		expect(w.find('[data-testid="cn-macros-widget-empty"]').exists()).toBe(true)
	})

	it('asks an endpoint which macros the record offers when macrosFrom is one', async () => {
		axios.get.mockImplementation(oldServer((url) => {
			if (url.includes('/case-macros/')) {
				return Promise.resolve({ data: { keys: ['woo-finish'] } })
			}
			return Promise.resolve(url.includes('/audit-trails') ? { data: { results: [] } } : { data: SCHEMA })
		}))
		const w = mount(CnMacrosWidget, {
			props: { objectData: OBJECT, objectId: 'c-1', content: { macrosFrom: { url: '/apps/dossiq/api/case-macros/@objectId', responsePath: 'keys' } } },
		})
		await flushPromises()
		expect(axios.get.mock.calls.some(([url]) => url.includes('/apps/dossiq/api/case-macros/c-1'))).toBe(true)
		expect(w.findAll('.cn-macros-widget__name').map((n) => n.text())).toEqual(['Woo-verzoek afronden'])
	})

	it('offers none when the endpoint refuses, never every macro', async () => {
		axios.get.mockImplementation(oldServer((url) => (url.includes('/case-macros/')
			? Promise.reject(new Error('403'))
			: Promise.resolve(url.includes('/audit-trails') ? { data: { results: [] } } : { data: SCHEMA }))))
		const w = mount(CnMacrosWidget, {
			props: { objectData: OBJECT, objectId: 'c-1', content: { macrosFrom: { url: '/apps/dossiq/api/case-macros/@objectId' } } },
		})
		await flushPromises()
		expect(w.find('[data-testid="cn-macros-widget-empty"]').exists()).toBe(true)
	})

	it('is a library widget key', () => {
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('macros')
	})
})

describe('CnMacrosWidget over the object-actions list', () => {
	const LIST = {
		actions: [
			{ key: 'woo-finish', kind: 'flow', label: 'Woo-verzoek afronden', description: 'Status naar Besluit', available: true },
			{ key: 'suspend', kind: 'steps', label: 'Opschorten voor aanvulling', available: false, reason: 'De termijn is al opgeschort' },
			{ key: 'note', kind: 'steps', label: 'Notitie toevoegen', available: true, inputs: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } },
			{ key: 'finish', kind: 'transition', label: 'Afronden', available: true },
		],
	}

	beforeEach(() => {
		axios.get.mockImplementation((url) => {
			if (url.endsWith('/actions')) {
				return Promise.resolve({ data: LIST })
			}
			if (url.endsWith('/actions/history')) {
				return Promise.resolve({ data: { results: [{ action: 'action.run', created: '2026-10-21T10:00:00Z', changed: { declaredAction: 'woo-finish', changes: [{ step: 'status naar Besluit', kind: 'write' }] } }] } })
			}
			return Promise.reject(new Error(`unexpected ${url}`))
		})
	})

	it('shows the listed flow and steps actions, not transitions, and does not read the schema', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(w.findAll('.cn-macros-widget__name').map((node) => node.text())).toEqual(['Woo-verzoek afronden', 'Opschorten voor aanvulling', 'Notitie toevoegen'])
		expect(axios.get.mock.calls.some(([url]) => url.includes('/api/schemas/'))).toBe(false)
		expect(w.find('[data-testid="cn-macros-widget-last-run"]').text()).toContain('1 change: status naar Besluit')
	})

	it('shows an unavailable macro disabled with its reason', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(w.find('[data-testid="cn-macros-widget-run-suspend"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-macros-widget-reason-suspend"]').text()).toBe('De termijn is al opgeschort')
	})

	it('keeps macrosFrom narrowing the list', async () => {
		const w = mount(CnMacrosWidget, {
			props: { objectData: OBJECT, objectId: 'c-1', content: { macrosFrom: '@context.caseType.macros' } },
			global: { provide: { cnDetailVisibilityRows: { value: { caseType: { macros: ['note', 'finish'] } } } } },
		})
		await flushPromises()
		expect(w.findAll('.cn-macros-widget__name').map((node) => node.text())).toEqual(['Notitie toevoegen'])
	})

	it('asks a macro\'s inputs in the object-action dialog', async () => {
		const w = mountWidget()
		await flushPromises()
		await w.find('[data-testid="cn-macros-widget-run-note"]').trigger('click')
		await flushPromises()
		expect(w.findComponent({ name: 'CnObjectActionDialog' }).exists()).toBe(true)
		expect(axios.post).not.toHaveBeenCalled()
	})
})
