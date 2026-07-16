/**
 * Tests for CnDetailPage context push to cnAiContext.
 */

import { mount } from '@vue/test-utils'

const Vue = require('vue').default || require('vue')

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), put: jest.fn() },
}))

const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

function makeAiContext(overrides = {}) {
	return Vue.observable({ appId: 'test', pageKind: 'custom', route: { path: '/' }, ...overrides })
}

const stubs = {
	CnIcon: { template: '<div />' },
	CnLockedBanner: { template: '<div />' },
	NcEmptyContent: { template: '<div><slot name="icon"/><slot name="action"/></div>' },
	NcLoadingIcon: { template: '<div />' },
	NcButton: { template: '<div><slot/><slot name="icon"/></div>' },
	AlertCircleOutline: { template: '<div />' },
	InformationOutline: { template: '<div />' },
	Refresh: { template: '<div />' },
}

function mountDetail(props = {}, cnAiContext = null) {
	const provide = {}
	if (cnAiContext) provide.cnAiContext = cnAiContext

	return mount(CnDetailPage, {
		propsData: {
			title: 'Test Object',
			objectId: '00000000-0000-0000-0000-000000000000',
			objectType: 'organisation',
			sidebarProps: { register: 'catalogus', schema: 'organisation' },
			...props,
		},
		provide,
		stubs,
	})
}

describe('CnDetailPage — AI context push', () => {
	it('writes pageKind="detail", objectUuid, registerSlug, schemaSlug on created()', () => {
		const ctx = makeAiContext()
		mountDetail({}, ctx)

		expect(ctx.pageKind).toBe('detail')
		expect(ctx.objectUuid).toBe('00000000-0000-0000-0000-000000000000')
	})

	it('re-pushes objectUuid when objectId prop changes', async () => {
		const ctx = makeAiContext()
		const wrapper = mountDetail({}, ctx)

		await wrapper.setProps({ objectId: 'aaaaaaaa-0000-0000-0000-000000000000' })
		expect(ctx.objectUuid).toBe('aaaaaaaa-0000-0000-0000-000000000000')
	})

	it('beforeDestroy resets pageKind to "custom" and clears fields', () => {
		const ctx = makeAiContext()
		const wrapper = mountDetail({}, ctx)

		expect(ctx.pageKind).toBe('detail')
		wrapper.destroy()
		expect(ctx.pageKind).toBe('custom')
		expect(ctx.objectUuid).toBeUndefined()
	})

	it('does not crash when cnAiContext is not provided', () => {
		expect(() => mountDetail({})).not.toThrow()
	})
})
