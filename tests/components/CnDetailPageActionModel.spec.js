/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailPage's action model and case surfaces
 * (openspec/changes/detail-action-model-and-case-surfaces): the primary action
 * follows the stage, quick actions, grouped and admin only menu actions, the
 * optional menu built-ins, the "what now" card, header pills and the side
 * column. Every one is opt in, so the first block holds a page that sets none
 * of them to what it rendered before.
 */

import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import CnActionsMenu from '../../src/components/CnActionsMenu/CnActionsMenu.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const HEADER_ACTIONS = [
	{ id: 'message', type: 'open-modal', label: 'Message', icon: 'MessageOutline', target: 'MessageDialog' },
	{ id: 'document', type: 'open-modal', label: 'Document', target: 'DocumentDialog' },
	{ id: 'hand-over', type: 'open-modal', label: 'Hand over', target: 'HandOver', group: 'Case' },
	{ id: 'withdraw', type: 'open-modal', label: 'Withdraw publication', target: 'Withdraw', group: 'Publication' },
	{ id: 'extend', type: 'open-modal', label: 'Extend term', target: 'Extend', group: 'Case' },
	{ id: 'raw', type: 'open-modal', label: 'Raw data', target: 'Raw', adminOnly: true },
]

/**
 * @param {object} object The record the store holds.
 * @return {object} A reactive fake object store.
 */
function makeStore(object) {
	return reactive({
		objects: { 'r-s': { o1: object } },
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	})
}

/**
 * Mount a schema-bound detail page and let CnActionButtons publish its entries.
 *
 * @param {object} [props] Extra props.
 * @param {object} [options] `object` (the record), `slots`, `stubs`.
 * @return {Promise<{wrapper: object, store: object}>} The mounted page and its store.
 */
async function mountPage(props = {}, { object = { id: 'o1', status: 'received' }, slots = {}, stubs = {} } = {}) {
	const store = makeStore(object)
	const wrapper = mount(CnDetailPage, {
		propsData: { register: 'r', schema: 's', objectId: 'o1', objectStore: store, isAdmin: false, ...props },
		slots,
		global: { stubs },
	})
	await flush()
	await wrapper.vm.$nextTick()
	return { wrapper, store }
}

const primary = (wrapper) => wrapper.findAll('[data-testid="cn-detail-page-primary-action"]')
const menuIds = (wrapper) => wrapper.vm.headerMenuEntries.map((entry) => entry.id)

describe('CnDetailPage action model: a page that opts into nothing', () => {
	it('renders no pills, no card, no side column and no primary button', async () => {
		const { wrapper } = await mountPage({ headerActions: HEADER_ACTIONS.slice(0, 2) })
		expect(wrapper.find('[data-testid="cn-detail-page-pills"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-next-step"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-side"]').exists()).toBe(false)
		expect(wrapper.classes()).toEqual(['cn-detail-page'])
		expect(primary(wrapper)).toHaveLength(0)
		expect(wrapper.find('[data-testid="cn-detail-page-skip-link"]').exists()).toBe(false)
	})

	it('hands CnActionButtons the headerActions array itself and lists every action in one captionless group', async () => {
		const actions = HEADER_ACTIONS.slice(0, 2)
		const { wrapper } = await mountPage({ headerActions: actions })
		expect(wrapper.findComponent(CnActionButtons).props('actions')).toBe(wrapper.props('headerActions'))
		expect(menuIds(wrapper)).toEqual(['message', 'document'])
		expect(wrapper.vm.headerMenuGroups).toHaveLength(1)
		expect(wrapper.vm.headerMenuGroups[0].label).toBe('')
		expect(wrapper.findAll('[data-testid^="cn-detail-page-action-group-"]')).toHaveLength(0)
	})

	it('leaves the Actions menu its refresh, its help links and its own name', async () => {
		const { wrapper } = await mountPage()
		const menu = wrapper.findComponent(CnActionsMenu)
		expect(menu.props('showRefresh')).toBe(true)
		expect(menu.props('showRequestFeature')).toBe(true)
		expect(menu.props('showReportBug')).toBe(true)
		expect(menu.props('showDocumentation')).toBe(true)
		expect(menu.props('actionsMenuLabel')).toBe('Actions')
	})
})

