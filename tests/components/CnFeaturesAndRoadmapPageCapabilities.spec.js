/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * How the manifest page resolves the capability comparison: the prop a
 * manifest `config` block sets, then the initial state the server provisions,
 * then nothing at all.
 *
 * The third case is the one that matters for the other 20 apps. They set no
 * prop and provision no slot, and they must reach the view with `null` rather
 * than with an empty object, which would grow a third toggle stop over zero
 * rows.
 */

import { mount } from '@vue/test-utils'
import CnFeaturesAndRoadmapPage from '../../src/components/CnFeaturesAndRoadmapPage/CnFeaturesAndRoadmapPage.vue'

const provisioned = {}

jest.mock('@nextcloud/initial-state', () => ({
	loadState: (app, key, fallback) => (key in provisioned ? provisioned[key] : fallback),
}))

const stubs = {
	CnFeaturesAndRoadmapView: {
		name: 'CnFeaturesAndRoadmapView',
		props: ['repo', 'forge', 'features', 'disabled', 'openbuiltUrl', 'llmSkillsUrl', 'suggestUrl', 'documentationUrl', 'capabilityComparison'],
		template: '<div class="view" />',
	},
}

const document1 = {
	systems: [{ key: 'dossiq', name: 'Dossiq', isSelf: true }],
	areas: [{ key: 'intake', name: 'Intake' }],
	capabilities: [{ id: '1.1', area: 'intake', name: 'Citizen web form', dossiq: 'yes' }],
}

/**
 * Mount the page and read what it handed the view.
 *
 * @param {object} [propsData] Props for the page.
 * @return {unknown} The `capabilityComparison` the view received.
 */
function handedToView(propsData = {}) {
	const wrapper = mount(CnFeaturesAndRoadmapPage, {
		stubs,
		propsData: { appId: 'dossiq', ...propsData },
	})
	return wrapper.findComponent({ name: 'CnFeaturesAndRoadmapView' }).props('capabilityComparison')
}

describe('CnFeaturesAndRoadmapPage and the capability comparison', () => {
	afterEach(() => {
		for (const key of Object.keys(provisioned)) {
			delete provisioned[key]
		}
	})

	it('hands the view null when the app sets no prop and provisions no slot', () => {
		expect(handedToView()).toBeNull()
	})

	it('hands the view the document the manifest config supplies', () => {
		expect(handedToView({ capabilityComparison: document1 })).toStrictEqual(document1)
	})

	it('reads the document from the provisioned initial state', () => {
		provisioned.features_roadmap_capabilities = document1
		expect(handedToView()).toStrictEqual(document1)
	})

	it('lets the manifest config win over the provisioned slot', () => {
		provisioned.features_roadmap_capabilities = document1
		const other = { ...document1, capabilities: [] }
		expect(handedToView({ capabilityComparison: other }).capabilities).toHaveLength(0)
	})

	it('namespaces the lookup under the app id', () => {
		let seenApp = null
		const spy = jest.requireMock('@nextcloud/initial-state')
		const original = spy.loadState
		spy.loadState = (app, key, fallback) => {
			if (key === 'features_roadmap_capabilities') {
				seenApp = app
			}
			return fallback
		}
		handedToView({ appId: 'learniq' })
		spy.loadState = original
		expect(seenApp).toBe('learniq')
	})
})
