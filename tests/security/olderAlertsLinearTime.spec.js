/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Text from providers, manifests and pasted markup stays linear on a hostile
 * input (CodeQL js/polynomial-redos, js/bad-tag-filter,
 * js/incomplete-multi-character-sanitization) and reads as before on a normal
 * one.
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const { toApiPath } = require('../../src/components/CnFilesBrowser/openRegisterSource.js')
const { extractSvgPath } = require('../../src/components/CnIconPicker/iconCatalogues.js')
const { stripMarker, isMarkerOnly } = require('../../src/integrations/utils/marker.js')
const { htmlToText } = require('../../src/utils/htmlToText.js')
const CnIconPicker = require('../../src/components/CnIconPicker/CnIconPicker.vue').default
const CnPageTreeRow = require('../../src/components/CnPageTreeNode/CnPageTreeRow.vue').default
const CnXwikiCard = require('../../src/integrations/builtin/xwiki/CnXwikiCard.vue').default
const CnXwikiTab = require('../../src/integrations/builtin/xwiki/CnXwikiTab.vue').default
const CnAnalyticsTab = require('../../src/integrations/builtin/analytics/CnAnalyticsTab.vue').default
const CnAnalyticsCard = require('../../src/integrations/builtin/analytics/CnAnalyticsCard.vue').default
const CnPhotosTab = require('../../src/integrations/builtin/photos/CnPhotosTab.vue').default
const CnPhotosCard = require('../../src/integrations/builtin/photos/CnPhotosCard.vue').default
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default

const N = 20000
const UUID = '3d903a5f-1111-2222-3333-444455556666'

/**
 * @param {Function} fn The work to time.
 * @return {number} Milliseconds it took.
 */
function msFor(fn) {
	const start = Date.now()
	fn()
	return Date.now() - start
}

describe('stripMarker', () => {
	it.each([
		[`Room [or:${UUID}]`, 'Room'],
		[`  [or:${UUID}]  Room  `, 'Room'],
		['a [or:x] b [or:y] c', 'a b c'],
		[`Option or:${UUID} kept`, 'Option kept'],
		['or:option-a', 'or:option-a'],
		['[or:] stays', '[or:] stays'],
		['[or:open', '[or:open'],
		['[or:]x]', '[or:]x]'],
	])('reads %j as %j', (raw, expected) => {
		expect(stripMarker(raw)).toBe(expected)
	})

	it('knows a marker-only value', () => {
		expect(isMarkerOnly(`[or:${UUID}]`)).toBe(true)
		expect(isMarkerOnly('Room')).toBe(false)
	})

	it('stays fast on a long run of spaces and open markers', () => {
		expect(msFor(() => stripMarker(' '.repeat(N * 5) + 'x'))).toBeLessThan(500)
		expect(msFor(() => stripMarker('[or:'.repeat(N)))).toBeLessThan(500)
	})
})

describe('integration titles use the shared marker strip', () => {
	it.each([
		['CnAnalyticsTab reportTitle', CnAnalyticsTab, 'reportTitle', { title: `Sales [or:${UUID}]` }],
		['CnAnalyticsTab reportSubheader', CnAnalyticsTab, 'reportSubheader', { subheader: `Sales [or:${UUID}]` }],
		['CnAnalyticsCard reportTitle', CnAnalyticsCard, 'reportTitle', { title: `Sales [or:${UUID}]` }],
		['CnPhotosTab albumName', CnPhotosTab, 'albumName', { title: `Sales [or:${UUID}]` }],
		['CnPhotosCard albumName', CnPhotosCard, 'albumName', { title: `Sales [or:${UUID}]` }],
	])('%s drops the marker', (_name, component, method, row) => {
		expect(component.methods[method].call({}, row)).toBe('Sales')
	})

	it.each([
		['CnAnalyticsTab', CnAnalyticsTab, 'reportTitle'],
		['CnAnalyticsCard', CnAnalyticsCard, 'reportTitle'],
		['CnPhotosTab', CnPhotosTab, 'albumName'],
		['CnPhotosCard', CnPhotosCard, 'albumName'],
	])('%s stays fast on a hostile title', (_name, component, method) => {
		const row = { title: '[or:'.repeat(N) + ' '.repeat(N * 5) + 'x' }
		expect(msFor(() => component.methods[method].call({}, row))).toBeLessThan(500)
	})
})

