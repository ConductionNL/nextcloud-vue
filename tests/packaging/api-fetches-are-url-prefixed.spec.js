/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every app-relative API request must be built through a URL helper.
 *
 * Nextcloud can be served with or without pretty URLs. WITHOUT them (no
 * `htaccess.RewriteBase`, no mod_rewrite) the bare `/apps/<app>/api/...` form
 * is not routed at all and answers **404** — the request never reaches the
 * app. WITH them both forms work, so the bug is invisible on any developer
 * machine that has mod_rewrite on.
 *
 * That is exactly how it shipped: a portal detail page rendering
 * `CnObjectSidebar` in registry mode fired 28 requests to
 * `/apps/openregister/api/objects/<register>/<schema>/<id>/{files,notes,tags,
 * tasks,events,…}` with no prefix. The object fetch itself went through
 * `generateUrl()` and worked; every sidebar tab and integration leaf next to
 * it hand-built its URL from an `apiBase` prop and 404'd (WOO-560).
 *
 * The fix is one rule, and this test is that rule: the URL argument of a
 * `fetch()` / `axios.<verb>()` call is wrapped in a URL helper —
 * `prefixUrl()` (this library's own, applied at the call site or inside
 * `cnFetch`), or `generateUrl()` / `generateOcsUrl()` from
 * `@nextcloud/router`. The check resolves ONE level of indirection, so the
 * two shapes the codebase actually uses both pass:
 *
 *     await fetch(prefixUrl(`${this.apiBase}/…`), { headers: buildHeaders() })
 *     const url = generateUrl('/apps/x/api/y'); await axios.get(url)
 *
 * Anything it cannot see through has to be listed in {@link ALLOWED} with a
 * reason, which keeps the escape hatch auditable instead of silent.
 */

/* eslint-disable no-template-curly-in-string -- the ALLOWED keys below are
 * VERBATIM source text, matched character-for-character against the URL
 * argument the scanner extracts. A `${…}` inside one is the thing being
 * matched, not a template literal that forgot its backticks. */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')

/** URL helpers that make a path prefix-correct. */
const URL_HELPERS = [
	'prefixUrl',
	'generateUrl',
	'generateOcsUrl',
	'generateRemoteUrl',
	'cnFetch',
	'cnFetchJson',
	'linkTo',
	'imagePath',
	'getRegisterApiUrl',
	'getSchemaApiUrl',
	// Every builder in `src/composables/aiChatConfig.js` composes
	// `chatApiBase()`, which returns an `/index.php`-rooted path.
	'chatApiBase',
	'chatStreamUrl',
	'chatSendUrl',
	'chatHealthUrl',
	'attachmentsUrl',
	'conversationsUrl',
	'conversationMessagesUrl',
	'conversationUrl',
	'agentsUrl',
	'speechTranscriptionsUrl',
	'speechSynthesisUrl',
	'speechCapabilitiesUrl',
	// Module-local builders that wrap `generateUrl()` themselves.
	'objectsUrl',
]

/**
 * Call sites this check cannot see through, each with the reason it is safe.
 *
 * Keyed `<relative path>:<first-argument source>` so moving a call does not
 * silently re-arm the exemption on a DIFFERENT expression — only the same
 * expression in the same file stays exempt.
 */
