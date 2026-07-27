/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFormDialog's cross-app semantic-reference support (ADR-048).
 *
 * A schema property can declare `referenceSemanticType: '<uri>'` (a canonical
 * semantic-type URI) plus an optional `referenceSemanticApp: '<appid>'`. The
 * dialog resolves the URI against OpenRegister's discovery endpoint:
 *   - resolved  → a searchable object picker over the PROVIDER's register
 *   - unresolved → the field renders DISABLED with a mouse-over tooltip
 *   - absent key → the field renders as a normal auto-field (unchanged)
 */

import { mount } from '@vue/test-utils'

const mockStore = {
	objectTypeRegistry: {},
	createObjectTypeSlug: (...parts) => parts.join('-'),
	registerObjectType: jest.fn((slug) => {
		mockStore.objectTypeRegistry[slug] = {}
	}),
	fetchCollection: jest.fn().mockResolvedValue([
		{ id: 'org-1', title: 'Gemeente Zeist' },
		{ id: 'org-2', title: 'Gemeente Utrecht' },
	]),
	fetchObject: jest.fn().mockResolvedValue({ id: 'org-1', title: 'Gemeente Zeist' }),
}

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// Mock the discovery endpoint transport. `mockAxiosGet` is swapped per-test.
let mockAxiosGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockAxiosGet(...args) },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
}))

// Import AFTER the mocks are registered.
// eslint-disable-next-line import/first
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: {
		props: ['disabled', 'helperText', 'loading', 'label'],
		template: '<input class="nc-text-field" :disabled="disabled" :data-helper="helperText" />',
	},
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

const ORG_URI = 'https://schema.org/Organization'

const semanticSchema = {
	title: 'Product',
	properties: {
		title: { type: 'string', title: 'Title', order: 1 },
		supplier: {
			type: 'string',
			title: 'Supplier',
			order: 2,
			referenceSemanticType: ORG_URI,
			referenceSemanticApp: 'shillinq',
		},
	},
	required: ['title'],
}

beforeEach(() => {
	mockStore.objectTypeRegistry = {}
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchObject.mockClear()
	mockAxiosGet = jest.fn()
})

