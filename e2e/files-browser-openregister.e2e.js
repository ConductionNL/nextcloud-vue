// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The files tab on an OpenRegister object, in a real browser, reading the
// object's folder through OpenRegister's files API (no WebDAV).
//
// Two modes:
//
//  - MOCKED (default, CI): this spec answers /apps/openregister/api/... itself,
//    as the server would for a reader, an updater and a person the case refuses.
//  - LIVE: set LIVE_OR_URL (e.g. http://127.0.0.1:8098) plus LIVE_OR_REGISTER,
//    LIVE_OR_SCHEMA, LIVE_OR_OBJECT, LIVE_OR_TITLE, LIVE_OR_READER and
//    LIVE_OR_OUTSIDER (`user:password` each). Every OpenRegister request is then
//    forwarded to that instance, signed in as the chosen user, so the access
//    decision is the real server's.
//
// @spec openspec/changes/files-browser-openregister-source/specs/files-browser/spec.md#requirement-the-files-browser-can-read-an-openregister-objects-folder-through-openregister
// @spec openspec/changes/files-browser-openregister-source/specs/files-browser/spec.md#requirement-the-files-tab-reads-an-objects-folder-through-openregister-by-default

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

const LIVE = process.env.LIVE_OR_URL || ''
const REGISTER = process.env.LIVE_OR_REGISTER || '20'
const SCHEMA = process.env.LIVE_OR_SCHEMA || '35'
const OBJECT = process.env.LIVE_OR_OBJECT || '6c3a711f-c480-467b-a25f-d6a9c888384d'
const TITLE = process.env.LIVE_OR_TITLE || 'Termijn eindigt vandaag'

const ROOT = [
	{ id: 101, name: 'besluit.txt', type: 'file', mimetype: 'text/plain', size: 7, mtime: 1760000000, path: 'besluit.txt' },
	{ id: 200, name: 'Bijlagen', type: 'folder', mimetype: 'httpd/unix-directory', size: 9, mtime: 1760000001, path: 'Bijlagen' },
]
const SUB = [
	{ id: 201, name: 'brief.txt', type: 'file', mimetype: 'text/plain', size: 9, mtime: 1760000002, path: 'Bijlagen/brief.txt' },
]

/**
 * Answer OpenRegister's API the way the server does for one kind of person.
 *
 * @param {'reader'|'updater'|'refused'} who The person.
 * @param {Array<string>} seen Every request, as `METHOD path`.
 * @return {Function} The route handler.
 */
function mockServer(who, seen) {
	return async (route) => {
		const request = route.request()
		const url = new URL(request.url())
		seen.push(`${request.method()} ${url.pathname}`)
		const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
		if (who === 'refused') {
			return json(404, { error: 'Object not found' })
		}
		if (url.pathname.endsWith('/folder') && request.method() === 'GET') {
			const path = url.searchParams.get('path') || ''
			return json(200, path === 'Bijlagen'
				? { path, folderId: 200, canChange: who === 'updater', entries: SUB }
				: { path: '', folderId: 100, canChange: who === 'updater', entries: ROOT })
		}
		if (url.pathname.endsWith('/folder') && request.method() === 'POST') {
			return json(201, { id: 300, name: 'Stukken', type: 'folder', path: 'Stukken' })
		}
		if (url.pathname.endsWith(`/${OBJECT}`)) {
			return json(200, { title: TITLE, '@self': { id: OBJECT } })
		}
		return json(200, { results: [], total: 0 })
	}
}

/**
 * Forward OpenRegister's API to a live instance as one user.
 *
 * @param {string} credentials `user:password`.
 * @param {Array<string>} seen Every request, as `METHOD path`.
 * @return {Function} The route handler.
 */
function liveServer(credentials, seen) {
	return async (route) => {
		const request = route.request()
		const url = new URL(request.url())
		seen.push(`${request.method()} ${url.pathname}`)
		const path = url.pathname.startsWith('/index.php') ? url.pathname : `/index.php${url.pathname}`
		const response = await route.fetch({
			url: `${LIVE.replace(/\/+$/, '')}${path}${url.search}`,
			headers: {
				...request.headers(),
				authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
				'ocs-apirequest': 'true',
				cookie: '',
			},
		})
		await route.fulfill({ response })
	}
}

/**
 * Open the files tab harness with OpenRegister answered by `handler`.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {Function} handler The route handler.
 * @return {Promise<void>}
 */
