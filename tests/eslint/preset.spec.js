/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof that `@conduction/nextcloud-vue/eslint` does what it claims.
 *
 * A lint preset is the one artifact where "it's configured" and "it works" are
 * routinely different states — openconnector's config LOOKED like a Vue 3
 * config and had zero `vue/no-deprecated-*` rules active, which is how four
 * `beforeDestroy` memory leaks shipped. So the preset is not asserted against
 * its own source: it is RUN, over real fixture files, and the findings are
 * asserted by rule id.
 *
 * Three fixtures, three different questions:
 *   - LegacyComponent.vue — does it FLAG the Vue-2 idioms?
 *   - ModernComponent.vue — does correct Vue 3 code pass CLEAN?
 *   - StillArmed.vue      — is the gate still armed, or was it silenced?
 *
 * @jest-environment node
 */

const fs = require('fs')
const path = require('path')

const { conductionVue3, vueDeprecationRules, ECMA_VERSION } = require('../../eslint/index.js')

const FIXTURES = path.join(__dirname, '..', 'fixtures', 'eslint-preset')

/**
 * ESLint 8 exposes the flat-config engine under `use-at-your-own-risk`; in
 * ESLint 9 the same engine IS `ESLint`. Resolve whichever this install has so
 * the proof survives the next major bump.
 *
 * @return {Function} The flat-config ESLint class.
 */
function resolveFlatESLint() {
	// eslint-disable-next-line n/no-missing-require
	const risky = require('eslint/use-at-your-own-risk')
	return risky.FlatESLint || require('eslint').ESLint
}

/**
 * Lint one fixture through the standalone preset ONLY.
 *
 * `overrideConfigFile: true` is load-bearing: without it ESLint also loads this
 * repository's own `eslint.config.js`, and the resulting findings would prove
 * something about the repo rather than about the published preset.
 *
 * @param {string} fixture File name inside tests/fixtures/eslint-preset.
 * @return {Promise<Array<object>>} Lint messages for that file.
 */
async function lintFixture(fixture) {
	const FlatESLint = resolveFlatESLint()
	const engine = new FlatESLint({
		overrideConfigFile: true,
		overrideConfig: conductionVue3,
		cwd: FIXTURES,
	})
	const filePath = path.join(FIXTURES, fixture)
	const results = await engine.lintText(fs.readFileSync(filePath, 'utf8'), { filePath })
	return results[0].messages
}

/**
 * The distinct rule ids reported for a fixture.
 *
 * @param {Array<object>} messages Lint messages.
 * @return {string[]} Sorted unique rule ids.
 */
function ruleIds(messages) {
	return Array.from(new Set(messages.map((m) => m.ruleId).filter(Boolean))).sort()
}

describe('@conduction/nextcloud-vue/eslint — the preset flags Vue-2 idioms', () => {
	let messages

	beforeAll(async () => {
		messages = await lintFixture('LegacyComponent.vue')
	})

	it.each([
		// The three the brief names explicitly.
		['a surviving beforeDestroy hook', 'vue/no-deprecated-destroyed-lifecycle'],
		['a :prop.sync binding', 'vue/no-deprecated-v-bind-sync'],
		['a template filter', 'vue/no-deprecated-filter'],
		// …and the rest of the family the fixture exercises.
		['the filters: component option', 'vue/no-restricted-component-options'],
		['a model: { prop, event } option', 'vue/no-deprecated-model-definition'],
		['a prop default() reading this', 'vue/no-deprecated-props-default-this'],
		['a $on events-API call', 'vue/no-deprecated-events-api'],
		['a this.$set call', 'vue/no-deprecated-delete-set'],
		['a @click.native modifier', 'vue/no-deprecated-v-on-native-modifier'],
		['a slot="name" attribute', 'vue/no-deprecated-slot-attribute'],
	])('reports %s', (_label, ruleId) => {
		expect(ruleIds(messages)).toContain(ruleId)
	})

	it('reports every one of them as an ERROR, not a warning', () => {
		const armed = messages.filter((m) => String(m.ruleId).startsWith('vue/no-'))
		expect(armed.length).toBeGreaterThan(0)
		expect(armed.every((m) => m.severity === 2)).toBe(true)
	})

	it('reports no parse errors — a fatal would fake all of the above', () => {
		expect(messages.filter((m) => m.fatal)).toEqual([])
	})
})

