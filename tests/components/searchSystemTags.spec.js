/**
 * Tests for the tolerant `/systemtags/` PROPFIND parser.
 *
 * `parseSystemTags` was factored out of `searchSystemTags` so the multistatus
 * parsing can be exercised without a network call. The core fix it embodies is
 * that an instance with *zero* system tags returns only the collection root as
 * a single `<d:response>` whose tag-specific props come back `404` — upstream
 * crashed on that shape; this parser must yield `[]`.
 *
 * Covers:
 * - zero tags (lone 404 collection root) → []
 * - one tag, many tags → parsed objects
 * - non-200 propstats and id-less responses skipped
 * - namespace-prefix independence (the parser walks by namespace URI)
 * - non-string / empty input → []
 * - searchSystemTags wiring (PROPFIND request + delegation to parseSystemTags)
 */

const { parseSystemTags } = require('../../src/components/NcSelectTags/searchSystemTags.js')

const DAV = 'xmlns:d="DAV:"'
const OC = 'xmlns:oc="http://owncloud.org/ns"'

/** A 404 collection-root response — what an instance with no tags returns. */
const collectionRoot = `
	<d:response>
		<d:href>/remote.php/dav/systemtags/</d:href>
		<d:propstat>
			<d:prop>
				<oc:id/>
				<oc:display-name/>
				<oc:user-visible/>
				<oc:user-assignable/>
				<oc:can-assign/>
			</d:prop>
			<d:status>HTTP/1.1 404 Not Found</d:status>
		</d:propstat>
	</d:response>`

/**
 * A 200 tag response.
 *
 * @param {object} tag The tag values to render into the response body.
 * @return {string} The `<d:response>` XML fragment.
 */
function tagResponse({ id, displayName, canAssign = true, userAssignable = true, userVisible = true }) {
	return `
	<d:response>
		<d:href>/remote.php/dav/systemtags/${id}</d:href>
		<d:propstat>
			<d:prop>
				<oc:id>${id}</oc:id>
				<oc:display-name>${displayName}</oc:display-name>
				<oc:user-visible>${userVisible}</oc:user-visible>
				<oc:user-assignable>${userAssignable}</oc:user-assignable>
				<oc:can-assign>${canAssign}</oc:can-assign>
			</d:prop>
			<d:status>HTTP/1.1 200 OK</d:status>
		</d:propstat>
	</d:response>`
}

/**
 * Wrap response fragments in a multistatus document.
 *
 * @param {string} body The concatenated `<d:response>` fragments.
 * @return {string} The full multistatus XML body.
 */
function multistatus(body) {
	return `<?xml version="1.0"?>\n<d:multistatus ${DAV} ${OC}>${body}</d:multistatus>`
}