describe('htmlToText', () => {
	it.each([
		['<p>One</p><p>Two &amp; three</p>', 'One Two & three'],
		['Plain {{velocity}}x{{/velocity}}', 'Plain {{velocity}}x{{/velocity}}'],
		['a<script>alert(1)</script>b', 'a b'],
		['a<SCRIPT type="x">alert(1)</script >b', 'a b'],
		['a<style>p{}</style>b', 'a b'],
		['a<!-- note -->b', 'a b'],
		['', ''],
	])('reads %j as %j', (html, expected) => {
		expect(htmlToText(html)).toBe(expected)
	})

	it.each([
		'a<script>alert(1)</script',
		'a<script>alert(1)',
		'a<script>alert(1)</script\t\n bar>',
		'a<script><!--alert(1)--></script>',
	])('drops script text the tag patterns missed in %j', (html) => {
		expect(htmlToText(html)).toBe('a')
	})

	it('stays fast on many unclosed tags', () => {
		expect(msFor(() => htmlToText('<script'.repeat(N)))).toBeLessThan(1000)
		expect(msFor(() => htmlToText('<a '.repeat(N)))).toBeLessThan(1000)
	})

	it('backs the xwiki card preview and tab excerpt', () => {
		expect(CnXwikiCard.methods.toSafePreviewText.call({}, '<p>A</p><script>x()</script><p>B</p>')).toBe('A B')
		expect(CnXwikiTab.methods.excerpt.call({}, { content: '<p>A</p><style>p{}</style><p>B</p>' })).toBe('A B')
	})
})

describe('extractSvgPath', () => {
	it.each([
		['<svg><path d="M0 0L1 1"/></svg>', 'M0 0L1 1'],
		['<svg><path fill="x" d="M2 2"/><path d="M3 3"/></svg>', 'M2 2'],
		['<svg><path fill="x"/><PATH d="M4 4"/></svg>', 'M4 4'],
		['<svg><path id="d" /></svg>', undefined],
		['<svg><path\nd="M5 5"', 'M5 5'],
		[undefined, undefined],
	])('reads %j as %j', (svg, expected) => {
		expect(extractSvgPath(svg)).toBe(expected)
	})

	it('stays fast on many unclosed path tags', () => {
		expect(msFor(() => extractSvgPath('<path '.repeat(N)))).toBeLessThan(500)
		expect(msFor(() => extractSvgPath('<path' + ' '.repeat(N * 5)))).toBeLessThan(500)
	})
})

describe('CnIconPicker formatSVG', () => {
	/**
	 * @param {string} customSvg Pasted markup.
	 * @return {{ out: string[] }} What the picker received.
	 */
	function run(customSvg) {
		const out = []
		const ctx = {
			customSvg,
			onCustomSvgInput: (v) => out.push(v),
			prettySvg: (el) => el.nodeName.toLowerCase() + ':' + el.getAttribute('viewBox'),
		}
		CnIconPicker.methods.formatSVG.call(ctx)
		return { out }
	}

	it('formats the first svg element in pasted text', () => {
		expect(run('junk <SVG viewBox="0 0 24 24"><path d="M0 0"/></SVG> <svg></svg>').out).toEqual(['svg:0 0 24 24'])
	})

	it('leaves text without a closed svg alone', () => {
		expect(run('<svg viewBox="0 0 1 1">').out).toEqual([])
	})

	it('stays fast on many unclosed svg tags', () => {
		expect(msFor(() => run('<svg'.repeat(N)))).toBeLessThan(500)
	})
})

describe('CnPageTreeRow commitSlug', () => {
	/**
	 * @param {string} slugDraft The typed slug.
	 * @return {Array} The emitted renames.
	 */
	function commit(slugDraft) {
		const emitted = []
		const ctx = { slugDraft, page: { id: 'home' }, $emit: (name, value) => emitted.push([name, value]) }
		CnPageTreeRow.methods.commitSlug.call(ctx)
		return emitted
	}

	it.each([
		['  My Page! ', 'my-page'],
		['--a--b--', 'a--b'],
		['a', 'a'],
	])('slugs %j as %j', (draft, expected) => {
		expect(commit(draft)).toEqual([['rename', expected]])
	})

	it('emits nothing for a slug of only dashes', () => {
		expect(commit('---')).toEqual([])
	})

	it('stays fast on a long run of dashes', () => {
		expect(msFor(() => commit('-'.repeat(N * 5) + 'x'))).toBeLessThan(500)
	})
})

describe('toApiPath', () => {
	it.each([
		['/a/b/', 'a/b'],
		['//a//', 'a'],
		['/', ''],
		[undefined, ''],
	])('reads %j as %j', (path, expected) => {
		expect(toApiPath(path)).toBe(expected)
	})

	it('stays fast on a long run of slashes', () => {
		expect(msFor(() => toApiPath('/'.repeat(N * 5) + 'x'))).toBeLessThan(500)
	})
})

describe('CnWalkthrough target escaping without CSS.escape', () => {
	const savedCss = window.CSS

	afterEach(() => {
		window.CSS = savedCss
		document.body.innerHTML = ''
	})

	it.each(['a"b', 'ends\\', 'mid\\"q'])('finds the element whose walkthrough id is %j', (ref) => {
		window.CSS = undefined
		const el = document.createElement('div')
		el.setAttribute('data-walkthrough-id', ref)
		document.body.appendChild(el)
		expect(CnWalkthrough.methods.resolveTarget.call({}, { target: { ref } })).toBe(el)
	})
})
