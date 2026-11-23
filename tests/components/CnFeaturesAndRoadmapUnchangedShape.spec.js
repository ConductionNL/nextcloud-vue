/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The additive capability-comparison work must not move a pixel for the 21
 * apps that pass none of the new props. This suite is the proof.
 *
 * The snapshots in `__snapshots__/CnFeaturesAndRoadmapUnchangedShape.spec.js.snap`
 * were recorded on the commit BEFORE the capability table existed (see that
 * commit in the PR). Any markup change reachable from the old prop set
 * reddens them, so "additive" is checked rather than asserted.
 *
 * A snapshot alone would be a test that cannot fail if it were recorded after
 * the change, so the recording commit is the load-bearing part, not the
 * assertion.
 */

import { mount } from '@vue/test-utils'
import CnFeaturesAndRoadmapPage from '../../src/components/CnFeaturesAndRoadmapPage/CnFeaturesAndRoadmapPage.vue'
import CnFeaturesAndRoadmapView from '../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'

jest.mock('@nextcloud/initial-state', () => ({
	loadState: (app, key, fallback) => fallback,
}))

const stubs = {
	NcButton: {
		name: 'NcButton',
		emits: ['click'],
		props: ['href', 'target', 'rel', 'variant', 'ariaLabel'],
		template: '<button class="btn" :data-href="href" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
	NcEmptyContent: {
		name: 'NcEmptyContent',
		props: ['name', 'description'],
		template: '<div class="empty"><h2>{{ name }}</h2><p>{{ description }}</p></div>',
	},
	NcNoteCard: { name: 'NcNoteCard', props: ['type'], template: '<div class="note-card" :data-type="type"><slot /></div>' },
	NcTextField: { name: 'NcTextField', props: ['modelValue', 'label'], template: '<input class="text-field" :value="modelValue" :aria-label="label">' },
	FormatListBulleted: true,
	LockOutline: true,
	Plus: true,
	RoadVariant: true,
	CnFeaturesTab: { name: 'CnFeaturesTab', props: ['features'], template: '<div class="features-tab" :data-count="features.length" />' },
	CnRoadmapTab: { name: 'CnRoadmapTab', props: ['repo'], template: '<div class="roadmap-tab" :data-repo="repo" />' },
}

const oldProps = {
	repo: 'ConductionNL/openregister',
	features: [
		{ slug: 'a', title: 'Alpha', summary: 'First' },
		{ slug: 'b', title: 'Beta', summary: 'Second' },
	],
	documentationUrl: 'https://docs.example.org',
}

describe('the Features and roadmap surface for a consumer that passes no new props', () => {
	it('renders the view exactly as it did before the capability table existed', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: oldProps })
		expect(wrapper.html()).toMatchSnapshot()
	})

	it('renders the roadmap side of the view exactly as it did before', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: oldProps })
		await wrapper.findAll('.cn-features-and-roadmap-view__actions button.btn').at(0).trigger('click')
		expect(wrapper.html()).toMatchSnapshot()
	})

	it('renders the manifest page exactly as it did before', () => {
		const wrapper = mount(CnFeaturesAndRoadmapPage, {
			stubs,
			propsData: { repo: 'ConductionNL/openregister', features: oldProps.features, appId: 'openregister' },
		})
		expect(wrapper.html()).toMatchSnapshot()
	})

	it('keeps the view header at two buttons when no comparison is supplied', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: oldProps })
		expect(wrapper.findAll('.cn-features-and-roadmap-view__actions button.btn')).toHaveLength(2)
	})
})
