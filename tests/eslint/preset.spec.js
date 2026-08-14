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

const pluginVue = require('eslint-plugin-vue')

const {
	conductionVue3,
	conductionVue3Fixes,
	vueDeprecationRules,
	vueInvertedVue2Rules,
	ECMA_VERSION,
	ECMA_LANGUAGE_LEVEL,
} = require('../../eslint/index.js')

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

/**
 * The preset must never LOWER the consumer that adopts it.
 *
 * openconnector's config carried a top-level `ecmaVersion: 'latest'`; adopting
 * this preset silently downgraded it to the pinned `2022`. Harmless in that
 * repository — and the exact class of failure the pin was added to fix, because
 * a file ESLint cannot parse gets a `fatal` message and NO other rule runs on
 * it. A preset that pins a year turns "app uses modern syntax" into "the Vue-3
 * deprecation gate is off for that file".
 *
 * This is not asserted against the constant. The fixture is LINTED, and a
 * positive control re-lints the same source at the old pin to prove the fixture
 * can actually tell the two apart — otherwise a fixture that happened to parse
 * everywhere would fake a pass forever.
 */
describe('@conduction/nextcloud-vue/eslint — the language level is never a downgrade', () => {
	const MODERN = 'modern-syntax.js'

	/**
	 * Lint the modern-syntax fixture at an arbitrary ecmaVersion, using the
	 * preset's OWN language-level layer shape.
	 *
	 * @param {number|string} ecmaVersion Level to force.
	 * @return {Promise<Array<object>>} Lint messages.
	 */
	async function lintModernAt(ecmaVersion) {
		const FlatESLint = resolveFlatESLint()
		const engine = new FlatESLint({
			overrideConfigFile: true,
			overrideConfig: [{
				files: ['**/*.js'],
				languageOptions: {
					ecmaVersion,
					sourceType: 'module',
					parserOptions: { ecmaVersion, sourceType: 'module' },
				},
			}],
			cwd: FIXTURES,
		})
		const filePath = path.join(FIXTURES, MODERN)
		const [result] = await engine.lintText(fs.readFileSync(filePath, 'utf8'), { filePath })
		return result.messages
	}

	it('sets ecmaVersion to "latest" on languageOptions', () => {
		const layer = conductionVue3Fixes.find((c) => c.name === 'conduction/language-level')
		expect(layer.languageOptions.ecmaVersion).toBe('latest')
	})

	it('sets ecmaVersion to "latest" on languageOptions.parserOptions too', () => {
		// eslint-plugin-import reads `context.parserOptions`, which in flat
		// config is `languageOptions.parserOptions` — NOT
		// `languageOptions.ecmaVersion`. Setting only one of the two is how the
		// import plugin ends up parsing at a different level from ESLint itself.
		const layer = conductionVue3Fixes.find((c) => c.name === 'conduction/language-level')
		expect(layer.languageOptions.parserOptions.ecmaVersion).toBe('latest')
	})

	it('sets it on the .vue SFC layer as well, on both keys', () => {
		const layer = conductionVue3Fixes.find((c) => c.name === 'conduction/vue-sfc-parser')
		expect(layer.languageOptions.ecmaVersion).toBe('latest')
		expect(layer.languageOptions.parserOptions.ecmaVersion).toBe('latest')
	})

	it('pins NO numeric ecmaVersion anywhere in the shipped config', () => {
		// The guard against a well-meaning future edit that "modernises" the pin
		// to 2025 — which is still a pin, and still a downgrade tomorrow.
		const levels = []
		for (const entry of conductionVue3) {
			const lang = entry.languageOptions
			if (!lang) {
				continue
			}
			if (lang.ecmaVersion !== undefined) {
				levels.push(lang.ecmaVersion)
			}
			if (lang.parserOptions && lang.parserOptions.ecmaVersion !== undefined) {
				levels.push(lang.parserOptions.ecmaVersion)
			}
		}
		expect(levels.length).toBeGreaterThan(0)
		expect(levels.every((v) => v === 'latest')).toBe(true)
	})

	it('parses ES2022+ syntax with NO fatal error', async () => {
		const messages = await lintFixture(MODERN)
		expect(messages.filter((m) => m.fatal)).toEqual([])
	})

	it('reports nothing at all for the modern fixture', async () => {
		const messages = await lintFixture(MODERN)
		expect(messages.map((m) => `${m.ruleId} (${m.line}): ${m.message}`)).toEqual([])
	})

	it('POSITIVE CONTROL: the same fixture DOES fatal at the old 2022 pin', async () => {
		// Without this, a fixture that parses at every level would make the
		// assertion above pass for a preset that had been re-pinned — the test
		// would prove nothing. This is the measurement that gives it teeth.
		const messages = await lintModernAt(2022)
		const fatal = messages.filter((m) => m.fatal)
		expect(fatal).not.toEqual([])
		expect(fatal[0].message).toMatch(/Parsing error/)
	})

	it('POSITIVE CONTROL: and parses clean at "latest"', async () => {
		const messages = await lintModernAt(ECMA_LANGUAGE_LEVEL)
		expect(messages.filter((m) => m.fatal)).toEqual([])
	})

	it('still exports the numeric floor for tooling that needs a number', () => {
		expect(typeof ECMA_VERSION).toBe('number')
		expect(ECMA_VERSION).toBeGreaterThanOrEqual(2022)
		expect(ECMA_LANGUAGE_LEVEL).toBe('latest')
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

/**
 * The two INVERTED Vue-2 rules must be OFF — and nothing around them may go
 * off with them.
 *
 * `vue/no-v-model-argument` and `vue/no-v-for-template-key` forbid constructs
 * Vue 3 requires. Every migrated app carried the same two hand-written
 * disables; the Nextcloud app template carried them under a `TODO(nc-vue)`
 * pointing at this preset.
 *
 * Neither rule is armed by eslint-plugin-vue's Vue-3 `flat/essential`, so
 * linting the fixture through the standalone preset alone would pass whether
 * or not the preset switched anything off — a green result that measures
 * nothing. The base config used here is `flat/vue2-essential`, the plugin's
 * OWN published ruleset that arms both (the same way a consumer reaching a
 * Vue-2 ruleset through `FlatCompat`, or `@nextcloud/eslint-config`'s older
 * layers, arms them). The first test proves the fixture triggers both rules
 * under that base; the second proves the fix layer, spread last, silences
 * exactly those two and nothing else.
 *
 * Getting this wrong in the SILENCING direction is the failure this preset
 * exists to prevent, so the armed controls are not optional: `vue/valid-v-for`
 * and `vue/no-v-for-template-key-on-child` — the Vue-3 half of the very pair
 * being disabled — must still report.
 */
describe('@conduction/nextcloud-vue/eslint — the inverted Vue-2 rules are OFF', () => {
	/** A consumer base config that ARMS both inverted rules. */
	const VUE2_BASE = pluginVue.configs['flat/vue2-essential']

	/**
	 * Lint a fixture through an arbitrary flat config.
	 *
	 * @param {string} fixture File name inside tests/fixtures/eslint-preset.
	 * @param {Array<object>} config Flat config entries.
	 * @return {Promise<Array<object>>} Lint messages.
	 */
	async function lintWith(fixture, config) {
		const FlatESLint = resolveFlatESLint()
		const engine = new FlatESLint({
			overrideConfigFile: true,
			overrideConfig: config,
			cwd: FIXTURES,
		})
		const filePath = path.join(FIXTURES, fixture)
		const [result] = await engine.lintText(fs.readFileSync(filePath, 'utf8'), { filePath })
		return result.messages
	}

	it('CONTROL: the base config really does report BOTH on the fixture', async () => {
		// Without this the "clean" assertion below would pass against a preset
		// that changed nothing at all, because Vue-3 `flat/essential` never
		// arms these two in the first place.
		const messages = await lintWith('Vue3RequiredSyntax.vue', VUE2_BASE)
		expect(ruleIds(messages)).toContain('vue/no-v-model-argument')
		expect(ruleIds(messages)).toContain('vue/no-v-for-template-key')
	})

	it('lints Vue-3-required syntax CLEAN once the fix layer is spread last', async () => {
		const messages = await lintWith('Vue3RequiredSyntax.vue', [
			...VUE2_BASE,
			...conductionVue3Fixes,
		])
		expect(messages.map((m) => `${m.ruleId} (${m.line}): ${m.message}`)).toEqual([])
	})

	it('lints the same file clean through the standalone preset too', async () => {
		const messages = await lintFixture('Vue3RequiredSyntax.vue')
		expect(messages.map((m) => `${m.ruleId} (${m.line}): ${m.message}`)).toEqual([])
	})

	it('CONTROL: the base config really does report the fragment rule', async () => {
		// Same reason as the control above: `flat/essential` (Vue 3) never arms
		// `vue/no-multiple-template-root`, so asserting "clean under the preset"
		// without this control would measure nothing.
		const messages = await lintWith('Vue3Fragment.vue', VUE2_BASE)
		expect(ruleIds(messages)).toContain('vue/no-multiple-template-root')
	})

	it('lints a Vue-3 fragment CLEAN once the fix layer is spread last', async () => {
		const messages = await lintWith('Vue3Fragment.vue', [
			...VUE2_BASE,
			...conductionVue3Fixes,
		])
		expect(messages.map((m) => `${m.ruleId} (${m.line}): ${m.message}`)).toEqual([])
	})

	it('lints the fragment fixture clean through the standalone preset too', async () => {
		const messages = await lintFixture('Vue3Fragment.vue')
		expect(messages.map((m) => `${m.ruleId} (${m.line}): ${m.message}`)).toEqual([])
	})

	it('ARMED: the Vue-3 half of the key pair still reports', async () => {
		// `no-v-for-template-key` (Vue 2) is off; `no-v-for-template-key-on-child`
		// (Vue 3) must not be. Disabling both would silence the migration
		// entirely while looking identical from the app side.
		const messages = await lintFixture('Vue2KeyPlacement.vue')
		expect(ruleIds(messages)).toContain('vue/no-v-for-template-key-on-child')
	})

	it('ARMED: a genuinely bad :key still raises vue/valid-v-for', async () => {
		// Same probe the parser-wiring gate uses, re-asserted here so a future
		// edit that switches rules off to quieten a run cannot pass this block.
		const messages = await lintFixture('StillArmed.vue')
		expect(ruleIds(messages)).toContain('vue/valid-v-for')
	})

	it('ARMED: .sync is still an error, so the migration target stays reachable', async () => {
		// `no-deprecated-v-bind-sync` forces `:x.sync` → `v-model:x`. If that
		// rule were ever dropped alongside the two disables, the preset would
		// simply stop caring about the migration.
		const messages = await lintFixture('LegacyComponent.vue')
		expect(ruleIds(messages)).toContain('vue/no-deprecated-v-bind-sync')
	})

	it('switches off exactly these three rules and no others', async () => {
		expect(vueInvertedVue2Rules).toEqual({
			'vue/no-v-model-argument': 'off',
			'vue/no-v-for-template-key': 'off',
			'vue/no-multiple-template-root': 'off',
		})
	})

	it('carries all three disables in the SHIPPED fix layer, not just in the export', () => {
		// The export could be right while the layer never spread it.
		const rules = conductionVue3Fixes
			.map((c) => c.rules)
			.filter(Boolean)
			.reduce((acc, r) => ({ ...acc, ...r }), {})
		expect(rules['vue/no-v-model-argument']).toBe('off')
		expect(rules['vue/no-v-for-template-key']).toBe('off')
		expect(rules['vue/no-multiple-template-root']).toBe('off')
		expect(rules['vue/no-v-for-template-key-on-child']).toBeUndefined()
		expect(rules['vue/valid-v-for']).toBeUndefined()
	})
})

/**
 * The preset must never ENROL a file type it cannot parse.
 *
 * In flat config a `files` glob does two jobs: it scopes a layer, and it adds
 * the matched paths to the set of files ESLint lints (the default set is only
 * `**\/*.js`, `**\/*.mjs`, `**\/*.cjs`). The preset's language-level and
 * deprecation layers used to be scoped to a nine-entry glob that included
 * `.jsx`, `.ts`, `.tsx`, `.mts` and `.cts` — so ADOPTING the preset dragged
 * those extensions into every consumer's lint run while supplying a parser for
 * `.vue` alone. Portaliq's React files then hit `@babel/eslint-parser` with no
 * JSX plugin and fataled, and a `fatal` message means NO other rule is
 * evaluated on that file: the whole React surface silently lost lint coverage.
 * Same shape as the `ecmaVersion: 2022` pin above.
 *
 * Note what is NOT the cause, because "fix" it and you have changed nothing:
 * flat config DEEP-MERGES `languageOptions.parserOptions`, so the preset never
 * replaced the base's `requireConfigFile` / `ecmaFeatures.jsx`. That is
 * asserted below rather than assumed.
 *
 * Every assertion here is paired. "Lints clean" is worthless on its own — a
 * file ESLint never opened lints clean too — so each clean result sits next to
 * a control proving the same pipeline still reports.
 */
describe('@conduction/nextcloud-vue/eslint — the preset enrols no file it cannot parse', () => {
	/**
	 * What a consumer must write for `.jsx` to be linted at all, paired with a
	 * parser that can read it (espree, given `ecmaFeatures.jsx`). This is the
	 * app's call to make — the point of the fix is that the preset no longer
	 * makes it for them.
	 */
	const CONSUMER_JSX = [{
		name: 'app/jsx-enrolment',
		files: ['**/*.jsx'],
		languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
	}]

	/**
	 * Lint a fixture through an arbitrary flat config, reporting whether ESLint
	 * actually opened the file.
	 *
	 * @param {string} fixture File name inside tests/fixtures/eslint-preset.
	 * @param {Array<object>} config Flat config entries.
	 * @return {Promise<{linted: boolean, messages: Array<object>}>} Outcome.
	 */
	async function lintWith(fixture, config) {
		const FlatESLint = resolveFlatESLint()
		const engine = new FlatESLint({
			overrideConfigFile: true,
			overrideConfig: config,
			cwd: FIXTURES,
		})
		const filePath = path.join(FIXTURES, fixture)
		const [result] = await engine.lintText(fs.readFileSync(filePath, 'utf8'), { filePath })
		// ESLint reports an unmatched path as an "ignored file" warning with a
		// null ruleId. That warning IS the signal that nothing ran.
		const linted = !result.messages.some((m) => !m.ruleId && /ignored/.test(String(m.message)))
		return { linted, messages: result.messages }
	}

	it('does NOT drag .jsx into the lint set on its own', async () => {
		// The regression, stated directly. Adopting a Vue preset must not change
		// WHICH files an app lints.
		const { linted } = await lintWith('ReactSurface.jsx', conductionVue3)
		expect(linted).toBe(false)
	})

	it.each(['Probe.ts', 'Probe.tsx', 'Probe.mts', 'Probe.cts'])(
		'does NOT drag %s into the lint set either', async (name) => {
			// The same glob enrolled four TypeScript extensions the preset ships
			// no parser for. Measured before the fix: all four FATAL.
			const FlatESLint = resolveFlatESLint()
			const engine = new FlatESLint({
				overrideConfigFile: true,
				overrideConfig: conductionVue3,
				cwd: FIXTURES,
			})
			const filePath = path.join(FIXTURES, name)
			const [result] = await engine.lintText('const a: number = 1\n', { filePath })
			const linted = !result.messages.some((m) => !m.ruleId && /ignored/.test(String(m.message)))
			expect(linted).toBe(false)
		},
	)

	it('POSITIVE CONTROL: the same preset DOES lint a plain .js file', async () => {
		// Without this, every "not linted" assertion above would also pass for a
		// preset that had been broken into linting nothing whatsoever.
		const { linted } = await lintWith('modern-syntax.js', conductionVue3)
		expect(linted).toBe(true)
	})

	it('POSITIVE CONTROL: and still lints .vue, the one type it does enrol', async () => {
		const { linted, messages } = await lintWith('LegacyComponent.vue', conductionVue3)
		expect(linted).toBe(true)
		expect(ruleIds(messages)).toContain('vue/no-deprecated-destroyed-lifecycle')
	})

	it('lints a JSX file CLEAN once the consumer enrols it', async () => {
		// The consumer's own layer supplies the extension AND a parser that can
		// read it; the preset then applies to that file for free, because a
		// layer with no `files` matches whatever the consumer lints.
		const { linted, messages } = await lintWith('ReactSurface.jsx', [
			...conductionVue3,
			...CONSUMER_JSX,
		])
		expect(linted).toBe(true)
		expect(messages.filter((m) => m.fatal)).toEqual([])
		expect(messages.map((m) => `${m.ruleId} (${m.line}): ${m.message}`)).toEqual([])
	})

	it('ARMED: and the deprecation family still REPORTS on a .jsx file', async () => {
		// This is what makes the clean result above mean something. Same config,
		// same extension, a file with genuine Vue-2 survivors in it —
		// eslint-plugin-vue treats `.jsx`/`.tsx` as component files, so a
		// render-function component gets the gate exactly as an SFC does.
		const { linted, messages } = await lintWith('VueJsxLegacy.jsx', [
			...conductionVue3,
			...CONSUMER_JSX,
		])
		expect(linted).toBe(true)
		expect(messages.filter((m) => m.fatal)).toEqual([])
		expect(ruleIds(messages)).toContain('vue/no-deprecated-destroyed-lifecycle')
		expect(ruleIds(messages)).toContain('vue/no-deprecated-events-api')
		expect(messages.every((m) => m.severity === 2)).toBe(true)
	})

	it('CONTROL: those findings come from the PRESET, not the enrolment layer', async () => {
		// The enrolment layer arms no rules at all. Linting the legacy fixture
		// through it alone must therefore be silent — otherwise the assertion
		// above would be measuring the fixture's own config, not the preset.
		const { linted, messages } = await lintWith('VueJsxLegacy.jsx', CONSUMER_JSX)
		expect(linted).toBe(true)
		expect(messages.map((m) => m.ruleId)).toEqual([])
	})

	it('MERGES parserOptions with the consumer rather than replacing them', async () => {
		// The originally-suspected cause. It is not real, and this is the
		// measurement that says so: a base setting `ecmaFeatures.jsx` keeps it
		// after the preset is spread LAST, and the file still parses.
		const FlatESLint = resolveFlatESLint()
		const engine = new FlatESLint({
			overrideConfigFile: true,
			overrideConfig: [...CONSUMER_JSX, ...conductionVue3],
			cwd: FIXTURES,
		})
		const filePath = path.join(FIXTURES, 'ReactSurface.jsx')
		const effective = await engine.calculateConfigForFile(filePath)
		const parserOptions = effective.languageOptions.parserOptions
		// The consumer's key survived…
		expect(parserOptions.ecmaFeatures.jsx).toBe(true)
		// …alongside the preset's.
		expect(parserOptions.ecmaVersion).toBe('latest')
		expect(parserOptions.sourceType).toBe('module')
	})

	it('carries a files glob on the SFC layer only — the one type it parses', () => {
		// The shipped-shape guard. Any future layer that grows a `files` key is
		// enrolling paths into consumers' lint runs, which is the regression.
		const globbed = conductionVue3Fixes.filter((layer) => layer.files !== undefined)
		expect(globbed.map((layer) => layer.name)).toEqual(['conduction/vue-sfc-parser'])
		expect(globbed[0].files).toEqual(['**/*.vue'])
		expect(globbed[0].languageOptions.parser).toBeDefined()
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