async function openTab(page, handler) {
	await page.route('**/apps/openregister/api/**', handler)
	await page.goto(`/?filestabor=1&register=${REGISTER}&schema=${SCHEMA}&object=${OBJECT}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
}

const rowNames = (page) => page.getByTestId('cn-files-browser-row').evaluateAll((rows) => rows.map((row) => row.dataset.name))

test.describe('the files tab on an OpenRegister object (mocked server)', () => {
	test.skip(LIVE !== '', 'live mode runs the live describe instead')

	test('a reader browses the case folder and its subfolder, and is offered no change', async ({ page }) => {
		const seen = []
		await openTab(page, mockServer('reader', seen))
		await expect(page.getByTestId('cn-files-browser')).toBeVisible({ timeout: 60_000 })
		await expect.poll(() => rowNames(page)).toEqual(['Bijlagen', 'besluit.txt'])
		await expect(page.getByTestId('cn-files-browser-crumb').first()).toContainText(TITLE)
		await expect(page.getByTestId('cn-files-browser-new')).toHaveCount(0)
		await expect(page.getByTestId('cn-files-browser-upload-button')).toHaveCount(0)
		await expect(page.getByTestId('cn-files-browser-drop-hint')).toHaveCount(0)

		await page.getByTestId('cn-files-browser-row').filter({ hasText: 'Bijlagen' }).click()
		await expect.poll(() => rowNames(page)).toEqual(['brief.txt'])
		await expect(page.getByTestId('cn-files-browser-crumb')).toHaveCount(2)
		expect(seen.some((line) => line.includes('remote.php'))).toBe(false)
	})

	test('an updater is offered the add button, the New menu and the drop hint', async ({ page }) => {
		const seen = []
		await openTab(page, mockServer('updater', seen))
		await expect(page.getByTestId('cn-files-browser-upload-button')).toBeVisible({ timeout: 60_000 })
		await expect(page.getByTestId('cn-files-browser-drop-hint')).toBeVisible()
		await expect(page.getByTestId('cn-files-browser-new')).toHaveCount(1)
		expect(seen.some((line) => line.includes('remote.php'))).toBe(false)
	})

	test('a person the case refuses sees no files browser and no files', async ({ page }) => {
		const seen = []
		await openTab(page, mockServer('refused', seen))
		await expect.poll(() => seen.some((line) => line.endsWith('/folder'))).toBe(true)
		await page.waitForTimeout(500)
		await expect(page.getByTestId('cn-files-browser')).toHaveCount(0)
		await expect(page.getByTestId('cn-files-browser-row')).toHaveCount(0)
	})
})

test.describe('the files tab on an OpenRegister object (live instance)', () => {
	test.skip(LIVE === '', 'set LIVE_OR_URL and the LIVE_OR_* values to run against an instance')

	test('the reader sees the case files through OpenRegister', async ({ page }) => {
		const seen = []
		await openTab(page, liveServer(process.env.LIVE_OR_READER || '', seen))
		await expect(page.getByTestId('cn-files-browser')).toBeVisible({ timeout: 60_000 })
		await expect.poll(() => rowNames(page)).toEqual(['Bijlagen', 'besluit.txt'])
		await expect(page.getByTestId('cn-files-browser-crumb').first()).toContainText(TITLE)
		await page.getByTestId('cn-files-browser-row').filter({ hasText: 'Bijlagen' }).click()
		await expect.poll(() => rowNames(page)).toEqual(['brief.txt'])
		await page.screenshot({ path: process.env.LIVE_OR_SHOT_READER || 'test-results/live-or-reader.png' })
	})

	test('a person who may not read the case sees no files', async ({ page }) => {
		const seen = []
		await openTab(page, liveServer(process.env.LIVE_OR_OUTSIDER || '', seen))
		await expect.poll(() => seen.some((line) => line.endsWith('/folder'))).toBe(true)
		await page.waitForTimeout(1000)
		await expect(page.getByTestId('cn-files-browser')).toHaveCount(0)
		await expect(page.getByTestId('cn-files-browser-row')).toHaveCount(0)
		await expect(page.getByText('besluit.txt')).toHaveCount(0)
		await page.screenshot({ path: process.env.LIVE_OR_SHOT_OUTSIDER || 'test-results/live-or-outsider.png' })
	})
})
