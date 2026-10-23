/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Headings inside a widget (group, section and role labels) were fixed h4.
 * In the board look they follow the outline: one level under the card that
 * holds them. Outside the board look, or with no card or page giving a level,
 * they stay h4. They carry `cn-inner-heading`, which holds the h4 size.
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import { defineComponent, h, provide } from 'vue'
import innerHeading from '../../src/mixins/innerHeading.js'
import { HEADING_LEVEL } from '../../src/utils/headingLevel.js'

const Probe = defineComponent({
	name: 'Probe',
	mixins: [innerHeading],
	template: '<component :is="innerHeadingTag" class="probe cn-inner-heading">Groep</component>',
})

function under(level, look) {
	return mount(defineComponent({
		setup() {
			if (level !== undefined) {
				provide(HEADING_LEVEL, level)
			}
			provide('cnLook', look)
			return () => h(Probe)
		},
	}))
}

describe('innerHeading mixin', () => {
	it('is h3 under an h2 card in the board look', () => {
		expect(under(3, 'board').find('.probe').element.tagName).toBe('H3')
	})

	it('follows a level given as a function', () => {
		expect(under(() => 4, 'board').find('.probe').element.tagName).toBe('H4')
	})

	it('stays h4 in the Nextcloud look', () => {
		expect(under(3, 'nextcloud').find('.probe').element.tagName).toBe('H4')
	})

	it('stays h4 when nothing gives a level', () => {
		expect(under(undefined, 'board').find('.probe').element.tagName).toBe('H4')
	})
})

const WIDGETS = [
	'CnObjectListWidget/CnObjectListWidget',
	'CnObjectPartiesWidget/CnObjectPartiesWidget',
	'CnStatsPanel/CnStatsPanel',
	'CnRetentionWidget/CnRetentionWidget',
	'CnNotificationPreferences/CnNotificationPreferences',
	'CnSchemaRulesWidget/CnSchemaRulesWidget',
	'CnGroupedCardsWidget/CnGroupedCardsWidget',
	'CnAttentionFlagWidget/CnAttentionFlagWidget',
	'CnObjectMetadataWidget/CnObjectMetadataWidget',
	'CnAiFeaturesWidget/CnAiFeaturesWidget',
	'CnStatsBlock/CnStatsBlock',
	'CnStructuredDocReview/CnStructuredDocReview',
	'CnContainerWidget/CnContainerWidget',
	'CnRelatedObjectsWidget/CnRelatedObjectsWidget',
	'CnReadinessChecklist/CnReadinessChecklist',
	'CnTasksWidget/CnTaskWorkCard',
]

describe('widgets with inner headings', () => {
	it.each(WIDGETS)('%s draws no fixed h4 and uses the mixin', (name) => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', `${name}.vue`), 'utf8')
		const template = source.slice(0, source.indexOf('<script'))
		expect(template).not.toMatch(/<h4[\s>]/)
		expect(template).toContain(':is="innerHeadingTag"')
		expect(source).toMatch(/mixins:\s*\[[^\]]*innerHeading/)
	})

	it('holds the h4 size for a heading drawn as another level, below any class of its own', () => {
		const css = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'css', 'look-board.css'), 'utf8')
		expect(css).toMatch(/html :where\(\.cn-look-board\) :is\(h2, h3, h5, h6\):where\(\.cn-inner-heading\) \{\s*font-size: 1\.4em;/)
	})
})
