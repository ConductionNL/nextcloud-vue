/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Features and roadmap page in the board look (boards PqRoadmap and
 * DqFunctionaliteiten): one component, configured into either board.
 *
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md
 */
jest.mock('../../src/utils/roadmapIssues.js', () => ({
	...jest.requireActual('../../src/utils/roadmapIssues.js'),
	fetchRoadmapIssues: jest.fn(),
}))

const { flushPromises, mount } = require('@vue/test-utils')
const CnFeaturesBoard = require('../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue').default
const { fetchRoadmapIssues } = require('../../src/utils/roadmapIssues.js')

const FEATURES = [
	{ slug: 'clients', title: 'Client management', summary: 'People and organisations.', status: 'stable', category: 'crm', docsUrl: 'openspec/specs/clients/spec.md' },
	{ slug: 'leads', title: 'Leads', status: 'stable', category: 'crm' },
	{ slug: 'channels', title: 'Every channel', status: 'beta', category: 'contact' },
	{ slug: 'callbacks', title: 'Call-backs', status: 'planned', category: 'contact', expected: 'Q4 2026' },
]
const CATEGORIES = { crm: 'Basis-CRM', contact: 'Klantcontact' }

const stubs = {
	CnBuildiqEditButton: true,
	CnRoadmapTab: { name: 'CnRoadmapTab', props: ['repo'], template: '<div class="roadmap-tab" :data-repo="repo" />' },
	NcActions: { name: 'NcActions', props: ['menuName'], template: '<div class="actions" :data-name="menuName"><slot /></div>' },
	NcActionLink: { name: 'NcActionLink', props: ['href'], template: '<a class="action-link" :href="href"><slot /></a>' },
	NcActionButton: { name: 'NcActionButton', emits: ['click'], template: '<button class="action-button" @click="$emit(\'click\')"><slot /></button>' },
	NcButton: { name: 'NcButton', props: ['href'], template: '<a class="btn" :href="href"><slot /></a>' },
	NcNoteCard: { name: 'NcNoteCard', template: '<div class="note"><slot /></div>' },
}

function mountBoard(props = {}) {
	return mount(CnFeaturesBoard, {
		stubs,
		propsData: { features: FEATURES, categories: CATEGORIES, repo: 'ConductionNL/pipelinq', ...props },
	})
}

const testid = (wrapper, id) => wrapper.findAll(`[data-testid="${id}"]`)

beforeEach(() => {
	fetchRoadmapIssues.mockReset()
	fetchRoadmapIssues.mockResolvedValue({ items: [], degraded: null })
})

describe('CnFeaturesBoard: the cards layout (PqRoadmap)', () => {
	it('groups the features by category with a count caption', () => {
		const wrapper = mountBoard()
		const groups = testid(wrapper, 'cn-features-board-group')
		expect(groups.map((group) => group.attributes('data-group'))).toEqual(['crm', 'contact'])
		expect(testid(wrapper, 'cn-features-board-group-caption').map((c) => c.text())).toEqual([
			'2 features, 2 available',
			'2 features, 1 beta, 1 planned',
		])
		expect(testid(wrapper, 'cn-features-board-feature')).toHaveLength(4)
	})

	it('shows chips with a count per status, and filters on a click', async () => {
		const wrapper = mountBoard()
		const options = wrapper.findAll('.cn-features-board__filter-option')
		expect(options.map((o) => o.text())).toEqual(['All 4', 'Available 2', 'Beta 1', 'Planned 1'])
		expect(options[0].attributes('aria-pressed')).toBe('true')
		await options[3].trigger('click')
		expect(options[3].attributes('aria-pressed')).toBe('true')
		expect(testid(wrapper, 'cn-features-board-feature').map((f) => f.text())).toEqual([expect.stringContaining('Call-backs')])
		expect(testid(wrapper, 'cn-features-board-group').map((g) => g.attributes('data-group'))).toEqual(['contact'])
	})

	it('puts the expected moment in the badge and points Learn more at the documentation', () => {
		const wrapper = mountBoard({ documentationUrl: 'https://pipelinq.conduction.nl' })
		expect(testid(wrapper, 'cn-features-board-status').map((b) => b.text())).toEqual(['Available', 'Available', 'Beta', 'Planned, Q4 2026'])
		const more = wrapper.findAll('.cn-features-board__read-more')
		expect(more).toHaveLength(4)
		expect(more[0].attributes('href')).toBe('https://pipelinq.conduction.nl')
		expect(more[0].attributes('aria-label')).toBe('Learn more about Client management')
	})

	it('switches to the roadmap through the folder tabs', async () => {
		const wrapper = mountBoard()
		const tab = wrapper.find('[data-testid="cn-features-board-tab-roadmap"]')
		expect(tab.attributes('aria-selected')).toBe('false')
		await tab.trigger('click')
		expect(tab.attributes('aria-selected')).toBe('true')
		expect(wrapper.find('.roadmap-tab').attributes('data-repo')).toBe('ConductionNL/pipelinq')
		expect(testid(wrapper, 'cn-features-board-feature')).toHaveLength(0)
	})

	it('lists the most requested issues in the Next card with a status from their labels', async () => {
		fetchRoadmapIssues.mockResolvedValue({
			items: [
				{ number: 65, title: 'Contact moments', html_url: 'https://github.com/ConductionNL/pipelinq/issues/65', labels: [{ name: 'in progress' }], created_at: '2026-03-22T10:00:00Z' },
				{ number: 64, title: 'Complaints', html_url: 'https://github.com/ConductionNL/pipelinq/issues/64', labels: [{ name: 'planned' }] },
				{ number: 63, title: 'Not shown', html_url: 'https://github.com/ConductionNL/pipelinq/issues/63' },
			],
			degraded: null,
		})
		const wrapper = mountBoard({ next: 2, issueLabels: { 'in progress': 'in_progress', planned: 'planned' } })
		await flushPromises()
		expect(fetchRoadmapIssues).toHaveBeenCalledWith('ConductionNL/pipelinq')
		const items = testid(wrapper, 'cn-features-board-next-item')
		expect(items).toHaveLength(2)
		expect(items[0].text()).toContain('Contact moments')
		expect(items[0].text()).toContain('In progress')
		expect(items[0].text()).toContain('Opened')
		expect(items[0].text()).toContain('#65')
		expect(items[1].text()).toContain('Planned')
	})
})

