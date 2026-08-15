/**
 * Sentinel-token vocabulary ⇄ schema $def equality + guard behaviour
 * (manifest-sentinel-token-registry, audit item 23).
 *
 * The closed vocabulary is declared ONCE in src/utils/sentinelTokens.js and
 * mirrored into app-manifest-v2.schema.json's $defs. This suite is the guard
 * against those two drifting:
 *
 * 1. every context's schema $def `pattern` is byte-identical to the exported
 *    SENTINEL_TOKEN_PATTERNS entry (task 2.3);
 * 2. the compiled v2 validator accepts a known token, accepts a deprecated
 *    (during-window) token, and REJECTS an out-of-vocabulary token — proving
 *    the sentinelGuardedValue allOf is wired into pages[].config + widgetEntry.
 */

import schema from '../../src/schemas/app-manifest-v2.schema.json'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'
import { SENTINEL_TOKEN_PATTERNS } from '../../src/utils/sentinelTokens.js'

const DEF_FOR_CONTEXT = {
	filter: 'sentinelFilterToken',
	config: 'sentinelConfigToken',
	object: 'sentinelObjectToken',
	workspace: 'sentinelWorkspaceToken',
	route: 'sentinelRouteToken',
	declarative: 'sentinelDeclarativeToken',
	visibleWhen: 'sentinelVisibleWhenToken',
	deprecated: 'sentinelDeprecatedToken',
}

const manifest = (config, widgets) => ({
	$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [],
	pages: [{
		id: 'p',
		route: '/p',
		type: 'index',
		title: 't',
		...(config ? { config } : {}),
		...(widgets ? { widgets } : {}),
	}],
})

describe('sentinel-token vocabulary ⇄ schema $def equality', () => {
	it('every context pattern string equals its schema $def pattern (no drift)', () => {
		for (const [ctx, pattern] of Object.entries(SENTINEL_TOKEN_PATTERNS)) {
			const defName = DEF_FOR_CONTEXT[ctx]
			expect(defName).toBeTruthy()
			const def = schema.$defs[defName]
			expect(def).toBeTruthy()
			expect(def.type).toBe('string')
			expect(def.pattern).toBe(pattern)
		}
	})

	it('the $def set and the exported vocabulary cover the same contexts', () => {
		const exported = Object.keys(SENTINEL_TOKEN_PATTERNS).sort()
		const schemaDefs = Object.keys(DEF_FOR_CONTEXT)
			.filter((c) => schema.$defs[DEF_FOR_CONTEXT[c]])
			.sort()
		expect(schemaDefs).toEqual(exported)
	})

	it('sentinelTokenAny unions exactly the seven per-context $defs', () => {
		const refs = schema.$defs.sentinelTokenAny.anyOf.map((s) => s.$ref)
		expect(refs.sort()).toEqual(
			Object.values(DEF_FOR_CONTEXT).map((d) => `#/$defs/${d}`).sort(),
		)
	})
})

describe('schema guard accepts known + deprecated, rejects out-of-vocabulary', () => {
	it.each([
		['@today-7d filter', manifest({ filter: { createdAt: '@today-7d' } })],
		['@me filter', manifest({ filter: { assignee: '@me' } })],
		['@object.status object-context', manifest({ filter: { status: '@object.status' } })],
		['@objectId object-context', manifest({ filter: { id: '@objectId' } })],
		['@self.id declarative (nested)', manifest({ relatedLists: [{ filter: { x: '@self.id' } }] })],
		['@workspace.dateFrom? workspace', manifest({ widgets: [{ content: { source: { filter: { d: { gte: '@workspace.dateFrom?' } } } } }] })],
		['@resolve:foo config', manifest({ register: '@resolve:foo_register' })],
		['@config.currency config', manifest({ widgets: [{ content: { format: { currency: '@config.currency' } } }] })],
		['@total visibleWhen (manifest-form-logic)', manifest({ fields: [{ key: 'kvk', label: 'KvK', type: 'string', visibleWhen: { source: { register: 'r', schema: 's' }, field: '@total', op: 'gt', value: 0 } }] })],
		['@route.id in top-level widget dataSource', manifest(undefined, [{ widgetKey: 'w', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4, dataSource: { filter: { id: '@objectId' } } }])],
	])('accepts %s', (_label, m) => {
		expect(validateManifestV2(m).valid).toBe(true)
	})

	it.each([
		['@currentFiscalYear', manifest({ dataSource: { filters: { reportingYear: '@currentFiscalYear' } } })],
		['@page.period', manifest({ source: { params: { period: '@page.period' } } })],
		['@runtime.foo', manifest({ x: '@runtime.foo' })],
	])('accepts deprecated %s during the migration window', (_label, m) => {
		expect(validateManifestV2(m).valid).toBe(true)
	})

	it.each([
		['@yearStrt (typo)', manifest({ filter: { d: '@yearStrt' } })],
		['@runtimeFoo (invented)', manifest({ filter: { d: '@runtimeFoo' } })],
		['@currentFiscalYearX (near-miss)', manifest({ filter: { d: '@currentFiscalYearX' } })],
		['@page (bare, no key)', manifest({ x: '@page' })],
		['@object. (empty field)', manifest({ filter: { d: '@object.' } })],
		['@invented in top-level widget filter', manifest(undefined, [{ widgetKey: 'w', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4, dataSource: { filter: { d: '@totallyInvented' } } }])],
	])('rejects out-of-vocabulary %s', (_label, m) => {
		expect(validateManifestV2(m).valid).toBe(false)
	})
})
