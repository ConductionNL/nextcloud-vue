/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak: the notes card shows the widget's subtitle under its title.
 *
 * @spec openspec/changes/notes-card-subtitle/specs/integration-cards/spec.md#requirement-an-integration-card-shows-the-widgets-subtitle
 */
import { mount } from '@vue/test-utils'
import CnDetailCard from '../../src/components/CnDetailCard/CnDetailCard.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { LIB_INTEGRATION_COMPONENTS } from '../../src/integrations/libComponents.js'

describe('notes card subtitle', () => {
	it('CnDetailCard draws a subtitle under the title, and none without one', () => {
		const withLine = mount(CnDetailCard, { props: { title: 'Notities', subtitle: 'Alleen voor wie aan de taak werkt' } })
		const line = withLine.find('[data-testid="cn-detail-card-subtitle"]')
		expect(line.exists()).toBe(true)
		expect(line.text()).toBe('Alleen voor wie aan de taak werkt')
		expect(withLine.find('.cn-detail-card__title').text()).toBe('Notities')
		const bare = mount(CnDetailCard, { props: { title: 'Notities' } })
		expect(bare.find('[data-testid="cn-detail-card-subtitle"]').exists()).toBe(false)
	})

	it('the notes adapter hands the subtitle to the card', () => {
		const adapter = LIB_INTEGRATION_COMPONENTS.notes.widget
		const w = mount(adapter, {
			props: { subtitle: 'Alleen voor wie aan de taak werkt', register: 'dossiq', schema: 'case', objectId: 'c1' },
			global: { stubs: { CnNotesCard: { name: 'CnNotesCard', props: ['subtitle'], template: '<div class="notes" :data-subtitle="subtitle" />' } } },
		})
		expect(w.find('.notes').attributes('data-subtitle')).toBe('Alleen voor wie aan de taak werkt')
	})

	it('the host passes the widget subtitle, translated, to an integration', () => {
		const w = mount(CnDetailWidgetHost, {
			props: {
				widget: { id: 'task-notes', type: 'integration', integrationId: 'notes', title: 'Notes', subtitle: 'Only for those working on the task' },
				chrome: 'card',
				surface: 'detail-page',
				objectId: 't1',
			},
			global: {
				provide: { cnTranslate: (key) => (key === 'Only for those working on the task' ? 'Alleen voor wie aan de taak werkt' : key) },
				stubs: { CnIcon: true, CnNotesCard: true },
			},
		})
		expect(w.vm.integrationProps.subtitle).toBe('Alleen voor wie aan de taak werkt')
	})
})