const ALLOWED = new Map([
	// ── OCS entry points are real files on disk (`/ocs/v2.php`), reachable
	//    without mod_rewrite. Prefixing them would be wrong, not merely
	//    unnecessary.
	["src/components/CnObjectSidebar/CnTasksTab.vue:'/ocs/v2.php/cloud/users/details?format=json&limit=50'", 'OCS entry point is a real file'],
	["src/components/CnUserActionMenu/CnUserActionMenu.vue:'/ocs/v2.php/cloud/capabilities?format=json'", 'OCS entry point is a real file'],
	['src/components/CnUserActionMenu/CnUserActionMenu.vue:`/ocs/v2.php/cloud/users/${encodeURIComponent(this.userId)}?format=json`', 'OCS entry point is a real file'],
	["src/components/CnUserActionMenu/CnUserActionMenu.vue:'/ocs/v2.php/apps/spreed/api/v4/room'", 'OCS entry point is a real file'],

	// ── Literals that already carry the `/index.php` prefix.
	['src/components/CnDeckCardPicker/CnDeckCardPicker.vue:url', "literal already starts with '/index.php'"],
	['src/components/CnWidgetRefItem/CnWidgetRefItem.vue:url', "literal already starts with '/index.php'"],

	// ── Caller- or config-supplied endpoints. The value arrives from the host
	//    app, a widget config or a server payload and may be absolute, so the
	//    library must pass it through untouched.
	['src/components/CnSettingsPage/CnSettingsPage.vue:this.saveEndpoint', 'endpoint prop comes from the host app'],
	['src/components/CnLogsPage/CnLogsPage.vue:this.source', 'log source URL comes from the page config'],
	['src/components/CnMapWidget/CnMapWidget.vue:url', 'GeoJSON endpoint is a widget-config value (often absolute)'],
	['src/components/CnMapWidget/CnMapWidget.vue:ds.url', 'GeoJSON endpoint is a widget-config value (often absolute)'],
	['src/components/CnNewsWidget/CnNewsWidget.vue:url', 'resolveEndpoint() returns the itemsEndpoint prop verbatim'],
	['src/components/CnObjectGeoWidget/CnObjectGeoWidget.vue:url', 'Nominatim is an absolute third-party URL'],
	['src/components/CnAiCompanion/CnAiChatPanel.vue:approval.resolveUrl', 'approval URL comes from the server payload'],
	['src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue:this.resolvedReimportUrl', 'falls back to generateUrl(); an explicit reimportUrl prop wins'],
	['src/composables/useAppManifest.js:url', 'the fetcher receives a caller-resolved endpoint'],
	['src/composables/useRuntimeManifest.js:u', 'the fetcher receives a caller-resolved endpoint'],

	// ── Built from a store base that is prefixed once, at store creation:
	//    `baseState()` in useObjectStore.js and `prefixUrl(...)` in
	//    createCrudStore.js. Prefixing again per call site would be noise.
	['src/store/useObjectStore.js:url', 'built from _options.baseUrl, prefixed in baseState()'],
	['src/composables/useSubResource.js:url', 'built from store._options.baseUrl, prefixed in baseState()'],
	['src/store/createSubResourcePlugin.js:url', 'built from _buildUrl(), which uses the prefixed baseUrl'],
	['src/store/plugins/auditTrails.js:url', 'built from _options.baseUrl, prefixed in baseState()'],
	['src/store/plugins/files.js:url', 'built from _options.baseUrl, prefixed in baseState()'],
	['src/store/plugins/lifecycle.js:url', 'built from _options.baseUrl, prefixed in baseState()'],
	['src/store/plugins/logs.js:url', 'built from _options.baseUrl, prefixed in baseState()'],
	['src/store/createCrudStore.js:url', 'built from _options.baseApiUrl, prefixed at store creation'],
	['src/store/createCrudStore.js:`${this._options.baseApiUrl}/${encodeURIComponent(id)}`', 'baseApiUrl is prefixed at store creation'],
	['src/store/createCrudStore.js:`${this._options.baseApiUrl}/${encodeURIComponent(item.id)}`', 'baseApiUrl is prefixed at store creation'],
])

/**
 * Blank out comments while preserving byte offsets and line numbers, so a
 * docblock that mentions `fetch(` is not mistaken for a call site.
 *
 * Regex literals are copied through verbatim rather than scanned for comment
 * markers. `/^https?:\/\//i` ends in two adjacent slashes, and reading those
 * as a line comment blanks the rest of the line — which silently deleted the
 * `generateUrl(...)` call that follows it in CnStatWidget and reported a
 * correct call site as an offender.
 *
 * @param {string} source File contents.
 * @return {string} Same length, comments replaced by spaces.
 */
