/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Page-level chrome (dashboard / detail / index page headings, section
 * headings, empty-state copy and declarative action labels) is run through
 * the host translate function — the `cnTranslate` CnAppRoot provides.
 *
 * Every surface is asserted twice: with a translate fn (renders the
 * translation) and without one (the no-op control — the raw manifest source
 * string, byte-identical to what shipped before). Record DATA (an object's
 * display name) is asserted to stay untouched: only manifest chrome is
 * translated.
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	objects: {},
	registerObjectType: jest.fn(),
	unregisterObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Item', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Item', properties: {} })),
	saveObject: jest.fn().mockResolvedValue({ id: '1' }),
	deleteObject: jest.fn().mockResolvedValue(true),
	getCollection: jest.fn(() => []),
	isLoading: jest.fn(() => false),
	getError: jest.fn(() => null),
	getPagination: jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 })),
	setSearchTerm: jest.fn(),
	getSearchTerm: jest.fn(() => ''),
	getFacets: jest.fn(() => ({})),
	_options: { baseUrl: '/apps/openregister/api/objects' },
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@nextcloud/event-bus', () => ({
	__esModule: true,
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))
jest.mock('../../src/utils/actionsDispatcher.js', () => {
	const actual = jest.requireActual('../../src/utils/actionsDispatcher.js')
	return {
		__esModule: true,
		dispatchAction: jest.fn(() => Promise.resolve({ ok: true })),
		resolveObjectOpType: jest.fn(() => 'crm/lead'),
		buildOnSuccessRoute: actual.buildOnSuccessRoute,
		savedObjectId: actual.savedObjectId,
	}
})
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	__esModule: true,
	fetchEndpointSource: jest.fn(() => Promise.resolve(null)),
}))
jest.mock('../../src/utils/visibleWhen.js', () => ({
	__esModule: true,
	evaluateVisibleWhen: jest.fn(() => Promise.resolve(true)),
}))

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const dict = {
	Overview: 'Overzicht',
	'Everything at a glance': 'Alles in één oogopslag',
	Case: 'Zaak',
	'The case record': 'Het zaakdossier',
	Statistics: 'Statistieken',
	'No items found': 'Geen resultaten',
	'No items': 'Geen items',
	Approve: 'Goedkeuren',
	'Approve this lead?': 'Deze lead goedkeuren?',
	Open: 'Open',
	Closed: 'Gesloten',
}
const translate = (key) => dict[key] ?? key
const provideTranslate = { cnTranslate: translate }

describe('CnDashboardPage — page title + description', () => {
	const stubs = {
		CnDashboardGrid: { props: ['layout'], template: '<div />' },
		NcButton: { template: '<button><slot /></button>' },
		NcEmptyContent: { template: '<div />' },
		NcLoadingIcon: { template: '<div />' },
		CnActionsMenu: { template: '<div />' },
		CnOpenBuildEditButton: { template: '<div />' },
	}
	const mountDash = (provide) => mount(CnDashboardPage, {
		propsData: { title: 'Overview', description: 'Everything at a glance', widgets: [], layout: [] },
		stubs,
		...(provide ? { provide } : {}),
	})

	it('translates the heading and description via the injected cnTranslate', () => {
		const w = mountDash(provideTranslate)
		expect(w.find('.cn-dashboard-page__title').text()).toBe('Overzicht')
		expect(w.find('.cn-dashboard-page__description').text()).toBe('Alles in één oogopslag')
	})

	it('renders the raw source strings with no translator (no-op control)', () => {
		const w = mountDash(null)
		expect(w.find('.cn-dashboard-page__title').text()).toBe('Overview')
		expect(w.find('.cn-dashboard-page__description').text()).toBe('Everything at a glance')
	})
})