describe('CnDetailPage primary action follows the stage', () => {
	const byStage = {
		received: { id: 'take-on', type: 'open-modal', label: 'Take on', target: 'TakeOn' },
		handling: 'document',
	}

	it('names the button after the stage\'s action and dispatches it like a header action', async () => {
		const { wrapper } = await mountPage({ primaryActionByStage: byStage })
		expect(primary(wrapper)).toHaveLength(1)
		expect(primary(wrapper)[0].text()).toBe('Take on')

		const spy = jest.spyOn(wrapper.findComponent(CnActionButtons).vm, 'onActionClick').mockImplementation(() => {})
		await primary(wrapper)[0].trigger('click')
		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'take-on' }))
		expect(wrapper.emitted('primary-action')[0][0]).toMatchObject({ id: 'take-on', label: 'Take on' })
	})

	it('does not list the stage\'s action in the menu as well', async () => {
		const { wrapper } = await mountPage({ primaryActionByStage: byStage, headerActions: HEADER_ACTIONS.slice(0, 2) })
		expect(menuIds(wrapper)).toEqual(['message', 'document'])
		expect(menuIds(wrapper)).not.toContain('take-on')
	})

	it('changes the button when the record moves to another stage', async () => {
		const { wrapper, store } = await mountPage({ primaryActionByStage: byStage, headerActions: HEADER_ACTIONS.slice(0, 2) })
		expect(primary(wrapper)[0].text()).toBe('Take on')
		store.objects['r-s'].o1 = { id: 'o1', status: 'handling' }
		await flush()
		await wrapper.vm.$nextTick()
		// `handling` names a declared header action by id: it becomes the
		// button and leaves the menu.
		expect(primary(wrapper)[0].text()).toBe('Document')
		expect(menuIds(wrapper)).toEqual(['message'])
	})

	it('reads the stage from stageField and matches it without regard to case', async () => {
		const { wrapper } = await mountPage(
			{ primaryActionByStage: byStage, stageField: 'phase' },
			{ object: { id: 'o1', status: 'handling', phase: 'Received' } },
		)
		expect(primary(wrapper)[0].text()).toBe('Take on')
	})

	it('falls back to primaryAction for a stage without an entry, and announces that declaration', async () => {
		const fallback = { id: 'open', label: 'Open case' }
		const { wrapper } = await mountPage(
			{ primaryActionByStage: byStage, primaryAction: fallback },
			{ object: { id: 'o1', status: 'closed' } },
		)
		expect(primary(wrapper)[0].text()).toBe('Open case')
		await primary(wrapper)[0].trigger('click')
		expect(wrapper.emitted('primary-action')[0][0]).toEqual(fallback)
	})

	it('renders no button for a stage without an entry when there is no primaryAction either', async () => {
		const { wrapper } = await mountPage({ primaryActionByStage: byStage }, { object: { id: 'o1', status: 'closed' } })
		expect(primary(wrapper)).toHaveLength(0)
		expect(wrapper.find('[data-testid="cn-detail-page-skip-link"]').exists()).toBe(false)
	})

	it('points the skip link at the stage\'s button', async () => {
		const { wrapper } = await mountPage({ primaryActionByStage: byStage })
		const link = wrapper.find('[data-testid="cn-detail-page-skip-link"]')
		expect(link.text()).toBe('Skip to Take on')
		expect(link.attributes('href')).toBe(`#${primary(wrapper)[0].attributes('id')}`)
	})

	it('falls back when the stage\'s action is hidden by its own visibleWhen', async () => {
		const { wrapper } = await mountPage({
			primaryAction: { id: 'open', label: 'Open case' },
			primaryActionByStage: {
				received: { id: 'take-on', type: 'open-modal', label: 'Take on', target: 'T', visibleWhen: { field: 'assignee', op: 'empty' } },
			},
		}, { object: { id: 'o1', status: 'received', assignee: 'pieter' } })
		expect(primary(wrapper)[0].text()).toBe('Open case')
	})
})

