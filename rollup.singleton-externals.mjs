/**
 * Packages that must NEVER be inlined into the dist — the single source of
 * truth, imported by BOTH rollup configs.
 *
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------
 * The rule below used to be written out by hand in `rollup.config.js`. That
 * worked until `rollup.config.vue3.mjs` appeared as a second config with its
 * own hand-maintained `external` list, and the rule was never copied across.
 * The divergence then shipped for months: measured against the published
 * `2.1.0-vue3.16` tarball, the Vue 3 config inlined 49 packages into
 * `dist/esm/node_modules/`, four of them declared peerDependencies.
 *
 * A list duplicated across two files is a list that will drift. Both configs
 * now delegate the question to `isSingletonExternal()`, so adding a package
 * here covers every build, and no future config can be "the one that forgot".
 * `scripts/check-bundled-peers.mjs` then asserts the outcome on the built
 * artifact, because a rule is only as good as the thing that checks it.
 *
 * THE DEFECT A VENDORED PEER CAUSES
 * ---------------------------------
 * A peerDependency that gets bundled becomes a build-time SNAPSHOT frozen into
 * the library. The consuming app resolves its own copy at install time, so the
 * two drift apart on the next release and the app runs two different modules
 * for one package — with ours winning inside our own components. The consumer
 * cannot fix it from their side: bumping their own dependency does nothing to
 * the copy inside our dist.
 *
 * How each of these fails:
 *
 *  - `dexie` does not fail quietly. Its ESM entry claims a page-global
 *    singleton (`globalThis[Symbol.for("Dexie")]`) and THROWS at module
 *    evaluation when the two copies disagree, before the app mounts:
 *
 *      Two different versions of Dexie loaded in the same app: 4.4.5 and 4.4.4
 *
 *    Those are the real numbers. The vue3 tarballs froze dexie 4.4.4 while
 *    declaring peer `^4.0.8`, which resolves to 4.4.5 — so every consumer
 *    carried both, with exactly ONE dexie in its own lockfile. The second copy
 *    was ours. pipelinq#1431 (a dependabot 4.4.4 -> 4.4.5 bump) failed its E2E
 *    boot gate this way; pipelinq#1455 repeated it for `marked`.
 *
 *  - `dompurify` makes it a SECURITY defect rather than a packaging one. It is
 *    the XSS sanitizer, and a consumer cannot patch it: they bump their own
 *    dependency, `npm audit` reports green, and the vulnerable copy inside our
 *    dist keeps sanitizing. A check that reports success over a live
 *    vulnerability is worse than no check.
 *
 *  - `marked` is declared `^12.0.0` but consumers in the fleet range up to
 *    `^18.0.3`. A frozen v12 under a consumer expecting v18 disagrees silently
 *    about its own API surface.
 *
 *  - `@vueuse/core` is declared across two MAJORS (`^11.0.0 || ^14.0.0`).
 *    Whichever major we vendored is frozen while the app may be on the other,
 *    and duplicated composables stop sharing state — two `useLocalStorage`
 *    refs for one key, and `createGlobalState` global per copy.
 *
 *  - `gridstack` is the defect this rule was first written for: nc-vue's
 *    vendored v10 JS ran underneath a consumer's v12 CSS import, and every
 *    CnDashboardGrid item rendered at 0px width. JS and CSS can only be
 *    guaranteed to agree when the consumer resolves both from one copy.
 *
 * EXTERNALISING IS ONLY HALF OF IT — THE DECLARATION SHAPE MATTERS TOO
 * --------------------------------------------------------------------
 * A package listed here MUST be declared as peerDependencies (what the consumer
 * supplies) plus devDependencies (what our own build and tests resolve), with
 * NOTHING in dependencies. `dexie` and `gridstack` already had that shape;
 * `dompurify` and `marked` did not, and for them externalising alone was a
 * no-op.
 *
 * The reason: a package in `dependencies` is installed into the consumer's tree
 * by npm no matter what rollup does. When the consumer's range cannot dedupe
 * with ours, npm nests it at
 * `node_modules/@conduction/nextcloud-vue/node_modules/<pkg>` — and the bare
 * specifier this externalising produces then resolves to OUR nested copy, since
 * node resolution walks up from our own dist directory and finds it first. The
 * duplicate does not disappear; it moves out of `dist/` to somewhere a walk
 * over `dist/` cannot see. Observed in openregister with two copies of
 * `marked`: 18.0.11 at the top level and our 12.0.2 nested underneath us.
 *
 * `scripts/check-bundled-peers.mjs` asserts both halves, so a package added
 * here in the wrong shape fails the build rather than silently doing nothing.
 *
 * THE RULE
 * --------
 * Never inline a package that must be a SINGLETON — a database layer, a
 * sanitizer, a composable store, anything holding global state or owning a
 * security boundary, and anything whose JS must agree with CSS the consumer
 * imports separately. Keeping it external emits a bare specifier, so the
 * consumer's bundler resolves the single copy it already has. No consumer code
 * changes; consumers must, however, declare the peer themselves.
 *
 * `@nextcloud/dialogs` and `@nextcloud/password-confirmation` are deliberately
 * NOT here — both configs force them bundled on purpose.
 *
 * @module rollup.singleton-externals
 */

/**
 * Package names that must always resolve to the consumer's own copy.
 *
 * Keep this sorted, and add an explanation above when extending it.
 */
export const SINGLETON_PACKAGES = [
	'@vueuse/core',
	'dexie',
	'dompurify',
	'gridstack',
	'marked',
]

/**
 * Whether a rollup module id is one of the singleton packages or a subpath of
 * one.
 *
 * Subpaths matter: `dexie/import-wrapper.mjs` and `gridstack/dist/gridstack.js`
 * are the specifiers actually written in source, and externalising only the
 * bare name would let the deep import get inlined anyway.
 *
 * @param {string} id The rollup module id being resolved.
 *
 * @return {boolean} True when the id must stay external.
 */
export function isSingletonExternal(id) {
	return SINGLETON_PACKAGES.some((pkg) => id === pkg || id.startsWith(`${pkg}/`))
}
