/**
 * Tests for CnWidgetRefItem.
 *
 * Covers the `manifest-widget-ref-page-content-type` spec (nc-vue #200 §1):
 *  - Parses `openregister://widget/<schemaSlug>/<widgetSlug>` URIs.
 *  - Calls OR's widget-fetch API at the correct URL.
 *  - Resolves the returned `component` name against `cnCustomComponents`.
 *  - Renders loading state while the API call is in flight.
 *  - Renders the resolved component with widgetData as props on success.
 *  - Renders an error fallback on API failure, missing component field,
 *    or component not found in registry.
 */

import { shallowMount } from '@vue/test-utils'
import CnWidgetRefItem from '@/components/CnWidgetRefItem/CnWidgetRefItem.vue'

// Stub axios so tests do not make real HTTP requests.
jest.mock('@nextcloud/axios', () => ({
	get: jest.fn(),
}))

const axios = require('@nextcloud/axios')

const CoverageGridStub = {
	name: 'CoverageGrid',
	template: '<div class="coverage-grid-stub" />',
	props: ['title', 'items'],
}

const BoardProofStub = {
	name: 'BoardProof',
	template: '<div class="board-proof-stub" />',
	props: ['title'],
}

const defaultRegistry = {
	CoverageGridWidget: CoverageGridStub,
	BoardProofWidget: BoardProofStub,
}

function mountItem(refUri, { registry = defaultRegistry, ...opts } = {}) {
	return shallowMount(CnWidgetRefItem, {
		propsData: { refUri },
		provide: { cnCustomComponents: registry },
		stubs: {
			NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
			NcEmptyContent: { template: '<div class="nc-empty-content-stub">{{ description }}</div>', props: ['description'] },
			AlertCircleOutline: { template: '<span />' },
		},
		...opts,
	})
}

describe('CnWidgetRefItem', () => {
	let warnSpy

	beforeEach(() => {
		jest.clearAllMocks()
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('loading state', () => {
		it('renders the loading icon while the API call is in flight', async () => {
			// Never resolve to keep the component in loading state.
			axios.get.mockReturnValue(new Promise(() => {}))

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			// Immediately after mount (before created() async resolves) loading = true.
			expect(wrapper.vm.loading).toBe(true)
			expect(wrapper.find('.nc-loading-icon-stub').exists()).toBe(true)
		})
	})

	describe('successful resolution', () => {
		it('calls the OR widget-fetch API with the correct URL', async () => {
			axios.get.mockResolvedValue({ data: { component: 'CoverageGridWidget' } })

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			// Let the created() async run.
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()

			expect(axios.get).toHaveBeenCalledWith(
				'/index.php/apps/openregister/api/schemas/regulation/widgets/coverageGrid',
			)
		})

		it('renders the resolved component after API success', async () => {
			axios.get.mockResolvedValue({ data: { component: 'CoverageGridWidget', title: 'Grid' } })

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.loading).toBe(false)
			expect(wrapper.vm.error).toBeNull()
			expect(wrapper.vm.resolvedComponent).toBe(CoverageGridStub)
		})

		it('forwards extra API response fields as props to the resolved component', async () => {
			axios.get.mockResolvedValue({
				data: { component: 'CoverageGridWidget', title: 'Coverage', items: ['a', 'b'] },
			})

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()

			// widgetData should contain all keys except `component`
			expect(wrapper.vm.widgetData).toEqual({ title: 'Coverage', items: ['a', 'b'] })
		})
	})

	describe('error states', () => {
		it('shows an error fallback when the API returns a non-2xx status', async () => {
			const err = new Error('Not Found')
			err.response = { status: 404 }
			axios.get.mockRejectedValue(err)

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.loading).toBe(false)
			expect(wrapper.vm.error).toContain('404')
			expect(wrapper.vm.resolvedComponent).toBeNull()
			expect(warnSpy).toHaveBeenCalled()
		})

		it('shows an error fallback when the API response lacks a `component` field', async () => {
			axios.get.mockResolvedValue({ data: {} })

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.loading).toBe(false)
			expect(wrapper.vm.error).toContain('"component"')
			expect(warnSpy).toHaveBeenCalled()
		})

		it('shows an error fallback when the component is not in the registry', async () => {
			axios.get.mockResolvedValue({ data: { component: 'UnknownWidget' } })

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.error).toContain('"UnknownWidget"')
			expect(warnSpy).toHaveBeenCalled()
		})

		it('shows an error fallback when the refUri is not a valid openregister URI', async () => {
			const wrapper = mountItem('https://example.com/widget')
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.loading).toBe(false)
			expect(wrapper.vm.error).toContain('Invalid ref URI')
			expect(axios.get).not.toHaveBeenCalled()
		})
	})

	describe('parsedRef computed', () => {
		it('correctly parses a valid widget-ref URI', () => {
			axios.get.mockReturnValue(new Promise(() => {}))
			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			expect(wrapper.vm.parsedRef).toEqual({
				schemaSlug: 'regulation',
				widgetSlug: 'coverageGrid',
			})
		})

		it('returns null for an invalid URI', () => {
			axios.get.mockReturnValue(new Promise(() => {}))
			// Suppress the warn from created() for the invalid URI.
			axios.get.mockResolvedValue({ data: {} })
			const wrapper = mountItem('not-a-valid-uri')
			expect(wrapper.vm.parsedRef).toBeNull()
		})
	})

	describe('refUri watcher', () => {
		it('re-resolves when refUri changes', async () => {
			axios.get
				.mockResolvedValueOnce({ data: { component: 'CoverageGridWidget' } })
				.mockResolvedValueOnce({ data: { component: 'BoardProofWidget' } })

			const wrapper = mountItem('openregister://widget/regulation/coverageGrid')
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.resolvedComponent).toBe(CoverageGridStub)

			await wrapper.setProps({ refUri: 'openregister://widget/regulation/boardProof' })
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.resolvedComponent).toBe(BoardProofStub)
			expect(axios.get).toHaveBeenCalledTimes(2)
		})
	})
})