describe('CnDetailPage quick actions', () => {
	const quick = (wrapper) => wrapper.findAll('[data-testid^="cn-detail-page-quick-"]')

	it('renders at most three, in declaration order, and drops the rest', async () => {
		const { wrapper } = await mountPage({
			headerActions: HEADER_ACTIONS,
			quickActions: ['message', 'document', 'hand-over', 'extend'],
		})
		expect(quick(wrapper).map((button) => button.text())).toEqual(['Message', 'Document', 'Hand over'])
	})

	it('takes a quick action out of the menu', async () => {
		const { wrapper } = await mountPage({ headerActions: HEADER_ACTIONS, quickActions: ['message', 'document'] })
		expect(menuIds(wrapper)).toEqual(['hand-over', 'withdraw', 'extend', 'raw'])
	})

	it('accepts an action written out in place', async () => {
		const { wrapper } = await mountPage({
			quickActions: [{ id: 'log-contact', type: 'open-modal', label: 'Log contact', target: 'LogContact' }],
		})
		expect(quick(wrapper).map((button) => button.text())).toEqual(['Log contact'])
		expect(menuIds(wrapper)).toEqual([])
	})

	it('dispatches a quick action on click', async () => {
		const { wrapper } = await mountPage({ headerActions: HEADER_ACTIONS, quickActions: ['message'] })
		const spy = jest.spyOn(wrapper.findComponent(CnActionButtons).vm, 'onActionClick').mockImplementation(() => {})
		await quick(wrapper)[0].trigger('click')
		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'message' }))
	})

	it('renders a quick action that goes to a URL as a link and does not dispatch it', async () => {
		const { wrapper } = await mountPage({
			quickActions: [{ id: 'portal', type: 'navigate', label: 'Open portal', target: 'https://example.org/case/1' }],
		})
		expect(quick(wrapper)[0].attributes('href')).toBe('https://example.org/case/1')
		const spy = jest.spyOn(wrapper.findComponent(CnActionButtons).vm, 'onActionClick').mockImplementation(() => {})
		await quick(wrapper)[0].trigger('click')
		expect(spy).not.toHaveBeenCalled()
	})

	it('ignores an id that names no declared action, and an entry it cannot render', async () => {
		const { wrapper } = await mountPage({ headerActions: HEADER_ACTIONS, quickActions: ['nope', null, { id: 'no-label' }, 'message'] })
		expect(quick(wrapper).map((button) => button.text())).toEqual(['Message'])
	})

	it('does not draw the stage\'s primary action a second time as a quick action', async () => {
		const { wrapper } = await mountPage({
			headerActions: HEADER_ACTIONS,
			primaryActionByStage: { received: 'message' },
			quickActions: ['message', 'document'],
		})
		expect(primary(wrapper)[0].text()).toBe('Message')
		expect(quick(wrapper).map((button) => button.text())).toEqual(['Document'])
	})
})

describe('CnDetailPage grouped and admin only menu actions', () => {
	it('puts ungrouped actions first and named groups after, each under its caption', async () => {
		const { wrapper } = await mountPage({ headerActions: HEADER_ACTIONS })
		const groups = wrapper.vm.headerMenuGroups
		expect(groups.map((group) => group.label)).toEqual(['', 'Case', 'Publication'])
		expect(groups[1].entries.map((entry) => entry.id)).toEqual(['hand-over', 'extend'])
		const captions = wrapper.findAllComponents({ name: 'NcActionCaption' })
		expect(captions).toHaveLength(2)
	})

	it('hides an admin only action from a handler', async () => {
		const { wrapper } = await mountPage({ headerActions: HEADER_ACTIONS })
		const drawn = wrapper.vm.headerMenuGroups.flatMap((group) => group.entries.map((entry) => entry.id))
		expect(drawn).not.toContain('raw')
		expect(wrapper.find('[data-testid="cn-action-raw"]').exists()).toBe(false)
	})

	it('shows admin only actions to an admin, as the last group', async () => {
		const { wrapper } = await mountPage({ headerActions: HEADER_ACTIONS, isAdmin: true })
		const groups = wrapper.vm.headerMenuGroups
		const last = groups[groups.length - 1]
		expect(last.label).toBe('Administration')
		expect(last.entries.map((entry) => entry.id)).toEqual(['raw'])
		expect(wrapper.find('[data-testid="cn-action-raw"]').exists()).toBe(true)
	})
})