describe('parseSystemTags', () => {
	it('returns [] for an instance with zero tags (lone 404 collection root)', () => {
		// This is the exact shape upstream crashed on: a single <d:response>.
		expect(parseSystemTags(multistatus(collectionRoot))).toEqual([])
	})

	it('parses a single tag (alongside the 404 collection root)', () => {
		const xml = multistatus(collectionRoot + tagResponse({ id: 3, displayName: 'Urgent' }))
		expect(parseSystemTags(xml)).toEqual([
			{
				id: 3,
				displayName: 'Urgent',
				canAssign: true,
				userAssignable: true,
				userVisible: true,
			},
		])
	})

	it('parses many tags in document order', () => {
		const xml = multistatus(
			collectionRoot
			+ tagResponse({ id: 1, displayName: 'Alpha', userVisible: true })
			+ tagResponse({ id: 2, displayName: 'Beta', canAssign: false })
			+ tagResponse({ id: 3, displayName: 'Gamma', userAssignable: false, userVisible: false }),
		)
		expect(parseSystemTags(xml)).toEqual([
			{ id: 1, displayName: 'Alpha', canAssign: true, userAssignable: true, userVisible: true },
			{ id: 2, displayName: 'Beta', canAssign: false, userAssignable: true, userVisible: true },
			{ id: 3, displayName: 'Gamma', canAssign: true, userAssignable: false, userVisible: false },
		])
	})

	it('coerces the boolean flags from their string form', () => {
		const xml = multistatus(tagResponse({
			id: 7, displayName: 'Mixed', canAssign: false, userAssignable: true, userVisible: false,
		}))
		const [tag] = parseSystemTags(xml)
		expect(tag.canAssign).toBe(false)
		expect(tag.userAssignable).toBe(true)
		expect(tag.userVisible).toBe(false)
	})

	it('skips non-200 propstats (e.g. a 403 response)', () => {
		const forbidden = `
			<d:response>
				<d:href>/remote.php/dav/systemtags/9</d:href>
				<d:propstat>
					<d:prop><oc:id>9</oc:id><oc:display-name>Secret</oc:display-name></d:prop>
					<d:status>HTTP/1.1 403 Forbidden</d:status>
				</d:propstat>
			</d:response>`
		const xml = multistatus(forbidden + tagResponse({ id: 4, displayName: 'Visible' }))
		expect(parseSystemTags(xml)).toEqual([
			{ id: 4, displayName: 'Visible', canAssign: true, userAssignable: true, userVisible: true },
		])
	})

	it('skips a 200 response that carries no id', () => {
		const noId = `
			<d:response>
				<d:propstat>
					<d:prop><oc:display-name>Nameless</oc:display-name></d:prop>
					<d:status>HTTP/1.1 200 OK</d:status>
				</d:propstat>
			</d:response>`
		expect(parseSystemTags(multistatus(noId))).toEqual([])
	})

	it('is independent of the namespace prefix used in the response', () => {
		// Same document, arbitrary prefixes (x:/y: instead of d:/oc:).
		const xml = `<?xml version="1.0"?>
			<x:multistatus xmlns:x="DAV:" xmlns:y="http://owncloud.org/ns">
				<x:response>
					<x:propstat>
						<x:prop>
							<y:id>5</y:id>
							<y:display-name>Prefixed</y:display-name>
							<y:can-assign>true</y:can-assign>
							<y:user-assignable>true</y:user-assignable>
							<y:user-visible>true</y:user-visible>
						</x:prop>
						<x:status>HTTP/1.1 200 OK</x:status>
					</x:propstat>
				</x:response>
			</x:multistatus>`
		expect(parseSystemTags(xml)).toEqual([
			{ id: 5, displayName: 'Prefixed', canAssign: true, userAssignable: true, userVisible: true },
		])
	})

	it.each([
		['empty string', ''],
		['null', null],
		['undefined', undefined],
		['a number', 42],
		['an object', {}],
	])('returns [] for non-string / empty input (%s)', (_label, input) => {
		expect(parseSystemTags(input)).toEqual([])
	})
})

describe('searchSystemTags', () => {
	beforeEach(() => {
		jest.resetModules()
	})

	it('issues a PROPFIND to the systemtags endpoint and parses the body', async () => {
		const axios = jest.fn().mockResolvedValue({ data: multistatus(collectionRoot + tagResponse({ id: 8, displayName: 'Fetched' })) })
		jest.doMock('@nextcloud/axios', () => ({ __esModule: true, default: axios }))
		jest.doMock('@nextcloud/router', () => ({
			generateRemoteUrl: jest.fn((path) => `/remote.php/${path}`),
		}))

		const { searchSystemTags } = require('../../src/components/NcSelectTags/searchSystemTags.js')
		const tags = await searchSystemTags()

		expect(axios).toHaveBeenCalledWith(expect.objectContaining({
			method: 'PROPFIND',
			url: '/remote.php/dav/systemtags/',
		}))
		expect(tags).toEqual([
			{ id: 8, displayName: 'Fetched', canAssign: true, userAssignable: true, userVisible: true },
		])
	})

	it('returns [] (does not throw) for a tag-less instance', async () => {
		const axios = jest.fn().mockResolvedValue({ data: multistatus(collectionRoot) })
		jest.doMock('@nextcloud/axios', () => ({ __esModule: true, default: axios }))
		jest.doMock('@nextcloud/router', () => ({
			generateRemoteUrl: jest.fn(() => '/remote.php/dav'),
		}))

		const { searchSystemTags } = require('../../src/components/NcSelectTags/searchSystemTags.js')
		await expect(searchSystemTags()).resolves.toEqual([])
	})
})
