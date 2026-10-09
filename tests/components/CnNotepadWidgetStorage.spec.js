/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A note belongs to the person who wrote it: it goes to user preferences under
 * `notepad.<dashboard>.<widget>`, never into the layout or `content.text`, and
 * a newer stored value replaces the card's text on focus.
 */
import { mount } from '@vue/test-utils'

const CnNotepadWidget = require('../../src/components/CnNotepadWidget/CnNotepadWidget.vue').default

const flush = () => Promise.resolve().then(() => Promise.resolve())

function mountWith(prefs, props = {}) {
	return mount(CnNotepadWidget, {
		propsData: { widgetId: 'n1', content: {}, ...props },
		provide: { cnUserPreferences: prefs, cnDashboardPageId: () => 'team', cnTranslate: (k) => k },
	})
}

describe('CnNotepadWidget storage', () => {
	beforeEach(() => jest.useFakeTimers())
	afterEach(() => jest.useRealTimers())

	it('keys the note by dashboard and widget', () => {
		const w = mountWith({ read: jest.fn(() => Promise.resolve(null)), write: jest.fn() })
		expect(w.vm.storageKey).toBe('notepad.team.n1')
	})

	it('lets content.dashboardId override the injected page id', () => {
		const w = mountWith({ read: jest.fn(() => Promise.resolve(null)), write: jest.fn() }, { content: { dashboardId: 'home' } })
		expect(w.vm.storageKey).toBe('notepad.home.n1')
	})

	it('never mutates content or emits a layout change while typing', async () => {
		const prefs = { read: jest.fn(() => Promise.resolve(null)), write: jest.fn(() => Promise.resolve(true)) }
		const content = { title: 'Notes' }
		const w = mountWith(prefs, { content })
		await flush()
		await w.find('textarea').setValue('secret')
		jest.advanceTimersByTime(800)
		await flush()
		expect(content).toEqual({ title: 'Notes' })
		expect(w.emitted()).not.toHaveProperty('layout-change')
		expect(w.emitted()).not.toHaveProperty('update:content')
		expect(prefs.write).toHaveBeenCalledWith('notepad.team.n1', expect.objectContaining({ text: 'secret' }))
	})

	it('shows another reader an empty card: the note is whatever THEIR preferences hold', async () => {
		const w = mountWith({ read: jest.fn(() => Promise.resolve(null)), write: jest.fn() })
		await flush()
		expect(w.find('textarea').element.value).toBe('')
	})

	it('replaces the card text with a newer stored value on focus', async () => {
		const stored = [{ text: 'old', updatedAt: 1 }, { text: 'typed in another tab', updatedAt: 99 }]
		const prefs = { read: jest.fn(() => Promise.resolve(stored.shift())), write: jest.fn() }
		const w = mountWith(prefs)
		await flush()
		expect(w.find('textarea').element.value).toBe('old')
		await w.find('textarea').trigger('focus')
		await flush()
		expect(w.find('textarea').element.value).toBe('typed in another tab')
	})

	it('does not overwrite unsaved local text with a newer stored value', async () => {
		const stored = [{ text: 'old', updatedAt: 1 }, { text: 'newer elsewhere', updatedAt: 99 }]
		const prefs = { read: jest.fn(() => Promise.resolve(stored.shift())), write: jest.fn() }
		const w = mountWith(prefs)
		await flush()
		await w.find('textarea').setValue('local edit')
		await w.find('textarea').trigger('focus')
		await flush()
		expect(w.find('textarea').element.value).toBe('local edit')
	})
})
