/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The quick actions and the "what now" card follow the open body tab the way
 * side cards do (openspec/changes/detail-actions-per-tab): `tabs` shows an
 * entry only beside those tabs, `notTabs` stands it aside for them.
 */

import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const HEADER_ACTIONS = [
	{ id: 'message', type: 'open-modal', label: 'Message', target: 'MessageDialog' },
	{ id: 'document', type: 'open-modal', label: 'Document', target: 'DocumentDialog' },
	{ id: 'contact', type: 'open-modal', label: 'Contact', target: 'ContactDialog' },
]

const NEXT_STEP = {
	stages: { received: { title: 'What now?', checklist: [{ label: 'Confirm receipt', doneField: 'receiptConfirmedAt' }] } },
}

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The mounted page.
 */
async function mountPage(props) {
	const store = reactive({
		objects: { 'r-s': { o1: { id: 'o1', status: 'received' } } },
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	})
	const wrapper = mount(CnDetailPage, {
		propsData: { register: 'r', schema: 's', objectId: 'o1', objectStore: store, isAdmin: false, headerActions: HEADER_ACTIONS, ...props },
	})
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

const quick = (wrapper) => wrapper.findAll('[data-testid^="cn-detail-page-quick-"]').map((button) => button.text())
const menuIds = (wrapper) => wrapper.vm.headerMenuEntries.map((entry) => entry.id)
const card = (wrapper) => wrapper.find('[data-testid="cn-detail-page-next-step"]')

/**
 * @param {object} wrapper The page.
 * @param {string} id The tab to open.
 */
async function openTab(wrapper, id) {
	wrapper.vm.$.provides.cnDetailReportTab(id)
	await wrapper.vm.$nextTick()
}

describe('CnDetailPage quick actions per tab', () => {
	const quickActions = ['message', { id: 'document', notTabs: ['ai'] }, { id: 'contact', tabs: ['overview'] }]

	it('shows every quick action beside the tab they all allow', async () => {
		const wrapper = await mountPage({ quickActions })
		await openTab(wrapper, 'overview')
		expect(quick(wrapper)).toEqual(['Message', 'Document', 'Contact'])
	})

	it('drops an action on a tab it stands aside for, and one bound to another tab', async () => {
		const wrapper = await mountPage({ quickActions })
		await openTab(wrapper, 'ai')
		expect(quick(wrapper)).toEqual(['Message'])
	})

	it('offers a quick action hidden by the tab in the Actions menu instead', async () => {
		const wrapper = await mountPage({ quickActions })
		await openTab(wrapper, 'ai')
		expect(menuIds(wrapper)).toEqual(expect.arrayContaining(['document', 'contact']))
		expect(menuIds(wrapper)).not.toContain('message')
	})

	it('leaves a page whose quick actions name no tabs as it was', async () => {
		const wrapper = await mountPage({ quickActions: ['message', 'document'] })
		await openTab(wrapper, 'ai')
		expect(quick(wrapper)).toEqual(['Message', 'Document'])
	})
})

describe('CnDetailPage "what now" card per tab', () => {
	it('stands the card aside while a notTabs tab is open', async () => {
		const wrapper = await mountPage({ nextStep: { ...NEXT_STEP, notTabs: ['ai'] } })
		expect(card(wrapper).exists()).toBe(true)
		await openTab(wrapper, 'ai')
		expect(card(wrapper).exists()).toBe(false)
		await openTab(wrapper, 'overview')
		expect(card(wrapper).exists()).toBe(true)
	})

	it('shows a card with tabs only beside those tabs', async () => {
		const wrapper = await mountPage({ nextStep: { ...NEXT_STEP, tabs: ['overview'] } })
		await openTab(wrapper, 'overview')
		expect(card(wrapper).exists()).toBe(true)
		await openTab(wrapper, 'files')
		expect(card(wrapper).exists()).toBe(false)
	})
})

describe('CnDetailPage stage primary per tab', () => {
	const primary = (wrapper) => wrapper.find('[data-testid="cn-detail-page-primary-action"]')
	const STAGES = { received: { id: 'next', type: 'open-modal', label: 'Next step', target: 'NextDialog', notTabs: ['ai'] } }

	it('stands an inline stage action aside on a notTabs tab', async () => {
		const wrapper = await mountPage({ stageField: 'status', primaryActionByStage: STAGES })
		await openTab(wrapper, 'overview')
		expect(primary(wrapper).exists()).toBe(true)
		await openTab(wrapper, 'ai')
		expect(primary(wrapper).exists()).toBe(false)
	})

	it('keeps a stage action that names no tabs on every tab', async () => {
		const wrapper = await mountPage({ stageField: 'status', primaryActionByStage: { received: { ...STAGES.received, notTabs: undefined } } })
		await openTab(wrapper, 'ai')
		expect(primary(wrapper).exists()).toBe(true)
	})
})

describe('the manifest schema for actions per tab', () => {
	const manifest = (config) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', ...config } }],
	})

	it('accepts tabs and notTabs on a quick action named by id and on the next step', () => {
		const result = validateManifestV2(manifest({
			headerActions: HEADER_ACTIONS,
			quickActions: ['message', { id: 'document', notTabs: ['ai'] }, { id: 'contact', tabs: ['overview'] }],
			nextStep: { ...NEXT_STEP, notTabs: ['ai'] },
		}))
		expect(result.errors).toEqual([])
	})

	it('accepts tabs and notTabs on an inline stage action', () => {
		const result = validateManifestV2(manifest({
			stageField: 'status',
			primaryActionByStage: { received: { id: 'next', type: 'open-modal', label: 'Next step', target: 'NextDialog', notTabs: ['ai'] } },
		}))
		expect(result.errors).toEqual([])
	})

	it('refuses an id-only quick action that names no tabs', () => {
		expect(validateManifestV2(manifest({ quickActions: [{ id: 'document' }] })).valid).toBe(false)
	})
})
