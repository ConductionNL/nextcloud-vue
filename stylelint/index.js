/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@conduction/nextcloud-vue/stylelint` — the shared Stylelint preset for every
 * Conduction Nextcloud app.
 *
 * WHY THIS LIVES HERE
 * -------------------
 * The same reason the ESLint preset does, and the same reason the PHP ruleset
 * moved to `conduction/hydra-gates`: a copied config is not a shared config.
 *
 * Measured across the 18 core apps on 2026-08-12, `stylelint.config.js` existed
 * in six variants. Ten apps were byte-identical to this file; the other eight
 * had each drifted separately. None of that drift was a decision.
 *
 * Stylelint cannot be homed the way PHPCS was, through a path into `vendor/`,
 * because a Stylelint config resolves `extends` against `node_modules` relative
 * to itself. An npm package is the only channel that works — and every app
 * already depends on this one.
 *
 * WHAT IT IS
 * ----------
 * `@nextcloud/stylelint-config`, plus exactly one addition.
 *
 * That is deliberate and it mirrors `conduction/coding-standard` on the PHP
 * side: Conduction code must pass Nextcloud's own checks unchanged. We may be
 * STRICTER than Nextcloud; we may not be DIFFERENT from it. Anything here that
 * contradicted `@nextcloud/stylelint-config` would put an app in the position
 * the PHP toolchain was in until this week — two tools with overlapping
 * jurisdiction demanding opposite things, and no way to satisfy both.
 *
 * THE ONE ADDITION
 * ----------------
 * `::v-deep` is a Vue SFC scoped-style selector, not a CSS pseudo-element.
 * Stylelint's `selector-pseudo-element-no-unknown` does not know it and flags
 * every use. Nextcloud's config does not carry the exception because Nextcloud
 * core does not use `::v-deep`; this fleet does, in every app that restyles a
 * child component's internals.
 *
 * This is additive in the strict sense — it relaxes a rule on a token Nextcloud
 * never emits — so a file that satisfies this preset still satisfies theirs.
 *
 * USAGE
 * -----
 *   // stylelint.config.js
 *   module.exports = require('@conduction/nextcloud-vue/stylelint')
 *
 * To add an app-specific rule, spread it — do not redefine `extends`:
 *
 *   const base = require('@conduction/nextcloud-vue/stylelint')
 *   module.exports = { ...base, rules: { ...base.rules, 'my/rule': true } }
 */
module.exports = {
	extends: '@nextcloud/stylelint-config',
	rules: {
		'selector-pseudo-element-no-unknown': [true, {
			ignorePseudoElements: ['v-deep'],
		}],
	},
}
