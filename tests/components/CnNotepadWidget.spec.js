/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNotepadWidget: typed in place in view mode, saved after the reader stops
 * typing and on blur, with Saved / not-saved messages and rendered markdown.
 * Registered as a user-addable `notepad` widget type.
 */
import { mount } from '@vue/test-utils'

const CnNotepadWidget = require('../../src/components/CnNotepadWidget/CnNotepadWidget.vue').default
const { getWidgetTypeEntry, listUserAddableWidgetTypes } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
require('../../src/components/CnNotepadWidget/index.js')

function fakePrefs(initial = null, { fail = false } = {}) {
	return {
		read: jest.fn(() => Promise.resolve(initial)),
		write: jest.fn(() => Promise.resolve(!fail)),
	}
}

function mountNotepad(prefs, content = {}) {
	return mount(CnNotepadWidget, {
		propsData: { widgetId: 'w1', content },
		provide: { cnUserPreferences: prefs, cnDashboardPageId: () => 'start', cnTranslate: (k) => k },
	})
}

const flush = () => Promise.resolve().then(() => Promise.resolve())

describe('CnNotepadWidget', () => {
	beforeEach(() => jest.useFakeTimers())
	afterEach(() => jest.useRealTimers())

	it('registers as a user-addable notepad type', () => {
		expect(getWidgetTypeEntry('notepad').userAddable).toBe(true)
		expect(listUserAddableWidgetTypes()).toContain('notepad')
	})

	it('saves 800 ms after the last keystroke and says Saved', async () => {
		const prefs = fakePrefs()
		const w = mountNotepad(prefs)
		await flush()
		const ta = w.find('[data-testid="cn-notepad-textarea"]')
		await ta.setValue('Terugbellen mevrouw Jansen')
		jest.advanceTimersByTime(799)
		expect(prefs.write).not.toHaveBeenCalled()
		jest.advanceTimersByTime(1)
		await flush()
		expect(prefs.write).toHaveBeenCalledTimes(1)
		expect(prefs.write.mock.calls[0][0]).toBe('notepad.start.w1')
		expect(prefs.write.mock.calls[0][1].text).toBe('Terugbellen mevrouw Jansen')
		await flush()
		expect(w.find('[data-testid="cn-notepad-status"]').text()).toBe('Saved')
	})

	it('saves at once on blur', async () => {
		const prefs = fakePrefs()
		const w = mountNotepad(prefs)
		await flush()
		const ta = w.find('[data-testid="cn-notepad-textarea"]')
		await ta.setValue('Offerte nakijken')
		await ta.trigger('blur')
		await flush()
		expect(prefs.write).toHaveBeenCalledTimes(1)
	})

	it('keeps the text and says it was not saved when the write fails', async () => {
		const prefs = fakePrefs(null, { fail: true })
		const w = mountNotepad(prefs)
		await flush()
		const ta = w.find('[data-testid="cn-notepad-textarea"]')
		await ta.setValue('Belangrijk')
		jest.advanceTimersByTime(800)
		await flush()
		await flush()
		expect(ta.element.value).toBe('Belangrijk')
		expect(w.find('[data-testid="cn-notepad-status"]').text()).toContain('Not saved')
	})

	it('loads the stored note and renders its markdown when not focused', async () => {
		const w = mountNotepad(fakePrefs({ text: '- one\n- two', updatedAt: 5 }))
		await flush()
		await w.vm.$nextTick()
		const rendered = w.find('[data-testid="cn-notepad-rendered"]')
		expect(rendered.exists()).toBe(true)
		expect(rendered.findAll('li').length).toBe(2)
	})

	it('labels the textarea with the card title', async () => {
		const w = mountNotepad(fakePrefs(), { title: 'My notes' })
		await flush()
		expect(w.find('[data-testid="cn-notepad-textarea"]').attributes('aria-label')).toBe('My notes')
	})

	it('has a polite live region for the status', async () => {
		const w = mountNotepad(fakePrefs())
		await flush()
		expect(w.find('[data-testid="cn-notepad-status"]').attributes('aria-live')).toBe('polite')
	})
})