describe('@conduction/nextcloud-vue/eslint — correct Vue 3 code passes clean', () => {
	it('reports nothing at all for ModernComponent.vue', async () => {
		const messages = await lintFixture('ModernComponent.vue')
		expect(messages.map((m) => `${m.ruleId} (${m.line}): ${m.message}`)).toEqual([])
	})

	it('does not touch a camelCase @update:modelValue listener', async () => {
		const messages = await lintFixture('ModernComponent.vue')
		expect(ruleIds(messages)).not.toContain('vue/v-on-event-hyphenation')
	})

	it('parses optional chaining, nullish coalescing and spread', () => {
		// The syntax lives in ModernComponent's `resolved()` computed. A stale
		// ecmaVersion surfaces as a FATAL parse error, which the clean-run
		// assertion above already covers — this asserts the declared floor so a
		// future edit cannot quietly lower it.
		expect(ECMA_VERSION).toBeGreaterThanOrEqual(2020)
	})
})

describe('@conduction/nextcloud-vue/eslint — the gate stays ARMED', () => {
	it('still reports a :key that is not bound from the v-for scope', async () => {
		const messages = await lintFixture('StillArmed.vue')
		// This is the difference between fixing the parser wiring and switching
		// vue/valid-v-for off to make a noisy run go quiet.
		expect(ruleIds(messages)).toContain('vue/valid-v-for')
	})

	it('keeps vue/v-on-event-hyphenation enabled for every OTHER event', async () => {
		const FlatESLint = resolveFlatESLint()
		const engine = new FlatESLint({
			overrideConfigFile: true,
			overrideConfig: conductionVue3,
			cwd: FIXTURES,
		})
		const source = '<template>\n\t<Child @customEvent="x" />\n</template>\n'
			+ '<script>\nexport default { name: \'Hyphen\', methods: { x() {} } }\n</script>\n'
		const [result] = await engine.lintText(source, { filePath: path.join(FIXTURES, 'Hyphen.vue') })
		expect(ruleIds(result.messages)).toContain('vue/v-on-event-hyphenation')
	})
})

describe('@conduction/nextcloud-vue/eslint — shape of the published preset', () => {
	it('arms the entire vue/no-deprecated-* family eslint-plugin-vue ships', () => {
		// Guards against the family drifting: a new eslint-plugin-vue release
		// that adds a deprecation rule should make this fail, not silently ship
		// an incomplete gate.
		const plugin = require('eslint-plugin-vue')
		const shipped = Object.keys(plugin.rules)
			.filter((r) => r.startsWith('no-deprecated-'))
			.map((r) => `vue/${r}`)
		const armed = Object.keys(vueDeprecationRules)
		expect(shipped.filter((r) => !armed.includes(r))).toEqual([])
	})

	it('never sets vue/v-on-event-hyphenation without the update:modelValue escape', () => {
		const entry = conductionVue3
			.map((c) => c.rules && c.rules['vue/v-on-event-hyphenation'])
			.filter(Boolean)
			.pop()
		// Hyphenating `@update:modelValue` silently disconnects every
		// useModel()-backed @nextcloud/vue field. Either the rule is off, or
		// this exact ignore entry is present — nothing in between.
		expect(entry).toBeDefined()
		expect(entry[2].ignore).toContain('update:modelValue')
	})

	it('exposes a fix layer that registers no plugins, so it can be spread last', () => {
		const { conductionVue3Fixes } = require('../../eslint/index.js')
		expect(conductionVue3Fixes.length).toBeGreaterThan(0)
		expect(conductionVue3Fixes.every((c) => c.plugins === undefined)).toBe(true)
	})

	it('uses the OBJECT form of parserOptions.parser, never a bare string', () => {
		const { vueSfcParserOptions } = require('../../eslint/index.js')
		expect(typeof vueSfcParserOptions.parser).toBe('object')
		expect(vueSfcParserOptions.parser).toHaveProperty('js')
		expect(vueSfcParserOptions.parser).toHaveProperty('ts')
	})
})
