/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * facts-tiles: `layout: "tiles"` draws each fact as a tile, a small caps label
 * above its value, the tiles side by side and wrapping (board PqJourney: the
 * steps Trigger, Wachten, Voorwaarde, Actie). Without the key the rows stay
 * as they were.
 *
 * @spec openspec/changes/facts-tiles/specs/facts-widget/spec.md#requirement-facts-can-be-drawn-as-tiles
 */
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

const JOURNEY = {
	id: 'j-1',
	trigger: { kind: 'addressChanged', label: 'Een inwoner geeft een nieuw adres door' },
	waitFor: '3 dagen',
	action: { kind: 'sendMailing' },
}

const FIELDS = [
	{ path: 'trigger.label', label: 'Trigger' },
	{ path: 'waitFor', label: 'Wait' },
	{ path: 'condition.field', label: 'Condition' },
	{ path: 'action.kind', label: 'Action', map: { sendMailing: 'Send a mailing' } },
]

/**
 * @param {object} content Widget content.
 * @return {object} Wrapper.
 */
function mountFacts(content) {
	return mount(CnFactsWidget, {
		props: { objectData: JOURNEY, content },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcLoadingIcon: true } },
	})
}

describe('CnFactsWidget: tiles', () => {
	it('draws the facts as tiles with layout: tiles', () => {
		const dl = mountFacts({ layout: 'tiles', fields: FIELDS }).find('dl')
		expect(dl.classes()).toContain('cn-facts-widget__rows--tiles')
		expect(dl.classes()).not.toContain('cn-facts-widget__rows--columns')
	})

	it('keeps label and value in each tile, and leaves an empty fact out', () => {
		const w = mountFacts({ layout: 'tiles', fields: FIELDS })
		expect(w.findAll('.cn-facts-widget__row')).toHaveLength(3)
		expect(w.find('[data-testid="cn-fact-trigger-label"] dt').text()).toBe('Trigger')
		expect(w.find('[data-testid="cn-fact-action-kind"] dd').text()).toBe('Send a mailing')
	})

	it('leaves the rows as they were without the key', () => {
		expect(mountFacts({ fields: FIELDS }).find('dl').classes()).not.toContain('cn-facts-widget__rows--tiles')
	})

	it('draws a tile as a bordered box with a small caps label above the value', () => {
		const source = readFileSync(resolve(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8')
		const css = source.slice(source.indexOf('<style'))
		expect(css).toMatch(/\.cn-facts-widget__rows--tiles \.cn-facts-widget__row \{[^}]*border: 1px solid/)
		expect(css).toMatch(/\.cn-facts-widget__rows--tiles \.cn-facts-widget__label\.cn-facts-widget__label \{[^}]*text-transform: uppercase/)
	})
})
