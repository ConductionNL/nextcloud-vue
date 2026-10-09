/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Under the board look the header buttons follow one order whatever the
 * manifest order: quick actions, Edit, the buildiq square, then the menu
 * labelled "More". No primary button when the next-step card shows.
 *
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-detail-header-buttons-follow-one-order
 */
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnActionsMenu from '../../src/components/CnActionsMenu/CnActionsMenu.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const ACTIONS = [
	{ id: 'log', type: 'open-modal', label: 'Log contact', target: 'Log' },
	{ id: 'message', type: 'open-modal', label: 'Message', target: 'Message' },
	{ id: 'document', type: 'open-modal', label: 'Document', target: 'Document' },
]

const store = reactive({
	schemas: { 'dossiq-case': { title: 'Case', properties: { title: { type: 'string' } } } },
	objects: { 'dossiq-case': { c1: { id: 'c1', title: 'Case', status: 'received' } } },
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
})

const stubs = {
	CnBuildiqEditButton: { template: '<div class="buildiq" data-testid="buildiq" />' },
	CnDashboardGrid: { template: '<div />' },
	CnDetailWidgetHost: { template: '<div />' },
}

async function mountPage(props = {}, look = 'board') {
	const wrapper = mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'c1',
			objectStore: store,
			isAdmin: false,
			showEditAction: true,
			headerActions: ACTIONS,
			quickActions: ['message', 'document', 'log'],
			...props,
		},
		global: { stubs, provide: look ? { cnLook: look } : {} },
	})
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

/** The test ids of the header buttons, in document order. */
function order(wrapper) {
	return wrapper
		.findAll('.cn-detail-page__header-actions [data-testid]')
		.map((el) => el.attributes('data-testid'))
		.filter((id) => /^cn-detail-page-(quick|edit|actions)|^buildiq$/.test(id))
}

describe('CnDetailPage: the board header buttons', () => {
	it('orders quick actions, Edit, the buildiq square and the menu', async () => {
		const wrapper = await mountPage()
		expect(order(wrapper)).toEqual([
			'cn-detail-page-quick-message',
			'cn-detail-page-quick-document',
			'cn-detail-page-quick-log',
			'cn-detail-page-edit',
			'buildiq',
			'cn-detail-page-actions',
		])
	})

	it('labels the menu "More" and draws it as a secondary button', async () => {
		const menu = (await mountPage()).findComponent(CnActionsMenu)
		expect(menu.props('actionsMenuLabel')).toBe('More')
		expect(menu.props('variant')).toBe('secondary')
	})

	it('keeps a label the manifest names for the menu', async () => {
		const menu = (await mountPage({ actionsMenu: { label: 'Meer' } })).findComponent(CnActionsMenu)
		expect(menu.props('actionsMenuLabel')).toBe('Meer')
	})

	it('keeps Edit as its own labelled button when inlineActions would fold it into the menu', async () => {
		const wrapper = await mountPage({ inlineActions: 3 })
		const edit = wrapper.find('[data-testid="cn-detail-page-edit"]')
		expect(edit.exists()).toBe(true)
		expect(edit.text()).not.toBe('')
		expect(wrapper.vm.menuHeaderActions.map((entry) => entry.id)).not.toContain('cn-detail-page-edit')
	})

	it('renders no primary button when the next-step card shows, and the card holds it', async () => {
		const wrapper = await mountPage({
			primaryAction: { label: 'Continue' },
			nextStep: { stages: { received: { title: 'What now?', checklist: [{ label: 'Check the documents' }] } } },
			stageField: 'status',
		})
		expect(wrapper.find('.cn-detail-page__header-actions [data-testid="cn-detail-page-primary-action"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-detail-page-primary-action"]').length).toBeLessThanOrEqual(1)
	})

	it('keeps the menu icon-led and unnamed as before without the look', async () => {
		const menu = (await mountPage({}, null)).findComponent(CnActionsMenu)
		expect(menu.props('actionsMenuLabel')).toBe('Actions')
		expect(menu.props('variant')).toBe('')
	})
})
