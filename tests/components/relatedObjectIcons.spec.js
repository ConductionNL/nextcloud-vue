/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * THE RELATED-OBJECTS WIDGET'S SECTIONS MUST DRAW THEIR OWN ICONS.
 *
 * `CnIcon` resolves a name against a registry the HOST app populates, and a
 * host registers the handful of icons it uses — not the integration set.
 * `registerIntegrationIcons()` exists for exactly that, which is why
 * CnIntegrationWidget and CnIntegrationWidgetEmpty each call it at module load.
 *
 * This widget called nothing, so its icons were correct precisely when one of
 * those two components happened to be on the same page — the registry is
 * global, and whichever module loaded first filled it. Measured against this
 * widget's OWN import graph: 7 of its 19 sections fell back to a help-circle.
 *
 * ⚠️ THE IMPORT GRAPH IS THE TEST. A spec that imported the integration
 * descriptors, or CnIntegrationWidget, or the icons module directly would
 * register the set as a side effect of its own imports and then report the
 * widget as fine — measuring a world the widget never runs in. That is how the
 * defect survived: `tests/integrations/icons.spec.js` asserts the same
 * property and passes, because it imports `src/integrations/icons.js` itself.
 *
 * So the first block below imports the WIDGET and nothing else.
 */
import { mount } from '@vue/test-utils'
import CnIcon from '../../src/components/CnIcon/CnIcon.vue'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'

/**
 * Every icon the widget's own sections name, in table order.
 *
 * Duplicated here rather than imported from the component, because the table is
 * a module-private const inside the SFC — and reaching for it through an export
 * would change the very import graph this file exists to measure.
 */
const SECTION_ICONS = [
	'Email', 'Calendar', 'AccountBox', 'CommentTextOutline', 'CheckboxMarkedOutline',
	'ViewColumnOutline', 'ChatOutline', 'ClipboardText', 'MapMarker', 'Poll',
	'Bookmark', 'BookOpenPageVariant', 'Image', 'CurrencyEur', 'Clock',
	'ChartBar', 'SitemapOutline', 'Briefcase', 'FileDocumentMultiple',
]

/**
 * @param {string} name The icon name.
 * @return {object} What CnIcon renders for it.
 */
function resolve(name) {
	return mount(CnIcon, { props: { name } }).vm.resolvedComponent
}

describe('CnRelatedObjectsWidget — section icons', () => {
	it('has a fallback that is a real component, or this file proves nothing', () => {
		expect(resolve('NoSuchIconExistsAnywhere')).toBeTruthy()
	})

	it('mounts the widget’s module without pulling in an integration widget', () => {
		// The premise. If importing the SFC ever started dragging
		// CnIntegrationWidget in, the assertion below would pass for the wrong
		// reason and this file would go quiet about a real regression.
		expect(CnRelatedObjectsWidget).toBeTruthy()
		expect(CnRelatedObjectsWidget.name).toBe('CnRelatedObjectsWidget')
	})

	it('resolves every section icon on its own', () => {
		const fallback = resolve('NoSuchIconExistsAnywhere')
		const unresolved = SECTION_ICONS.filter((name) => resolve(name) === fallback)

		// Counted, so a table that stopped naming icons cannot pass by having
		// nothing left to check.
		expect(SECTION_ICONS).toHaveLength(19)
		expect(unresolved).toEqual([])
	})
})

/**
 * A SECOND describe, deliberately AFTER the block above.
 *
 * These assertions need the registry and the descriptors, and importing them at
 * the top of the file would have registered the icon set before the first block
 * ran. `require` inside the test keeps that side effect out of the measurement
 * above while still letting this half compare the two tables.
 */
describe('CnRelatedObjectsWidget — agreement with the integration registry', () => {
	/**
	 * ⚠️ TWO TABLES DESCRIBING ONE INTEGRATION WILL DRIFT, AND THESE HAD.
	 *
	 * Talk wore `Forum` in the widget and `ChatOutline` in the registry, so the
	 * same integration carried a different glyph in the sidebar tab and in the
	 * widget section that deep-links to it.
	 */
	it('draws a section with the icon its integration uses', () => {
		// eslint-disable-next-line
		const { builtinIntegrations } = require('../../src/integrations/builtin/index.js')
		const registry = new Map(builtinIntegrations.map((entry) => [entry.id, entry.icon]))

		const pairs = [
			['email', 'Email'], ['calendar', 'Calendar'], ['contacts', 'AccountBox'],
			['notes', 'CommentTextOutline'], ['tasks', 'CheckboxMarkedOutline'],
			['deck', 'ViewColumnOutline'], ['talk', 'ChatOutline'], ['forms', 'ClipboardText'],
			['maps', 'MapMarker'], ['polls', 'Poll'], ['bookmarks', 'Bookmark'],
			['collectives', 'BookOpenPageVariant'], ['photos', 'Image'], ['cospend', 'CurrencyEur'],
			['time-tracker', 'Clock'], ['analytics', 'ChartBar'], ['flow', 'SitemapOutline'],
			['openproject', 'Briefcase'], ['xwiki', 'FileDocumentMultiple'],
		]

		const disagreements = pairs
			.filter(([id, icon]) => registry.has(id) && registry.get(id) !== icon)
			.map(([id, icon]) => `${id}: widget=${icon} registry=${registry.get(id)}`)

		expect(disagreements).toEqual([])
	})

	/**
	 * ⚠️ AN INTEGRATION ID IS A RUNTIME LOOKUP, SO A WRONG ONE IS A SILENT
	 * NO-OP.
	 *
	 * Each section's "open in sidebar" affordance deep-links by
	 * `integrationId`. `timetracker` named nothing at all — the registry id is
	 * `time-tracker` — so the link opened no tab and raised no error. Nothing
	 * tells that apart from a tab the user has not installed.
	 */
	it('deep-links every section at an integration that exists', () => {
		// eslint-disable-next-line
		const { builtinIntegrations } = require('../../src/integrations/builtin/index.js')
		const known = new Set(builtinIntegrations.map((entry) => entry.id))

		const ids = [
			'email', 'calendar', 'contacts', 'notes', 'tasks', 'deck', 'talk', 'forms',
			'maps', 'polls', 'bookmarks', 'collectives', 'photos', 'cospend',
			'time-tracker', 'analytics', 'flow', 'openproject', 'xwiki',
		]

		expect(ids.filter((id) => known.has(id) === false)).toEqual([])
	})
})