describe('CnDetailPage — title, description, section heading', () => {
	const storeWith = (object) => ({
		objects: { 'reg-case': { 'id-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	})
	const props = {
		title: 'Case',
		description: 'The case record',
		statsTitle: 'Statistics',
		statsRows: [{ id: 'r1', count: 3 }],
		statsColumns: [{ key: 'count', label: 'Count' }],
	}
	const detailStubs = {
		CnDashboardGrid: { props: ['layout'], template: '<div />' },
	}
	const mountDetail = (provide, extra = {}) => mount(CnDetailPage, {
		propsData: { ...props, ...extra },
		stubs: detailStubs,
		...(provide ? { provide } : {}),
	})

	it('translates the heading, description and stats section heading', () => {
		const w = mountDetail(provideTranslate)
		expect(w.find('.cn-detail-page__title').text()).toBe('Zaak')
		expect(w.find('.cn-detail-page__description').text()).toBe('Het zaakdossier')
		expect(w.find('.cn-detail-page__section-title').text()).toBe('Statistieken')
	})

	it('renders the raw source strings with no translator (no-op control)', () => {
		const w = mountDetail(null)
		expect(w.find('.cn-detail-page__title').text()).toBe('Case')
		expect(w.find('.cn-detail-page__description').text()).toBe('The case record')
		expect(w.find('.cn-detail-page__section-title').text()).toBe('Statistics')
	})

	it('translates the type eyebrow but never the record name (data stays data)', () => {
		const w = mountDetail(provideTranslate, {
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: storeWith({ name: 'Overview' }),
		})
		// "Overview" IS in the catalogue — proving the record name is not
		// routed through the translator.
		expect(w.find('.cn-detail-page__title').text()).toBe('Overview')
		expect(w.find('[data-testid="cn-detail-page-type-eyebrow"]').text()).toBe('Zaak')
	})
})

describe('CnIndexPage — empty-state copy', () => {
	const stubs = {
		CnDataTable: true,
		CnCardGrid: true,
		CnPagination: true,
		CnActionsBar: true,
		CnContextMenu: true,
		CnRowActions: true,
		CnIndexSidebar: true,
		CnPageHeader: true,
		CnMassDeleteDialog: true,
		CnMassCopyDialog: true,
		CnMassExportDialog: true,
		CnMassImportDialog: true,
		CnDeleteDialog: true,
		CnCopyDialog: true,
		CnFormDialog: true,
		CnAdvancedFormDialog: true,
		NcLoadingIcon: true,
		CnIcon: true,
		NcEmptyContent: { name: 'NcEmptyContent', props: ['name'], template: '<div class="empty-stub">{{ name }}</div>' },
	}
	const mountIndex = (provide) => mount(CnIndexPage, {
		propsData: { title: 'Items', objects: [], emptyText: 'No items found' },
		stubs,
		mocks: {
			$route: { params: {}, query: {}, name: 'items' },
			$router: { push: jest.fn(), replace: jest.fn() },
		},
		...(provide ? { provide } : {}),
	})

	it('translates emptyText via the injected cnTranslate', () => {
		expect(mountIndex(provideTranslate).find('.empty-stub').text()).toBe('Geen resultaten')
	})

	it('renders the raw emptyText with no translator (no-op control)', () => {
		expect(mountIndex(null).find('.empty-stub').text()).toBe('No items found')
	})

	it('passes the RAW emptyText to the table, which translates at its own boundary', () => {
		// Guards against double translation: the string must reach CnDataTable
		// untranslated, because CnDataTable runs it through cnTranslate itself.
		const w = mountIndex(provideTranslate)
		expect(w.vm.emptyText).toBe('No items found')
	})
})

describe('CnActionButtons — action labels and confirm copy', () => {
	const stubs = {
		NcButton: {
			name: 'NcButton',
			props: ['disabled'],
			emits: ['click'],
			template: '<button :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
		},
		CnIcon: { name: 'CnIcon', template: '<span />' },
		CnConfirmDialog: {
			name: 'CnConfirmDialog',
			props: ['dialogTitle', 'message'],
			template: '<div class="confirm-stub" :data-title="dialogTitle" :data-message="message" />',
		},
		CnAdvancedFormDialog: { name: 'CnAdvancedFormDialog', template: '<div />' },
	}
	const mountBar = (actions, provide) => mount(CnActionButtons, {
		propsData: { actions },
		stubs,
		provide: provide || {},
		mocks: { $router: { push: jest.fn() } },
	})

	beforeEach(() => {
		dispatchAction.mockClear()
		dispatchAction.mockResolvedValue({ ok: true })
	})

	const approve = {
		id: 'approve',
		label: 'Approve',
		type: 'api-call',
		url: '/apps/x/api/approve',
		confirm: true,
		confirmMessage: 'Approve this lead?',
	}

	it('translates the button label via the injected cnTranslate', async () => {
		const w = mountBar([approve], provideTranslate)
		await flush()
		expect(w.find('[data-testid="cn-action-approve"]').text()).toBe('Goedkeuren')
	})

	it('renders the raw label with no translator (no-op control)', async () => {
		const w = mountBar([approve], null)
		await flush()
		expect(w.find('[data-testid="cn-action-approve"]').text()).toBe('Approve')
	})

	it('translates the confirm dialog title and message', async () => {
		const w = mountBar([approve], provideTranslate)
		await flush()
		await w.find('[data-testid="cn-action-approve"]').trigger('click')
		await flush()
		const dialog = w.find('.confirm-stub')
		expect(dialog.attributes('data-title')).toBe('Goedkeuren')
		expect(dialog.attributes('data-message')).toBe('Deze lead goedkeuren?')
	})

	it('renders the raw confirm copy with no translator (no-op control)', async () => {
		const w = mountBar([approve], null)
		await flush()
		await w.find('[data-testid="cn-action-approve"]').trigger('click')
		await flush()
		const dialog = w.find('.confirm-stub')
		expect(dialog.attributes('data-title')).toBe('Approve')
		expect(dialog.attributes('data-message')).toBe('Approve this lead?')
	})

	it('translates the toggle labels', async () => {
		const w = mountBar([
			{ id: 'state', type: 'toggle', labelOn: 'Open', labelOff: 'Closed', field: 'open' },
		], { ...provideTranslate, cnTranslate: (key) => (key === 'Closed' ? 'Gesloten' : key) })
		await flush()
		expect(w.find('[data-testid="cn-action-toggle-state"]').text()).toBe('Gesloten')
	})

	it('hands the host translate function to the dispatcher so api-call toasts localise', async () => {
		const w = mountBar([{ id: 'send', label: 'Send', type: 'api-call', url: '/apps/x/api/send' }], provideTranslate)
		await flush()
		await w.find('[data-testid="cn-action-send"]').trigger('click')
		await flush()
		expect(dispatchAction).toHaveBeenCalled()
		const context = dispatchAction.mock.calls[0][1]
		expect(typeof context.translate).toBe('function')
		expect(context.translate('Approve')).toBe('Goedkeuren')
	})
})

describe('CnObjectListWidget — empty-state copy', () => {
	const stubs = {
		CnWidgetWrapper: { template: '<div><slot /></div>' },
		CnDataTable: true,
		CnFormDialog: true,
		NcLoadingIcon: true,
		NcEmptyContent: true,
		CnIcon: true,
	}
	const mountWidget = (provide) => mount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', emptyText: 'No items' } },
		stubs,
		...(provide ? { provide } : {}),
	})

	// The empty state is CnWidgetEmptyState now, and it carries an "+ Add"
	// action beside the headline — so the assertion targets the headline
	// element rather than the whole state's text, which would also pick up
	// the button's label and stop being a statement about the translation.
	it('translates the widget empty line via the injected cnTranslate', async () => {
		const w = mountWidget(provideTranslate)
		await flush()
		expect(w.find('.cn-object-list-widget__empty .cn-widget-empty-state__name').text()).toBe('Geen items')
	})

	it('renders the raw empty line with no translator (no-op control)', async () => {
		const w = mountWidget(null)
		await flush()
		expect(w.find('.cn-object-list-widget__empty .cn-widget-empty-state__name').text()).toBe('No items')
	})
})

describe('CnActionsBar — headerActions labels', () => {
	const stubs = {
		NcActions: { template: '<div><slot /></div>' },
		NcActionButton: {
			props: ['disabled', 'title'],
			emits: ['click'],
			template: '<button class="ab" @click="$emit(\'click\')"><span class="ab__label"><slot /></span></button>',
		},
		NcActionSeparator: { template: '<hr />' },
		NcButton: { props: ['type', 'disabled'], template: '<button><slot /></button>' },
		NcCheckboxRadioSwitch: { template: '<div><slot /></div>' },
		NcLoadingIcon: { template: '<div />' },
		CnIcon: { props: ['name', 'size'], template: '<span />' },
		Plus: { template: '<span />' },
		Refresh: { template: '<span />' },
		ContentCopy: { template: '<span />' },
		TrashCanOutline: { template: '<span />' },
		Import: { template: '<span />' },
		Export: { template: '<span />' },
	}
	const mountBar = (provide) => mount(CnActionsBar, {
		propsData: {
			selectedIds: [],
			objectCount: 0,
			headerActions: [{ id: 'approve', label: 'Approve' }],
		},
		stubs,
		...(provide ? { provide } : {}),
	})
	const labels = (w) => w.findAll('.ab').map((b) => b.find('.ab__label').text())

	it('translates a headerActions label via the injected cnTranslate', () => {
		expect(labels(mountBar(provideTranslate))).toContain('Goedkeuren')
	})

	it('renders the raw label with no translator (no-op control)', () => {
		expect(labels(mountBar(null))).toContain('Approve')
	})
})
