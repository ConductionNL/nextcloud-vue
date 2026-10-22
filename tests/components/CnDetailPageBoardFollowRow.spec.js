/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the Follow control sits at the end of the meta row under
 * the title (the pills and the breadcrumb), not on a row of its own and not on
 * the title row beside the actions. Without the look it stays beside the
 * title.
 *
 * @spec openspec/changes/board-follow-in-meta-row/specs/board-follow-in-meta-row/spec.md#requirement-the-board-follow-control-ends-the-meta-row
 */
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function makeStore(self) {
	return reactive({
		objects: { 'dossiq-case': { c1: { id: 'c1', title: 'Verlichting fietspad', '@self': self } } },
		objectTypeRegistry: { 'dossiq-case': { register: 'dossiq', schema: 'case' } },
		schemas: { 'dossiq-case': { title: 'Zaak', properties: { title: { type: 'string' } } } },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn().mockResolvedValue(null),
		fetchSchema: jest.fn().mockResolvedValue(null),
		getSchema: () => ({ title: 'Zaak', properties: { title: { type: 'string' } } }),
		getError: () => null,
		getObject: () => null,
	})
}

const stubs = {
	CnFollowToggle: { props: ['watching', 'watcherCount', 'canManage'], template: '<i class="follow" :data-count="watcherCount" :data-manage="canManage" />' },
}

function mountPage(props = {}) {
	return mount(CnDetailPage, {
		props: {
			title: 'Zaak',
			register: 'dossiq',
			schema: 'case',
			objectId: 'c1',
			objectStore: makeStore({ watching: false, watcherCount: 2, can: { manage: true } }),
			...props,
		},
		global: { stubs, mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } } },
	})
}

describe('CnDetailPage: the Follow control in the board look', () => {
	it('draws it at the end of the meta row, with no row of its own', async () => {
		const w = mountPage({ look: 'board' })
		await flushPromises()
		const row2 = w.find('[data-testid="cn-detail-page-header-row2"]')
		expect(row2.exists()).toBe(true)
		expect(row2.find('.follow').exists()).toBe(true)
		expect(w.find('[data-testid="cn-detail-page-header-row3"]').exists()).toBe(false)
		expect(w.find('.cn-detail-page__title-row .follow').exists()).toBe(false)
		expect(w.findAll('.follow')).toHaveLength(1)
	})

	it('keeps the count and the follower management', async () => {
		const w = mountPage({ look: 'board' })
		await flushPromises()
		const follow = w.find('[data-testid="cn-detail-page-header-row2"] .follow')
		expect(follow.attributes('data-count')).toBe('2')
		expect(follow.attributes('data-manage')).toBe('true')
	})

	it('keeps it beside the title without the board look', async () => {
		const w = mountPage()
		await flushPromises()
		expect(w.find('[data-testid="cn-detail-page-header-row3"]').exists()).toBe(false)
		expect(w.find('.cn-detail-page__title-row .follow').exists()).toBe(true)
	})

	it('draws no Follow control when follow is off', async () => {
		const w = mountPage({ look: 'board', follow: false })
		await flushPromises()
		expect(w.find('.follow').exists()).toBe(false)
	})
})
