/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for the notepad dashboard widget: the textarea is
 * labelled by the card title, and Saved is announced politely.
 */

const CnNotepadWidget = require('../../src/components/CnNotepadWidget/CnNotepadWidget.vue').default
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

const provide = {
	cnUserPreferences: { read: () => Promise.resolve(null), write: () => Promise.resolve(true) },
	cnDashboardPageId: () => 'start',
	cnTranslate: (key) => key,
}

describe('CnNotepadWidget: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations while empty', async () => {
		wrapper = mountAttached(CnNotepadWidget, { propsData: { widgetId: 'n', content: { title: 'My notes' } }, provide })
		await expectAccessible(wrapper)
	})

	it('labels the textarea with the card title and announces status politely', () => {
		wrapper = mountAttached(CnNotepadWidget, { propsData: { widgetId: 'n', content: { title: 'My notes' } }, provide })
		expect(wrapper.element.querySelector('textarea').getAttribute('aria-label')).toBe('My notes')
		const status = wrapper.element.querySelector('[role="status"]')
		expect(status.getAttribute('aria-live')).toBe('polite')
	})
})
