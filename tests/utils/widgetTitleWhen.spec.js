/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `titleWhen` resolves into a plain `title` before any reader sees the widget.
 *
 * @spec openspec/changes/widget-title-when/specs/widget-title-when/spec.md#requirement-a-widget-title-can-depend-on-the-record
 */
import { withTitlesWhen, withTitleWhen } from '../../src/utils/widgetTitleWhen.js'

const REVIEW = { field: '@context.caseType.documentReview.enabled', op: 'eq', value: true }
const FILES = { id: 'files', type: 'integration', title: 'Files', titleWhen: [{ when: REVIEW, text: 'Documents for this request' }, { text: '' }] }
const data = (enabled) => ({ id: 'c1', '@context': { caseType: { documentReview: { enabled } } } })

describe('withTitleWhen', () => {
	it('takes the first entry that holds, as a plain title without titleWhen', () => {
		const def = withTitleWhen(FILES, data(true))
		expect(def.title).toBe('Documents for this request')
		expect(def.titleWhen).toBeUndefined()
		expect(def.id).toBe('files')
	})

	it('takes an entry without when, here an empty title', () => {
		expect(withTitleWhen(FILES, data(false)).title).toBe('')
	})

	it('keeps the written title while the record is on its way, or when no entry holds', () => {
		expect(withTitleWhen(FILES, null).title).toBe('Files')
		expect(withTitleWhen({ ...FILES, titleWhen: [{ when: REVIEW, text: 'X' }] }, data(false)).title).toBe('Files')
	})

	it('hands a definition without titleWhen on unchanged', () => {
		const plain = { id: 'p', title: 'Plain' }
		expect(withTitleWhen(plain, data(true))).toBe(plain)
		const list = [plain]
		expect(withTitlesWhen(list, data(true))).toBe(list)
	})

	it('keeps the same resolved object while the title stays the same', () => {
		expect(withTitleWhen(FILES, data(true))).toBe(withTitleWhen(FILES, data(true)))
		expect(withTitleWhen(FILES, data(false))).not.toBe(withTitleWhen(FILES, data(true)))
	})

	it('resolves every definition of a list that has one', () => {
		const out = withTitlesWhen([{ id: 'p', title: 'Plain' }, FILES], data(true))
		expect(out.map((d) => d.title)).toEqual(['Plain', 'Documents for this request'])
	})
})