describe('CnDetailPage actionsMenu', () => {
	it('removes Refresh and the help links and names the menu', async () => {
		const { wrapper } = await mountPage({
			headerActions: HEADER_ACTIONS.slice(0, 2),
			actionsMenu: { showRefresh: false, showHelpLinks: false, label: 'More' },
		})
		const menu = wrapper.findComponent(CnActionsMenu)
		expect(menu.props('showRefresh')).toBe(false)
		expect(menu.props('showRequestFeature')).toBe(false)
		expect(menu.props('showReportBug')).toBe(false)
		expect(menu.props('showDocumentation')).toBe(false)
		expect(menu.props('actionsMenuLabel')).toBe('More')
		expect(wrapper.find('[data-testid="cn-detail-page-action-refresh"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-action-report-bug"]').exists()).toBe(false)
		// The page's own actions are still there.
		expect(wrapper.find('[data-testid="cn-action-message"]').exists()).toBe(true)
	})

	it('changes only the key it is given', async () => {
		const { wrapper } = await mountPage({ actionsMenu: { showHelpLinks: false } })
		const menu = wrapper.findComponent(CnActionsMenu)
		expect(menu.props('showRefresh')).toBe(true)
		expect(menu.props('showRequestFeature')).toBe(false)
		expect(menu.props('actionsMenuLabel')).toBe('Actions')
	})

	it('still honours a host that switched one help link off itself', async () => {
		const { wrapper } = await mountPage({ showReportBug: false, actionsMenu: { showRefresh: false } })
		const menu = wrapper.findComponent(CnActionsMenu)
		expect(menu.props('showReportBug')).toBe(false)
		expect(menu.props('showRequestFeature')).toBe(true)
	})
})