describe('CnFormDialog — cross-app semantic references (ADR-048)', () => {
	it('surfaces referenceSemanticType/App onto the field descriptor', () => {
		mockAxiosGet.mockResolvedValue({ data: { resolved: false } })
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: semanticSchema, item: null },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'supplier')
		expect(field.referenceSemanticType).toBe(ORG_URI)
		expect(field.referenceSemanticApp).toBe('shillinq')
	})

	it('calls the discovery endpoint once per distinct URI', async () => {
		mockAxiosGet.mockResolvedValue({ data: { resolved: false } })
		mount(CnFormDialog, {
			propsData: { schema: semanticSchema, item: null },
			stubs,
		})
		await flushPromises()
		expect(mockAxiosGet).toHaveBeenCalledTimes(1)
		expect(mockAxiosGet).toHaveBeenCalledWith(
			'/apps/openregister/api/schemas/resolve-by-implements',
			{ params: { uri: ORG_URI } },
		)
	})

	describe('unresolved (no installed provider)', () => {
		it('renders the field DISABLED with a tooltip', async () => {
			mockAxiosGet.mockResolvedValue({ data: { resolved: false } })
			const wrapper = mount(CnFormDialog, {
				propsData: { schema: semanticSchema, item: null },
				stubs,
			})
			await flushPromises()
			const field = wrapper.vm.visibleFields.find((f) => f.key === 'supplier')
			expect(wrapper.vm.isSemanticResolved(field)).toBe(false)
			expect(wrapper.vm.isSemanticLoading(field)).toBe(false)
			const wrapperEl = wrapper.find('.cn-form-dialog__semantic-unresolved')
			expect(wrapperEl.exists()).toBe(true)
			expect(wrapperEl.attributes('title')).toContain('shillinq')
			expect(wrapperEl.attributes('title')).toContain('Organization')
			// The input is disabled.
			expect(wrapperEl.find('input').attributes('disabled')).toBeTruthy()
		})

		it('degrades to unresolved (never crashes) on a 404 / network error', async () => {
			mockAxiosGet.mockRejectedValue(new Error('Request failed with status code 404'))
			const wrapper = mount(CnFormDialog, {
				propsData: { schema: semanticSchema, item: null },
				stubs,
			})
			await flushPromises()
			const field = wrapper.vm.visibleFields.find((f) => f.key === 'supplier')
			expect(wrapper.vm.isSemanticResolved(field)).toBe(false)
			expect(wrapper.find('.cn-form-dialog__semantic-unresolved').exists()).toBe(true)
		})

		it('keeps the rest of the form editable/saveable', async () => {
			mockAxiosGet.mockResolvedValue({ data: { resolved: false } })
			const wrapper = mount(CnFormDialog, {
				propsData: { schema: semanticSchema, item: null },
				stubs,
			})
			await flushPromises()
			wrapper.vm.updateField('title', 'My product')
			const payload = wrapper.vm.buildSubmitPayload()
			expect(payload.title).toBe('My product')
		})
	})

	describe('resolved (installed provider)', () => {
		const resolved = {
			data: {
				resolved: true,
				registerSlug: 'shillinq-suppliers',
				schemaSlug: 'organization',
				appId: 'shillinq',
			},
		}

		it('renders a searchable picker over the PROVIDER register', async () => {
			mockAxiosGet.mockResolvedValue(resolved)
			const wrapper = mount(CnFormDialog, {
				propsData: { schema: semanticSchema, item: null },
				stubs,
			})
			await flushPromises()
			const field = wrapper.vm.visibleFields.find((f) => f.key === 'supplier')
			expect(wrapper.vm.isSemanticResolved(field)).toBe(true)
			// Transformed into a $ref reference field pointing at the provider.
			expect(field.widget).toBe('select')
			expect(field.reference).toEqual({
				schema: 'organization',
				multiple: false,
				register: 'shillinq-suppliers',
			})
			expect(wrapper.vm.isReferenceField(field)).toBe(true)
			// It fetched objects from the PROVIDER's register, not the form's.
			await flushPromises()
			expect(mockStore.registerObjectType).toHaveBeenCalledWith(
				'shillinq-suppliers-organization',
				'organization',
				'shillinq-suppliers',
			)
			expect(mockStore.fetchCollection).toHaveBeenCalled()
		})

		it('stores the chosen object UUID as the field value', async () => {
			mockAxiosGet.mockResolvedValue(resolved)
			const wrapper = mount(CnFormDialog, {
				propsData: { schema: semanticSchema, item: null },
				stubs,
			})
			await flushPromises()
			const field = wrapper.vm.visibleFields.find((f) => f.key === 'supplier')
			wrapper.vm.onEffectiveSelectChange(field, { id: 'org-1', label: 'Gemeente Zeist' })
			expect(wrapper.vm.formData.supplier).toBe('org-1')
		})
	})

	it('leaves a field WITHOUT the semantic key completely unchanged', async () => {
		mockAxiosGet.mockResolvedValue({ data: { resolved: false } })
		const plainSchema = {
			title: 'Product',
			properties: {
				title: { type: 'string', title: 'Title', order: 1 },
			},
			required: ['title'],
		}
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: plainSchema, item: null },
			stubs,
		})
		await flushPromises()
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'title')
		expect(field.referenceSemanticType).toBeNull()
		expect(field.referenceSemanticApp).toBeNull()
		expect(field.widget).toBe('text')
		// No discovery call when no field declares a semantic type.
		expect(mockAxiosGet).not.toHaveBeenCalled()
		expect(wrapper.find('.cn-form-dialog__semantic-unresolved').exists()).toBe(false)
	})
})