describe('CnFeaturesBoard: the rows layout (DqFunctionaliteiten)', () => {
	const DQ = {
		layout: 'rows',
		tabs: false,
		filter: 'segmented',
		next: 0,
		statusLabels: { all: 'Alles', available: 'Stabiel' },
		subtitle: 'versie {appVersion} · bijgewerkt bij elke release',
		appVersion: '0.4.48',
		notice: 'Hoe dossiq zich verhoudt staat op conduction.nl.',
		documentationButton: true,
		documentationUrl: 'https://dossiq.conduction.nl',
		suggestButton: false,
		suggestUrl: 'https://github.com/ConductionNL/dossiq/issues/new?template=feature_request.yml',
	}

	it('draws a card per group with a row per feature and no counts on the filter', () => {
		const wrapper = mountBoard(DQ)
		expect(wrapper.findAll('.cn-features-board__group-head + .cn-features-board__rows')).toHaveLength(2)
		expect(wrapper.findAll('.cn-features-board__row')).toHaveLength(4)
		expect(wrapper.findAll('.cn-features-board__filter-option').map((o) => o.text())).toEqual(['Alles', 'Stabiel', 'Beta', 'Planned'])
		expect(testid(wrapper, 'cn-features-board-filter-count')).toHaveLength(0)
		expect(testid(wrapper, 'cn-features-board-group-caption')).toHaveLength(0)
	})

	it('fills the subtitle, shows the notice and no tabs or Next card', () => {
		const wrapper = mountBoard(DQ)
		expect(wrapper.find('[data-testid="cn-features-board-subtitle"]').text()).toBe('versie 0.4.48 · bijgewerkt bij elke release')
		expect(wrapper.find('[data-testid="cn-features-board-notice"]').text()).toContain('conduction.nl')
		expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-features-board-next"]').exists()).toBe(false)
		expect(fetchRoadmapIssues).not.toHaveBeenCalled()
	})

	it('puts the documentation in the header and the feature request in the Actions menu', async () => {
		const wrapper = mountBoard(DQ)
		expect(wrapper.find('[data-testid="cn-features-board-docs"]').attributes('href')).toBe('https://dossiq.conduction.nl')
		expect(wrapper.find('[data-testid="cn-features-board-suggest"]').exists()).toBe(false)
		const links = wrapper.findAll('.action-link')
		expect(links.map((l) => l.attributes('href'))).toContain(DQ.suggestUrl)
		await wrapper.find('.action-button').trigger('click')
		expect(wrapper.emitted('support')).toHaveLength(1)
	})
})

describe('CnFeaturesBoard: a fourth status', () => {
	it('shows the in-progress chip only when a feature has that status', () => {
		expect(mountBoard().findAll('.cn-features-board__filter-option').map((o) => o.attributes('data-status'))).not.toContain('in_progress')
		const wrapper = mountBoard({ features: [...FEATURES, { slug: 'x', title: 'X', status: 'in_progress', category: 'crm' }] })
		expect(wrapper.findAll('.cn-features-board__filter-option').map((o) => o.attributes('data-status'))).toEqual(['all', 'available', 'beta', 'in_progress', 'planned'])
	})
})
