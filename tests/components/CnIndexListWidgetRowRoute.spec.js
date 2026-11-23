/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list in a detail page opens a row on its own page (`content.rowRoute`):
 * a notice in the portal's Mededelingen tab opens the notice's page.
 *
 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-detail-page-opens-its-rows-on-their-page
 */
const { mount } = require('@vue/test-utils')

jest.mock('../../src/components/CnIndexPage/CnIndexPage.vue', () => ({
	__esModule: true,
	default: {
		name: 'CnIndexPage',
		props: ['register', 'schema', 'filter', 'title', 'showTitle', 'routeState', 'buildiqButton', 'rowClickToView', 'viewTo', 'rowRoute'],
		emits: ['rowClick'],
		template: '<div class="index-stub" />',
	},
}))

const CnIndexListWidget = require('../../src/components/CnIndexListWidget/CnIndexListWidget.vue').default

function mountWith(content) {
	const push = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnIndexListWidget, {
		props: { content: { register: 'portaliq', schema: 'portalNotice', filter: { portal: '@object.slug' }, ...content }, objectId: 'p1', objectData: { slug: 'zuiddrecht' } },
		global: { mocks: { $router: { push, resolve: (to) => ({ href: '/x', ...to }) } } },
	})
	return { page: wrapper.findComponent({ name: 'CnIndexPage' }), push }
}

describe('CnIndexListWidget rowRoute', () => {
	it('links a row to its page and opens it on a click', () => {
		const { page, push } = mountWith({ rowRoute: 'NoticeDetail' })
		expect(page.props('rowClickToView')).toBe(true)
		expect(page.props('viewTo')({ id: 'n1' })).toEqual({ name: 'NoticeDetail', params: { id: 'n1' } })
		expect(page.props('rowRoute')).toBeUndefined()
		page.vm.$emit('rowClick', { '@self': { id: 'n2' } })
		expect(push).toHaveBeenCalledWith({ name: 'NoticeDetail', params: { id: 'n2' } })
	})

	it('opens nothing without one', () => {
		const { page } = mountWith({})
		expect(page.props('rowClickToView')).toBeUndefined()
		expect(page.props('viewTo')).toBeUndefined()
	})
})