describe('CnDetailPage "what now" card', () => {
	const nextStep = {
		stages: {
			received: {
				title: 'What now? Step 1: received',
				after: 'Then: step 2, handling',
				checklist: [
					{ label: 'Confirm receipt', doneField: 'receiptConfirmedAt' },
					{ label: 'Pick a handler', doneWhen: { field: 'assignee', op: 'notEmpty' } },
				],
			},
		},
	}
	const byStage = { received: { id: 'take-on', type: 'open-modal', label: 'Take on', target: 'TakeOn' } }
	const card = (wrapper) => wrapper.find('[data-testid="cn-detail-page-next-step"]')

	it('renders the stage\'s checklist with done read off the record', async () => {
		const { wrapper } = await mountPage({ nextStep }, { object: { id: 'o1', status: 'received', receiptConfirmedAt: '2026-10-04' } })
		expect(card(wrapper).exists()).toBe(true)
		expect(card(wrapper).text()).toContain('What now? Step 1: received')
		const items = card(wrapper).findAll('[data-testid="cn-next-step-item"]')
		expect(items).toHaveLength(2)
		expect(items[0].classes()).toContain('cn-next-step-card__item--done')
		expect(items[1].classes()).not.toContain('cn-next-step-card__item--done')
		expect(card(wrapper).text()).toContain('Then: step 2, handling')
	})

	it('moves the primary button into the card, so the page has one and only one', async () => {
		const { wrapper } = await mountPage({ nextStep, primaryActionByStage: byStage })
		expect(primary(wrapper)).toHaveLength(1)
		expect(card(wrapper).find('[data-testid="cn-detail-page-primary-action"]').exists()).toBe(true)
		expect(wrapper.find('.cn-detail-page__header [data-testid="cn-detail-page-primary-action"]').exists()).toBe(false)
	})

	it('dispatches the stage\'s action from the card\'s button', async () => {
		const { wrapper } = await mountPage({ nextStep, primaryActionByStage: byStage })
		const spy = jest.spyOn(wrapper.findComponent(CnActionButtons).vm, 'onActionClick').mockImplementation(() => {})
		await primary(wrapper)[0].trigger('click')
		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'take-on' }))
	})

	it('keeps the skip link pointing at the button inside the card', async () => {
		const { wrapper } = await mountPage({ nextStep, primaryActionByStage: byStage })
		const link = wrapper.find('[data-testid="cn-detail-page-skip-link"]')
		expect(link.attributes('href')).toBe(`#${primary(wrapper)[0].attributes('id')}`)
	})

	it('shows no card for a stage that declares none, and leaves the button in the header', async () => {
		const { wrapper } = await mountPage(
			{ nextStep, primaryAction: { id: 'open', label: 'Open case' } },
			{ object: { id: 'o1', status: 'closed' } },
		)
		expect(card(wrapper).exists()).toBe(false)
		expect(wrapper.find('.cn-detail-page__header [data-testid="cn-detail-page-primary-action"]').exists()).toBe(true)
	})

	it('renders the checklist without a button when the page has no primary action', async () => {
		const { wrapper } = await mountPage({ nextStep })
		expect(card(wrapper).exists()).toBe(true)
		expect(primary(wrapper)).toHaveLength(0)
	})

	it('hides the card while the page shows its error state', async () => {
		const { wrapper } = await mountPage({ nextStep, error: true })
		expect(card(wrapper).exists()).toBe(false)
	})
})

describe('CnDetailPage header pills', () => {
	const pills = (wrapper) => wrapper.findAll('[data-testid^="cn-detail-page-pill-"]')

	it('renders type then status above the title, coloured through the map', async () => {
		const { wrapper } = await mountPage({
			title: 'Case',
			typePill: { field: 'caseType', variant: 'error' },
			statusPill: { field: 'status', colorMap: { received: 'info' }, labels: { received: 'Received' } },
		}, { object: { id: 'o1', status: 'received', caseType: 'Woo request' } })
		expect(pills(wrapper).map((pill) => pill.text())).toEqual(['Woo request', 'Received'])
		expect(pills(wrapper)[0].classes()).toContain('cn-status-badge--error')
		expect(pills(wrapper)[1].classes()).toContain('cn-status-badge--info')
		const html = wrapper.find('.cn-detail-page__header-text').html()
		expect(html.indexOf('cn-detail-page__pills')).toBeLessThan(html.indexOf('cn-detail-page__title'))
	})

	it('renders no pill for a field the record does not have', async () => {
		const { wrapper } = await mountPage({ typePill: { field: 'caseType' }, statusPill: { field: 'status' } })
		expect(pills(wrapper).map((pill) => pill.text())).toEqual(['received'])
	})

	it('renders no pill row at all when neither field has a value', async () => {
		const { wrapper } = await mountPage({ typePill: { field: 'caseType' } })
		expect(wrapper.find('[data-testid="cn-detail-page-pills"]').exists()).toBe(false)
	})
})

