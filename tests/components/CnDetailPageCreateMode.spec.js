/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage item-10 fix (ADR-062): the create archetype — a
 * schema-bound `type:"detail"` page whose route carries NO :id renders an
 * empty create form instead of a blank page, prefilled from the route query,
 * and saving POSTs the object then navigates.
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const mockPost = jest.fn(async () => ({ status: 200, data: { '@self': { id: 'new-1' } } }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: () => Promise.resolve({ status: 200, data: {} }), post: (...a) => mockPost(...a) } }))

const SCHEMA = { title: 'Task', properties: { title: { type: 'string' }, caseId: { type: 'string' } } }

function makeStore() {
	return {
		objects: {},
		schemas: { 'proc-task': SCHEMA },
		objectTypeRegistry: { 'proc-task': {} },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountCreate(propsData = {}, route = { query: {} }) {
	return mount(CnDetailPage, {
		propsData: { title: 'New task', register: 'proc', schema: 'task', objectStore: makeStore(), ...propsData },
		mocks: { $route: route, $router: { push: jest.fn(() => Promise.resolve()), back: jest.fn() } },
		stubs: { CnFormDialog: { name: 'CnFormDialog', template: '<div class="stub-create-form" />' } },
	})
}

describe('CnDetailPage — create archetype', () => {
	it('is in create mode and renders the create form (not a blank page)', () => {
		const w = mountCreate()
		expect(w.vm.isCreateMode).toBe(true)
		expect(w.find('.stub-create-form').exists()).toBe(true)
	})

	it('prefills the form from route query params that match schema properties', () => {
		const w = mountCreate({}, { query: { caseId: 'c-9', bogus: 'x' } })
		expect(w.vm.createPrefill).toEqual({ caseId: 'c-9' })
	})

	it('POSTs the object and navigates to createRoute on save', async () => {
		const push = jest.fn(() => Promise.resolve())
		const w = mount(CnDetailPage, {
			propsData: { title: 'New task', register: 'proc', schema: 'task', createRoute: 'task-detail', objectStore: makeStore() },
			mocks: { $route: { query: {} }, $router: { push, back: jest.fn() } },
			stubs: { CnFormDialog: { name: 'CnFormDialog', template: '<div />' } },
		})
		w.vm.$refs.createFormDialog = { setResult: jest.fn() }
		await w.vm.onCreateFormConfirm({ title: 'Do it' })
		expect(mockPost).toHaveBeenCalled()
		expect(w.emitted('created')).toBeTruthy()
		expect(push).toHaveBeenCalledWith({ name: 'task-detail', params: { id: 'new-1' } })
	})

	it('is NOT in create mode when an objectId is present', () => {
		const w = mount(CnDetailPage, {
			propsData: { title: 'Task', register: 'proc', schema: 'task', objectId: 'id-1', objectStore: makeStore() },
			mocks: { $route: { query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
			stubs: { CnFormDialog: true },
		})
		expect(w.vm.isCreateMode).toBe(false)
	})

	it('is NOT in create mode when a normal default slot supplies a body', () => {
		const w = mount(CnDetailPage, {
			propsData: { title: 'Designer', register: 'proc', schema: 'task', objectStore: makeStore() },
			mocks: { $route: { query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
			stubs: { CnFormDialog: { name: 'CnFormDialog', template: '<div class="stub-create-form" />' } },
			slots: { default: '<div class="custom-body">designer</div>' },
		})
		expect(w.vm.hasDefaultSlotContent).toBe(true)
		expect(w.vm.isCreateMode).toBe(false)
		expect(w.find('.stub-create-form').exists()).toBe(false)
	})

	it('is NOT in create mode when a SCOPED default slot supplies a body', () => {
		// Regression: `hasDefaultSlotContent` read only `$slots.default`, but a
		// default slot passed WITH a scope lands ONLY in `$scopedSlots` in Vue 2
		// — which is exactly how CnPageRenderer hands a manifest page its
		// `slots.default`. The guard therefore reported "empty" and the create
		// form opened ON TOP of the page's own content, undismissable without
		// leaving the route (openbuild's Page designer).
		const w = mount(CnDetailPage, {
			propsData: { title: 'Page designer', register: 'openbuild', schema: 'application', objectStore: makeStore() },
			mocks: { $route: { query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
			stubs: { CnFormDialog: { name: 'CnFormDialog', template: '<div class="stub-create-form" />' } },
			scopedSlots: { default: '<div class="custom-body">designer</div>' },
		})
		expect(w.vm.hasDefaultSlotContent).toBe(true)
		expect(w.vm.isCreateMode).toBe(false)
		expect(w.find('.stub-create-form').exists()).toBe(false)
		expect(w.find('.custom-body').exists()).toBe(true)
	})

	it('STILL create-modes for a whitespace-only scoped slot', () => {
		// The scoped slot is invoked rather than merely tested for existence:
		// Vue 2.6 mirrors normal slots onto $scopedSlots, so presence alone would
		// disable the create archetype for pages that legitimately want it.
		const w = mount(CnDetailPage, {
			propsData: { title: 'New task', register: 'proc', schema: 'task', objectStore: makeStore() },
			mocks: { $route: { query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
			stubs: { CnFormDialog: { name: 'CnFormDialog', template: '<div class="stub-create-form" />' } },
			scopedSlots: { default: '<template>   </template>' },
		})
		expect(w.vm.hasDefaultSlotContent).toBe(false)
		expect(w.vm.isCreateMode).toBe(true)
	})
})
