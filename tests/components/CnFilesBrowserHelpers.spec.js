/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The pure half of CnFilesBrowser. A wrong path here lists the wrong folder
 * and nothing errors, which is why these are pinned without a DAV server.
 */
import {
	ACTIONS_NEEDING_THE_FILES_PAGE,
	crumbsFor,
	fileIdSearchBody,
	firstHrefIn,
	joinPath,
	userRelativePathFromHref,
} from '../../src/components/CnFilesBrowser/filesBrowser.js'

describe('CnFilesBrowser helpers', () => {
	it('turns a DAV href into the path under the user files root', () => {
		expect(userRelativePathFromHref('/remote.php/dav/files/admin/Open%20Registers/Cases/abc/', 'admin'))
			.toBe('/Open Registers/Cases/abc')
		expect(userRelativePathFromHref('/remote.php/dav/files/admin/', 'admin')).toBe('/')
		expect(userRelativePathFromHref('', 'admin')).toBe('/')
	})

	it('joins a directory and a name with exactly one slash', () => {
		expect(joinPath('/a/b', 'c')).toBe('/a/b/c')
		expect(joinPath('/a/b/', '/c')).toBe('/a/b/c')
		expect(joinPath('/', 'c')).toBe('/c')
	})

	it('names the root and every folder beneath it, and never a folder above it', () => {
		expect(crumbsFor('/Open Registers/Cases/abc', '/Open Registers/Cases/abc', 'Files'))
			.toEqual([{ name: 'Files', path: '/Open Registers/Cases/abc' }])
		expect(crumbsFor('/Open Registers/Cases/abc', '/Open Registers/Cases/abc/Scans/2026', 'Files'))
			.toEqual([
				{ name: 'Files', path: '/Open Registers/Cases/abc' },
				{ name: 'Scans', path: '/Open Registers/Cases/abc/Scans' },
				{ name: '2026', path: '/Open Registers/Cases/abc/Scans/2026' },
			])
		// A path outside the root is not a trail below it.
		expect(crumbsFor('/Open Registers/Cases/abc', '/Other', 'Files'))
			.toEqual([{ name: 'Files', path: '/Open Registers/Cases/abc' }])
	})

	it('searches by file id under the user root, with the id as digits only', () => {
		const body = fileIdSearchBody('6066', 'admin')
		expect(body).toContain('<d:href>/files/admin</d:href>')
		expect(body).toContain('<d:literal>6066</d:literal>')
		expect(fileIdSearchBody('60<66', 'admin')).toContain('<d:literal>6066</d:literal>')
	})

	it('reads the first href out of a multistatus body', () => {
		const xml = '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response><d:href>/remote.php/dav/files/admin/x/</d:href></d:response></d:multistatus>'
		expect(firstHrefIn(xml)).toBe('/remote.php/dav/files/admin/x/')
		expect(firstHrefIn('not xml at all')).toBeNull()
	})

	it('names the actions that need the Files page by their registered ids', () => {
		expect(ACTIONS_NEEDING_THE_FILES_PAGE).toEqual(expect.arrayContaining(['details', 'open-folder', 'view-in-folder', 'rename']))
		expect(ACTIONS_NEEDING_THE_FILES_PAGE).not.toContain('download')
		expect(ACTIONS_NEEDING_THE_FILES_PAGE).not.toContain('delete')
	})
})
