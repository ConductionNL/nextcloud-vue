/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A side panel card draws the note its widget reports ("4 van 5 aanwezig").
 *
 * @spec openspec/changes/side-panel-header-note/specs/side-panel-header-note/spec.md#requirement-a-side-panel-card-shows-the-note-its-widget-reports
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnIndexPageWidgets from '../../src/components/CnIndexPage/CnIndexPageWidgets.vue'

const Reporter = {
	name: 'Reporter',
	props: { content: { type: Object, default: () => ({}) } },
	emits: ['header'],
	mounted() {
		if (this.content.note) {
			this.$emit('header', { note: this.content.note, link: null })
		}
	},
	template: '<p>rows</p>',
}

describe('CnIndexPageWidgets header note', () => {
	it('draws the reported note in the card header, and none without one', async () => {
		const w = mount(CnIndexPageWidgets, {
			props: {
				variant: 'side-panel',
				widgets: [
					{ id: 'team', type: 'reporter', title: 'Team vandaag', content: { note: '4 van 5 aanwezig' } },
					{ id: 'types', type: 'reporter', title: 'Werkvoorraad', content: {} },
				],
			},
			global: { provide: { cnRegistry: { reporter: Reporter } } },
		})
		await nextTick()
		const notes = w.findAll('[data-testid="cn-index-page-widget-note"]')
		expect(notes).toHaveLength(1)
		expect(w.find('[data-testid="cn-index-page-widget-team"]').text()).toContain('4 van 5 aanwezig')
	})
})
