import { widgetTitleOf } from '../../src/utils/widgetDispatch.js'

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A data widget titled in the manifest keeps that title when its content
 * carries an empty `title` (pipelinq review E3). The data widget's default
 * content seeds `title: ''`, and the empty string used to win, so the widget
 * fell back to its own default heading "Data".
 */
import '../../src/components/CnObjectDataWidget/dashboardRegistration.js'

describe('widgetTitleOf: data widget', () => {
	it('uses the top-level title when content has none', () => {
		expect(widgetTitleOf({ id: 'lead-deal', type: 'data', title: 'Deal', content: { columns: 2 } })).toBe('Deal')
	})

	it('uses the top-level title when content.title is empty', () => {
		expect(widgetTitleOf({ id: 'lead-deal', type: 'data', title: 'Deal', content: { title: '' } })).toBe('Deal')
		expect(widgetTitleOf({ id: 'lead-deal', type: 'data', title: 'Deal', content: { title: '   ' } })).toBe('Deal')
	})

	it('lets an edited content.title win', () => {
		expect(widgetTitleOf({ id: 'lead-deal', type: 'data', title: 'Deal', content: { title: 'Opportunity' } })).toBe('Opportunity')
	})
})
