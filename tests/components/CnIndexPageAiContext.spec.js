/**
 * Tests for CnIndexPage context push to cnAiContext.
 * Covers Task 6.7: page-component context push tests.
 */

import { mount } from '@vue/test-utils'

const Vue = require('vue').default || require('vue')

// Stub all heavy deps
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), put: jest.fn() },
}))

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const baseSchema = { id: 'organisation', title: 'Organisation', properties: {} }

function makeAiContext(overrides = {}) {
	return Vue.observable({ appId: 'test', pageKind: 'custom', route: { path: '/' }, ...overrides })
}

const minProps = {
	title: 'Test page',
	objects: [],
	schema: baseSchema,
	register: 'catalogus',
}

const stubs = {
	CnActionsBar: { template: '<div class="stub-actions-bar" />' },
	CnIndexSidebar: { template: '<div class="stub-index-sidebar" />' },
	CnMassDeleteDialog: { template: '<div />' },
	CnMassCopyDialog: { template: '<div />' },
	CnMassExportDialog: { template: '<div />' },
	CnMassImportDialog: { template: '<div />' },
	CnDeleteDialog: { template: '<div />' },
	CnFormDialog: { template: '<div />' },
	CnDataTable: { template: '<div class="stub-data-table" />' },
	CnCardGrid: { template: '<div class="stub-card-grid" />' },
	CnContextMenu: { template: '<div />' },
	CnPagination: { template: '<div />' },
	CnPageHeader: { template: '<div />' },
}

function mountIndex(props = {}, cnAiContext = null) {
	const provide = {}
	if (cnAiContext) provide.cnAiContext = cnAiContext

	return mount(CnIndexPage, {
		propsData: { ...minProps, ...props },
		provide,
		stubs,
	})
}

describe('CnIndexPage — AI context push', () => {
	it('writes pageKind="index", registerSlug, schemaSlug into cnAiContext on created()', async () => {
		const ctx = makeAiContext()
		mountIndex({}, ctx)

		expect(ctx.pageKind).toBe('index')
		expect(ctx.registerSlug).toBe('catalogus')
		expect(ctx.schemaSlug).toBe('organisation')
	})

	it('re-pushes when register prop changes', async () => {
		const ctx = makeAiContext()
		const wrapper = mountIndex({}, ctx)

		await wrapper.setProps({ register: 'new-register' })
		expect(ctx.registerSlug).toBe('new-register')
	})

	it('beforeDestroy resets pageKind to "custom" and clears fields', () => {
		const ctx = makeAiContext()
		const wrapper = mountIndex({}, ctx)

		expect(ctx.pageKind).toBe('index')
		wrapper.destroy()
		expect(ctx.pageKind).toBe('custom')
		expect(ctx.registerSlug).toBeUndefined()
		expect(ctx.schemaSlug).toBeUndefined()
	})

	it('does not crash when cnAiContext is not provided', () => {
		expect(() => mountIndex({})).not.toThrow()
	})
})