function blankComments(source) {
	// A `/` starts a regex only in expression position. After a value —
	// identifier, literal, `)` or `]` — it is division.
	const EXPRESSION_POSITION = /[(,=:[!&|?{};+\-*%<>]$|\breturn$|\btypeof$/

	let out = ''
	let i = 0
	let state = null
	while (i < source.length) {
		const c = source[i]
		const n = source[i + 1]
		if (state === null) {
			if (c === '/' && n === '*') { state = 'block'; out += '  '; i += 2; continue }
			if (c === '/' && n === '/') { state = 'line'; out += '  '; i += 2; continue }
			if (c === '"' || c === "'" || c === '`') { state = c; out += c; i++; continue }
			if (c === '/' && EXPRESSION_POSITION.test(out.trimEnd())) {
				// Regex literal: copy to the unescaped closing delimiter.
				let j = i + 1
				let inClass = false
				for (; j < source.length; j++) {
					const r = source[j]
					if (r === '\\') { j++; continue }
					if (r === '\n') break
					if (r === '[') inClass = true
					else if (r === ']') inClass = false
					else if (r === '/' && !inClass) break
				}
				out += source.slice(i, j + 1)
				i = j + 1
				continue
			}
			out += c; i++; continue
		}
		if (state === 'block') {
			if (c === '*' && n === '/') { state = null; out += '  '; i += 2; continue }
			out += c === '\n' ? '\n' : ' '; i++; continue
		}
		if (state === 'line') {
			if (c === '\n') { state = null; out += '\n'; i++; continue }
			out += ' '; i++; continue
		}
		if (c === '\\') { out += c + (source[i + 1] || ''); i += 2; continue }
		if (c === state) { state = null; out += c; i++; continue }
		out += c; i++
	}
	return out
}

/**
 * Whether an expression applies one of the URL helpers.
 *
 * @param {string} expression Source of the expression.
 * @return {boolean} True when a helper call is present.
 */
function usesUrlHelper(expression) {
	return URL_HELPERS.some((h) => new RegExp('(^|[^\\w$])' + h + '\\s*\\(').test(expression))
}

/**
 * Source of the first argument of a call whose `(` sits just before `start`.
 *
 * @param {string} source Full file contents.
 * @param {number} start  Index just after the opening paren.
 * @return {string} The first argument's source text.
 */
function firstArgument(source, start) {
	let depth = 0
	let quote = null
	let i = start
	for (; i < source.length; i++) {
		const c = source[i]
		if (quote) {
			if (c === '\\') { i++; continue }
			if (c === quote) quote = null
			continue
		}
		if (c === '"' || c === "'" || c === '`') { quote = c; continue }
		if ('([{'.includes(c)) {
			depth++
		} else if (')]}'.includes(c)) {
			if (depth === 0) break
			depth--
		} else if (c === ',' && depth === 0) {
			break
		}
	}
	return source.slice(start, i)
}

/**
 * Every `.vue` / `.js` file under `src/`, excluding co-located tests.
 *
 * @param {string} dir Directory to walk.
 * @return {string[]} Absolute file paths.
 */
function sourceFiles(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name !== '__tests__') out.push(...sourceFiles(full))
		} else if (/\.(vue|js)$/.test(entry.name)
			&& !/\.spec\.js$/.test(entry.name)
			// Generated bundle — a compiled schema validator carries megabytes
			// of embedded JSON that no rule of ours governs.
			&& !/\.compiled\.js$/.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

/**
 * The `<script>` body of a `.vue` file, blanked elsewhere so offsets and line
 * numbers still line up with the original file. A `<template>` block holds
 * markup and HTML comments, not call sites, and its prose produces false hits.
 *
 * @param {string} source Full file contents.
 * @param {string} file   Path, to tell `.vue` from `.js`.
 * @return {string} Same-length string with non-script regions blanked.
 */
function scriptRegion(source, file) {
	if (!file.endsWith('.vue')) return source
	const open = /<script\b[^>]*>/g
	let out = ''
	let cursor = 0
	let match
	while ((match = open.exec(source)) !== null) {
		const bodyStart = match.index + match[0].length
		const bodyEnd = source.indexOf('</script>', bodyStart)
		const end = bodyEnd === -1 ? source.length : bodyEnd
		out += source.slice(cursor, bodyStart).replace(/[^\n]/g, ' ')
		out += source.slice(bodyStart, end)
		cursor = end
		// Resume the search AFTER this block. Without this, a `<script>`
		// written inside a comment in the script body (CnStatWidget has one)
		// is read as a second opening tag, and the block gets emitted twice —
		// shifting every offset and duplicating code the checks then read.
		open.lastIndex = end
	}
	out += source.slice(cursor).replace(/[^\n]/g, ' ')
	return out
}

/**
 * The right-hand side of the last `const|let|var <name> = …` before `before`.
 *
 * Reads the expression with bracket depth tracking and only ends it at a
 * newline that is not a continuation, so a multi-line ternary survives intact:
 *
 *     const url = this.objectBound
 *         ? generateUrl(…)
 *         : generateUrl(…)
 *
 * A naive "up to the next newline" read stops after `this.objectBound` and
 * concludes the URL never meets a helper — which is a false alarm on code that
 * is already correct, and the fastest way to get a guard like this disabled.
 *
 * @param {string} source Comment-blanked file contents.
 * @param {string} name   Identifier to look up.
 * @param {number} before Only declarations starting before this offset count.
 * @return {string|null} The expression source, or null when not found.
 */
function declarationValue(source, name, before) {
	const declaration = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*', 'g')
	let match
	let start = -1
	while ((match = declaration.exec(source)) !== null) {
		if (match.index >= before) break
		start = match.index + match[0].length
	}
	if (start === -1) return null

	// `?`, `:` and `.` continue a ternary or a member chain onto the next line;
	// a trailing operator or open bracket continues an expression too.
	const CONTINUES_AFTER = /[-+*/%?:.,&|=<>([{]$/
	const CONTINUES_BEFORE = /^[?:.)\]}]|^&&|^\|\||^\+/

	let depth = 0
	let quote = null
	let i = start
	for (; i < source.length && i < start + 1200; i++) {
		const c = source[i]
		if (quote) {
			if (c === '\\') { i++; continue }
			if (c === quote) quote = null
			continue
		}
		if (c === '"' || c === "'" || c === '`') { quote = c; continue }
		if ('([{'.includes(c)) { depth++; continue }
		if (')]}'.includes(c)) { depth--; continue }
		if (c !== '\n') continue
		if (depth > 0) continue
		const sofar = source.slice(start, i).trimEnd()
		if (CONTINUES_AFTER.test(sofar)) continue
		const rest = source.slice(i + 1).replace(/^[ \t]+/, '')
		if (CONTINUES_BEFORE.test(rest)) continue
		break
	}
	return source.slice(start, i)
}

/**
 * Resolve indirection: an identifier assigned from a helper call, or a
 * function/method whose body returns one. Two hops, which covers the shapes
 * this codebase uses (`const url = builder()`, `builder()` → `generateUrl()`).
 *
 * @param {string} source     Comment-blanked file contents.
 * @param {number} before     Only consider declarations before this offset.
 * @param {string} expression The first-argument source.
 * @param {number} [depth]    Remaining hops to follow.
 * @return {boolean} True when the expression provably flows from a helper.
 */
function resolvesToHelper(source, before, expression, depth = 3) {
	if (depth <= 0) return false
	const identifiers = [...expression.matchAll(/(?:^|[^\w$.])([a-zA-Z_$][\w$]*)\b(?!\s*\()/g)].map((m) => m[1])
	for (const id of identifiers) {
		const value = declarationValue(source, id, before)
		if (value === null) continue
		if (usesUrlHelper(value)) return true
		if (resolvesToHelper(source, before, value, depth - 1)) return true
	}
	const callees = [...expression.matchAll(/(?:this\.)?([a-zA-Z_$][\w$]*)\s*\(/g)].map((m) => m[1])
	for (const callee of callees) {
		const body = new RegExp('\\b' + callee + '\\s*\\([^)]*\\)\\s*\\{([\\s\\S]{0,600}?)\\n\\t*\\}', 'g')
		let match
		while ((match = body.exec(source)) !== null) {
			if (usesUrlHelper(match[1])) return true
			if (resolvesToHelper(source, before, match[1], depth - 1)) return true
		}
	}
	return false
}

/**
 * Every `fetch()` / `axios.<verb>()` call site whose URL argument is not
 * provably built through a URL helper.
 *
 * @return {Array<{key: string, file: string, line: number, argument: string}>} Offenders.
 */
function unprefixedCallSites() {
	const offenders = []
	for (const file of sourceFiles(SRC)) {
		const relative = path.relative(ROOT, file).split(path.sep).join('/')
		const source = blankComments(scriptRegion(fs.readFileSync(file, 'utf8'), file))
		const calls = /(?<![.\w$])(fetch|axios\.(?:get|post|put|patch|delete|request))\s*\(/g
		let match
		while ((match = calls.exec(source)) !== null) {
			const start = match.index + match[0].length
			const argument = firstArgument(source, start).trim().replace(/\s+/g, ' ')
			if (argument === '') continue
			if (usesUrlHelper(argument)) continue
			if (resolvesToHelper(source, match.index, argument)) continue
			offenders.push({
				key: `${relative}:${argument}`,
				file: relative,
				line: source.slice(0, match.index).split('\n').length,
				argument,
			})
		}
	}
	return offenders
}

describe('app-relative API requests are URL-prefixed', () => {
	const offenders = unprefixedCallSites()

	it('routes every fetch/axios URL through a URL helper', () => {
		const unexpected = offenders.filter((o) => !ALLOWED.has(o.key))
		const report = unexpected
			.map((o) => `  ${o.file}:${o.line}\n    fetch/axios URL: ${o.argument}`)
			.join('\n')
		expect(report).toBe('')
	})

	it('keeps the exemption list free of stale entries', () => {
		const live = new Set(offenders.map((o) => o.key))
		const stale = [...ALLOWED.keys()].filter((key) => !live.has(key))
		expect(stale).toEqual([])
	})

	it('sees the sidebar tabs that regressed as prefixed', () => {
		// A guard that no longer LOOKS at the regressing files passes for the
		// wrong reason, so name them.
		const sidebar = [
			'src/components/CnObjectSidebar/CnFilesTab.vue',
			'src/components/CnObjectSidebar/CnNotesTab.vue',
			'src/components/CnObjectSidebar/CnTagsTab.vue',
			'src/components/CnObjectSidebar/CnTasksTab.vue',
			'src/components/CnObjectSidebar/CnAuditTrailTab.vue',
		]
		for (const relative of sidebar) {
			const contents = fs.readFileSync(path.join(ROOT, relative), 'utf8')
			expect(usesUrlHelper(contents)).toBe(true)
		}
	})
})