describe('CnDetailPage side column', () => {
	const HostStub = { name: 'CnDetailWidgetHost', props: ['widget', 'chrome', 'objectId'], template: '<div class="host">{{ widget.id }}|{{ chrome }}|{{ objectId }}</div>' }
	const widgets = [{ id: 'term', type: 'countdown', title: 'Term', content: { field: 'deadline' } }]
	const sideColumn = ['term', { type: 'text', title: 'Handling', content: { text: 'x' } }, 'missing']
	const side = (wrapper) => wrapper.find('[data-testid="cn-detail-page-side"]')

	it('renders the widgets as cards in a labelled complementary region after the body', async () => {
		const { wrapper } = await mountPage({ widgets, sideColumn }, { stubs: { CnDetailWidgetHost: HostStub } })
		expect(side(wrapper).element.tagName).toBe('ASIDE')
		expect(side(wrapper).attributes('aria-label')).toBe('Details')
		expect(side(wrapper).findAll('.host').map((host) => host.text())).toEqual(['term|card|o1', 'cn-side-1|card|o1'])
		expect(wrapper.classes()).toContain('cn-detail-page--with-side')
		const body = wrapper.find('.cn-detail-page__body').element
		expect(body.compareDocumentPosition(side(wrapper).element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})

	it('drops an id that names no declared widget', async () => {
		const { wrapper } = await mountPage({ widgets, sideColumn: ['missing'] }, { stubs: { CnDetailWidgetHost: HostStub } })
		expect(side(wrapper).exists()).toBe(false)
		expect(wrapper.classes()).toEqual(['cn-detail-page'])
	})

	it('offers the same widget-<id> slot the body grid does, with the record in scope', async () => {
		const { wrapper } = await mountPage({ widgets, sideColumn: ['term'] }, {
			stubs: { CnDetailWidgetHost: HostStub },
			slots: { 'widget-term': ({ objectId, widget }) => `own:${widget.id}:${objectId}` },
		})
		expect(side(wrapper).text()).toBe('own:term:o1')
	})

	it('goes away with the body in the error state', async () => {
		const { wrapper } = await mountPage({ widgets, sideColumn, error: true }, { stubs: { CnDetailWidgetHost: HostStub } })
		expect(side(wrapper).exists()).toBe(false)
		expect(wrapper.classes()).toEqual(['cn-detail-page'])
	})
})

describe('manifest: action model keys on a detail page', () => {
	const manifest = (config) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'CaseDetail', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 'case', ...config } }],
	})

	it('accepts the full set', () => {
		const result = validateManifestV2(manifest({
			stageField: 'status',
			primaryActionByStage: {
				received: { id: 'take-on', label: 'Take on', type: 'api-call', url: '/x', method: 'POST' },
				handling: 'review',
			},
			quickActions: ['message', { id: 'document', label: 'Document', type: 'open-modal', target: 'DocumentDialog' }],
			headerActions: [
				{ id: 'message', label: 'Message', type: 'open-modal', target: 'M' },
				{ id: 'review', label: 'Review', type: 'open-modal', target: 'R', group: 'Case' },
				{ id: 'raw', label: 'Raw data', type: 'open-modal', target: 'Raw', adminOnly: true },
			],
			actionsMenu: { showRefresh: false, showHelpLinks: false, label: 'More' },
			nextStep: { stages: { received: { title: 'What now?', after: 'Then', checklist: [{ label: 'Confirm', doneField: 'a' }, { label: 'Pick', doneWhen: { field: 'b', op: 'notEmpty' }, hint: 'h' }] } } },
			typePill: { field: 'caseType', variant: 'error' },
			statusPill: { field: 'status', colorMap: { received: 'info' }, labels: { received: 'Received' } },
			sideColumn: ['term', { type: 'text', title: 'Handling', content: {} }],
		}))
		expect(result.errors).toEqual([])
	})

	it('refuses a fourth quick action, a mistyped menu key, a pill without a field and a checklist item without a label', () => {
		expect(validateManifestV2(manifest({ quickActions: ['a', 'b', 'c', 'd'] })).valid).toBe(false)
		expect(validateManifestV2(manifest({ actionsMenu: { showHelp: false } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ statusPill: { colorMap: {} } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ nextStep: { stages: { a: { checklist: [{ doneField: 'x' }] } } } })).valid).toBe(false)
	})

	it('refuses a group that is not text and an adminOnly that is not a boolean', () => {
		expect(validateManifestV2(manifest({ headerActions: [{ id: 'a', label: 'A', group: 3 }] })).valid).toBe(false)
		expect(validateManifestV2(manifest({ headerActions: [{ id: 'a', label: 'A', adminOnly: 'yes' }] })).valid).toBe(false)
	})
})
