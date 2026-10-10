/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The one Follow control beside the title of a schema-driven detail page (no
 * star since `one-follow-control`), and the `@self.can` extend on its object read.
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-3
 * @spec openspec/changes/one-follow-control/specs/record-follow/spec.md#requirement-one-follow-control-with-a-notifications-switch
 */
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function makeStore(self) {
	return reactive({
		objects: { 'pipelinq-ticket': { t1: { id: 't1', title: 'Broken printer', '@self': self } } },
		objectTypeRegistry: { 'pipelinq-ticket': { register: 'pipelinq', schema: 'ticket' } },
		schemas: { 'pipelinq-ticket': { title: 'Ticket', properties: { title: { type: 'string' } } } },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn().mockResolvedValue(null),
		fetchSchema: jest.fn().mockResolvedValue(null),
		getSchema: () => ({ title: 'Ticket', properties: { title: { type: 'string' } } }),
		getError: () => null,
		getObject: () => null,
	})
}

const stubs = {
	CnFavouriteToggle: { props: ['favourite'], template: '<i class="fav" :data-on="favourite" />' },
	CnFollowToggle: { props: ['watching', 'notify', 'watcherCount', 'canManage', 'notifies'], template: '<i class="follow" :data-notify="notify" :data-count="watcherCount" :data-manage="canManage" :data-notifies="notifies" />' },
}

function mountPage(self, props = {}) {
	const store = makeStore(self)
	const w = mount(CnDetailPage, {
		props: { title: 'Ticket', register: 'pipelinq', schema: 'ticket', objectId: 't1', objectStore: store, ...props },
		global: { stubs, mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } } },
	})
	return { w, store }
}

describe('CnDetailPage favourite and follow', () => {
	it('declares the props with an automatic default', () => {
		expect(CnDetailPage.props.favourite.default).toBeNull()
		expect(CnDetailPage.props.follow.default).toBeNull()
		expect(CnDetailPage.props.extend.default()).toEqual([])
	})

	it('renders only the Follow control, with its notifications switch, never a star', async () => {
		const { w } = mountPage({ favourite: true, watching: true, watchNotify: false, watcherCount: 3, can: { manage: true } })
		await flushPromises()
		expect(w.find('.fav').exists()).toBe(false)
		const follow = w.find('.follow')
		expect(follow.attributes('data-notify')).toBe('false')
		expect(follow.attributes('data-count')).toBe('3')
		expect(follow.attributes('data-manage')).toBe('true')
	})

	it('ignores the deprecated favourite prop', async () => {
		const { w } = mountPage({ favourite: true, watching: true }, { favourite: true })
		await flushPromises()
		expect(w.find('.fav').exists()).toBe(false)
		expect(w.find('.follow').exists()).toBe(true)
	})

	it('renders nothing without the markers', async () => {
		const { w } = mountPage({})
		await flushPromises()
		expect(w.find('.fav').exists()).toBe(false)
		expect(w.find('.follow').exists()).toBe(false)
	})

	it('favourite:false and follow:false remove the controls', async () => {
		const { w } = mountPage({ favourite: false, watching: false }, { favourite: false, follow: false })
		await flushPromises()
		expect(w.find('.fav').exists()).toBe(false)
		expect(w.find('.follow').exists()).toBe(false)
	})

	it('shows no count for a reader without watcherCount, and passes notifies:false on', async () => {
		const { w } = mountPage({ watching: false }, { followNotifies: false })
		await flushPromises()
		const follow = w.find('.follow')
		expect(follow.attributes('data-count')).toBeUndefined()
		expect(follow.attributes('data-notifies')).toBe('false')
	})

	it('asks for @self.can on the object read, merged with the page extend', async () => {
		const { store } = mountPage({ watching: false }, { extend: ['@self.unreadCounts'] })
		await flushPromises()
		expect(store.fetchObject).toHaveBeenCalledWith('pipelinq-ticket', 't1', { extend: ['@self.unreadCounts', '@self.can'] })
	})

	it('does not ask for @self.can when follow is off', async () => {
		const { store } = mountPage({}, { follow: false })
		await flushPromises()
		expect(store.fetchObject).toHaveBeenCalledWith('pipelinq-ticket', 't1', { extend: [] })
	})
})
