/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/files-preview-in-place/tasks.md#task-1
 */
import { previewKindOf, useFileOpener } from '../../src/composables/useFileOpener.js'

describe('useFileOpener', () => {
	let openSpy

	beforeEach(() => {
		openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
		delete window.OCA
	})

	afterEach(() => {
		openSpy.mockRestore()
		delete window.OCA
	})

	const pdf = { id: 5, name: 'Besluit.pdf', type: 'application/pdf', path: '/admin/files/Besluit.pdf', accessUrl: 'https://x.nl/s/abc' }
	const csv = { id: 6, name: 'data.csv', type: 'text/csv', path: '/admin/files/data.csv', accessUrl: 'https://x.nl/s/csv' }

	it('uses the Viewer first when it handles the type', () => {
		const viewerOpen = jest.fn()
		window.OCA = { Viewer: { open: viewerOpen, mimetypes: ['application/pdf', 'text/csv'] } }
		const onPreview = jest.fn()
		expect(useFileOpener({ onPreview }).open(csv)).toBe('viewer')
		expect(viewerOpen).toHaveBeenCalledWith({ path: '/admin/files/data.csv' })
		expect(onPreview).not.toHaveBeenCalled()
	})

	it('previews a data file the Viewer does not handle', () => {
		window.OCA = { Viewer: { open: jest.fn(), mimetypes: ['application/pdf'] } }
		const onPreview = jest.fn()
		expect(useFileOpener({ onPreview }).open(csv)).toBe('preview')
		expect(onPreview).toHaveBeenCalledWith(csv)
		expect(openSpy).not.toHaveBeenCalled()
	})

	it('opens a PDF in the browser when there is no Viewer (public page)', () => {
		expect(useFileOpener({ onPreview: jest.fn() }).open(pdf)).toBe('browser')
		expect(openSpy).toHaveBeenCalledWith('https://x.nl/s/abc', '_blank', 'noopener,noreferrer')
	})

	it('never opens a javascript: access URL', () => {
		const bad = { ...pdf, id: undefined, path: '', accessUrl: 'javascript:alert(1)' }
		expect(useFileOpener({ onPreview: jest.fn() }).open(bad)).toBe('none')
		expect(openSpy).not.toHaveBeenCalled()
	})

	it('falls back to the Files app permalink', () => {
		const other = { id: 9, name: 'a.docx', type: 'application/vnd.ms-word' }
		expect(useFileOpener().open(other)).toBe('files')
		expect(openSpy.mock.calls[0][0]).toContain('/f/9')
	})

	it('knows which files it can preview', () => {
		expect(previewKindOf({ name: 'a.tsv' })).toBe('tsv')
		expect(previewKindOf({ type: 'application/json' })).toBe('json')
		expect(previewKindOf({ name: 'a.pdf', type: 'application/pdf' })).toBe('')
	})
})
