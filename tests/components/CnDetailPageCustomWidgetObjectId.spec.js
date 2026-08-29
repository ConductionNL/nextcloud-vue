/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `type: "custom"` body widget is mounted by CnPageRenderer as
 * `<component :is="entry.component" v-bind="slotProps" />`, so the scope
 * CnDetailPage binds on its `#widget-<id>` slot IS that widget's whole prop
 * set. It used to bind only `item` + `widget`, which meant a widget declaring
 * `objectId` kept its `default: ''` forever — and an empty id does not throw,
 * it silently widens an OpenRegister filter to the entire collection
 * (decidiq#968: the voting-round panel listed every round in the instance, so a
 * vote could be cast against another motion's round).
 *
 * These are the positive control for that binding. Against the pre-fix
 * template they fail with `objectId` = '' (the widget's own default), which is
 * exactly the silence the bug depended on.
 */
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

/**
 * Stand-in for a leaf app's custom tab — decidiq's MotionVotingRoundTab and its
 * ~240 siblings across the fleet declare exactly this prop shape, every one of
 * them with a silent default, so a missing binding reads as an empty value
 * rather than an error.
 */
const CustomTab = {
	name: 'CustomTab',
	props: {
		objectId: { type: [String, Number], default: '' },
		objectType: { type: String, default: '' },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		objectData: { type: Object, default: null },
	},
	template: '<div class="custom-tab">{{ objectId }}</div>',
}

/** A widget declaring none of the object-context props — must be unaffected. */
const ContextBlindTab = {
	name: 'ContextBlindTab',
	props: { item: { type: Object, default: null } },
	template: '<div class="blind-tab" />',
}

const LAYOUT = [{ id: '1', widgetId: 'voting-round', gridX: 0, gridY: 0, gridWidth: 12 }]
const WIDGETS = [{ id: 'voting-round', type: 'custom', component: 'MotionVotingRoundTab', title: 'Voting round' }]

/**
 * Mount a detail page carrying one `type: "custom"` grid widget and fill its
 * `#widget-<id>` slot the way CnPageRenderer does: spread the entire slot
 * scope onto the mapped component.
 *
 * @param {object} component Component to mount into the slot.
 * @param {object} extraProps Extra props for the page.
 * @return {object} The mounted wrapper.
 */
function mountPage(component = CustomTab, extraProps = {}) {
	return mount(CnDetailPage, {
		props: {
			title: 'Motion',
			register: 'decidiq',
			schema: 'decision',
			objectId: 'motion-42',
			layout: LAYOUT,
			widgets: WIDGETS,
			...extraProps,
		},
		slots: {
			// Mirrors CnPageRenderer: `<component :is="…" v-bind="slotProps" />`.
			'widget-voting-round': (slotProps) => h(component, slotProps),
		},
	})
}

describe('CnDetailPage — the #widget-<id> slot carries the object context', () => {
	it('gives a custom widget the page objectId, not its empty default', () => {
		const tab = mountPage().findComponent(CustomTab)
		expect(tab.exists()).toBe(true)
		expect(tab.props('objectId')).toBe('motion-42')
	})

	it('renders that id, so the widget can actually filter on it', () => {
		expect(mountPage().find('.custom-tab').text()).toBe('motion-42')
	})

	it('carries register / schema / objectType alongside the id', () => {
		const tab = mountPage().findComponent(CustomTab)
		expect(tab.props('register')).toBe('decidiq')
		expect(tab.props('schema')).toBe('decision')
		expect(tab.props('objectType')).toBe('decidiq-decision')
	})

	it('supplies the id on the first render, while the record is still null', () => {
		// The id comes from the route-fed prop, never read back off the record:
		// `resolvedObject` is itself keyed by `objectId` and is null until the
		// fetch resolves — the same "record has not arrived yet" race #850
		// fixed for the edit form. With no object store there is no record at
		// all, and the id must still reach the widget.
		const tab = mountPage().findComponent(CustomTab)
		expect(tab.props('objectData')).toBe(null)
		expect(tab.props('objectId')).toBe('motion-42')
	})

	it('still binds item and widget, so existing slot consumers keep working', () => {
		const seen = {}
		mount(CnDetailPage, {
			props: { title: 'Motion', objectId: 'motion-42', layout: LAYOUT, widgets: WIDGETS },
			slots: {
				'widget-voting-round': (slotProps) => {
					Object.assign(seen, slotProps)
					return h('i', { class: 'probe' })
				},
			},
		})
		expect(seen.item.widgetId).toBe('voting-round')
		expect(seen.widget.title).toBe('Voting round')
		expect(seen.objectId).toBe('motion-42')
	})

	it('leaves a widget that declares none of the context props unaffected', () => {
		const w = mountPage(ContextBlindTab)
		expect(w.findComponent(ContextBlindTab).exists()).toBe(true)
		expect(w.find('.blind-tab').exists()).toBe(true)
	})
})
