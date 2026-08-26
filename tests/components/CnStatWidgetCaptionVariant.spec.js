/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the two additions that let a bespoke KPI card be expressed as
 * config instead of a component:
 *
 *   1. `caption` interpolation — `{field}` tokens resolved from the fetched
 *      payload, so a tile can carry a secondary line ("Gold · 5-day streak")
 *      without an app writing its own card to render one.
 *   2. static `content.variant` — the resting colour, matching how
 *      CnStatsBlock has always been coloured, so a tile migrating onto this
 *      component does not silently lose it.
 *
 * NOTE ON THE URLS. Each test uses a DISTINCT endpoint url, because
 * `useEndpointSource` dedups and caches by (url + params): sharing one url
 * makes every later test read the first one's payload, and they pass or fail
 * on data they did not set. That cost an hour here.
 *
 * WHY THESE MATTER. Before them, a tile needing either had to be a hand-written
 * component — and every such component observed in the fleet also
 * re-implemented fetching, and swallowed its errors into a zero. A dashboard
 * showing "0" when the backend is down is worse than one showing nothing,
 * because zero is a number a reader will believe.
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'

import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

// Written after the imports for `import/first`; babel-plugin-jest-hoist lifts
// these above them at transform time, so the mocks are still in place before
// the modules are resolved.
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

function mountWidget(content) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs,
		provide: { cnWorkspaceContext: {} },
	})
}

describe('CnStatWidget caption interpolation', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('replaces {field} tokens from the endpoint payload', async () => {
		axios.get.mockResolvedValue({
			data: { totalPoints: 1280, levelName: 'Gold', currentStreakDays: 5 },
		})

		const wrapper = mountWidget({
			label: 'My points',
			endpointSource: { url: '/apps/learniq/api/engagement-tokens' },
			valueField: 'totalPoints',
			caption: '{levelName} · {currentStreakDays}-day streak',
		})
		await flush()
		await flush()
		await flush()

		expect(wrapper.text()).toContain('Gold · 5-day streak')
	})

	it('resolves a missing field to nothing rather than showing a raw token', async () => {
		// The failure this guards is cosmetic but corrosive: a caption is
		// decoration, and a reader who sees `{levelName}` on a dashboard learns
		// to distrust the numbers next to it.
		axios.get.mockResolvedValue({ data: { totalPoints: 10 } })

		const wrapper = mountWidget({
			endpointSource: { url: '/apps/learniq/api/engagement-missing' },
			valueField: 'totalPoints',
			caption: '{levelName} level',
		})
		await flush()
		await flush()
		await flush()

		expect(wrapper.text()).not.toContain('{levelName}')
		expect(wrapper.text()).toContain('level')
	})

	it('leaves a caption with no tokens exactly as it is', async () => {
		axios.get.mockResolvedValue({ data: { totalPoints: 10 } })

		const wrapper = mountWidget({
			endpointSource: { url: '/apps/learniq/api/engagement-plain' },
			valueField: 'totalPoints',
			caption: 'Lifetime total',
		})
		await flush()
		await flush()
		await flush()

		expect(wrapper.text()).toContain('Lifetime total')
	})

	it('supports a dot-path token', async () => {
		axios.get.mockResolvedValue({
			data: { totalPoints: 7, level: { name: 'Silver' } },
		})

		const wrapper = mountWidget({
			endpointSource: { url: '/apps/learniq/api/engagement-dotpath' },
			valueField: 'totalPoints',
			caption: '{level.name}',
		})
		await flush()
		await flush()
		await flush()

		expect(wrapper.text()).toContain('Silver')
	})
})

describe('CnStatWidget static variant', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { value: 42 } })
	})

	it('colours the value from a static variant', async () => {
		const wrapper = mountWidget({
			label: 'Learners',
			variant: 'success',
			source: { register: 'learniq', schema: 'learner-profile', metric: 'count' },
		})
		await flush()
		await flush()
		await flush()

		// jsdom's CSSStyleDeclaration rejects `color: var(--x)` and drops it, so
		// the rendered style attribute is empty no matter how correct the
		// binding is. Assert the computed the template binds to — that is the
		// component's own output, and the only honest thing to check here.
		expect(wrapper.vm.valueStyle).toEqual({ color: 'var(--color-success)' })
	})

	it('lets a variantWhen rule override the static variant', async () => {
		// The precedence that matters: `variant` is the resting colour, while a
		// threshold rule is a statement about the CURRENT value. A tile that
		// says "warn when this is low" must be able to warn even though its
		// resting colour is success — otherwise the signal is unreachable.
		axios.get.mockResolvedValue({ data: { value: 3 } })

		const wrapper = mountWidget({
			variant: 'success',
			variantWhen: [{ op: 'lt', value: 10, variant: 'warning' }],
			source: { register: 'learniq', schema: 'learner-profile', metric: 'count' },
		})
		await flush()
		await flush()
		await flush()

		expect(wrapper.vm.valueStyle).toEqual({ color: 'var(--color-warning)' })
	})

	it('ignores an unknown variant name instead of emitting a broken style', async () => {
		const wrapper = mountWidget({
			variant: 'chartreuse',
			source: { register: 'learniq', schema: 'learner-profile', metric: 'count' },
		})
		await flush()
		await flush()
		await flush()

		expect(wrapper.vm.valueStyle).toEqual({})
	})
})
