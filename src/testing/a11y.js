/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * expectAccessible — the anchor helper for `@conduction/nextcloud-vue`'s
 * accessibility testing lane.
 *
 * WHY THIS LIVES IN nc-vue (not each app): every Conduction app was on a
 * path to hand-roll its own a11y checking (or, more likely, skip it
 * entirely) because nothing in the shared library made it cheap. Anchoring
 * the check ONCE here means every consumer inherits the same rule set, the
 * same helper signature, and the same WCAG tag defaults for free — the
 * opposite of 13 apps each solving this differently or not at all.
 *
 * This module wraps `axe-core` directly (not `jest-axe` / `vitest-axe`)
 * because the fleet runs BOTH Jest (openregister, opencatalogi, ...) and
 * Vitest (procest, pipelinq, ...) across its consuming apps — see
 * `openspec/changes/wcag-a11y-anchor/design.md` for the survey. A thin
 * runner-agnostic wrapper that just throws a formatted `Error` on
 * violations works identically under both: a thrown error inside a test
 * body fails the test in Jest and Vitest without needing either runner's
 * custom matcher extension mechanism (`expect.extend`).
 *
 * `axe-core` itself is a devDependency (see `package.json`
 * `peerDependencies` / `peerDependenciesMeta` — it's an OPTIONAL peer,
 * exactly like the existing `dexie` / `dompurify` / `marked` entries).
 * This file is never imported from `src/index.js`, so `axe-core` is never
 * pulled into the Rollup bundle (`rollup.config.js` `input: 'src/index.js'`
 * — anything unreached from that entry point is simply absent from
 * `dist/`). Consuming apps that want `expectAccessible` in their own test
 * suite add `axe-core` to their OWN devDependencies.
 *
 * @module testing/a11y
 */

/**
 * WCAG 2.1 Level A + AA rule tags — the default `axe-core` `runOnly` scope.
 * Matches the compliance bar `docs/` already documents for NL Design System
 * theming ("WCAG AA compliance" — see project CLAUDE.md). Callers can widen
 * or narrow via `options.tags`.
 *
 * @type {Readonly<string[]>}
 */
export const WCAG_AA_TAGS = Object.freeze(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])

/**
 * `Node.ELEMENT_NODE` — the only node type axe-core accepts as a context root.
 *
 * @type {number}
 */
const ELEMENT_NODE = 1

/**
 * Collect the real `Element` nodes a Vue 3 vnode tree actually rendered.
 *
 * WHY THIS EXISTS: under Vue 3, `wrapper.element` / `vm.$el` is NOT always an
 * element. When a component's root is a `<Teleport>` — which is how
 * `@nextcloud/vue` 9 renders `NcModal` and `NcDialog`, and therefore how
 * every dialog-rooted component in this library renders — Vue leaves an empty
 * anchor COMMENT node (`nodeType === 8`) at the original mount point and moves
 * the real markup to the teleport target (usually `document.body`). A
 * multi-root (fragment) component leaves a comment anchor for the same reason.
 *
 * Handing that comment to `axe.run()` fails with the thoroughly unhelpful
 * `No elements found for include in page Context`: no violations, no markup,
 * and no hint that the component rendered perfectly well a couple of nodes
 * away. Under Vue 2 this could not happen — there was no `<Teleport>`,
 * `NcModal` relocated its own element imperatively, and `$el` was always a
 * real element — so every consumer that scans a dialog only discovers this
 * when it migrates.
 *
 * So: walk the instance's vnode subtree and gather the elements it genuinely
 * produced, descending THROUGH the anchors. `component` is checked before
 * `el` because a component vnode's `el` is its subtree's el — which, for a
 * teleporting child, is the very anchor comment we are trying to see past.
 *
 * @param {object|Array} vnode A Vue 3 vnode, or array of them, to walk.
 * @param {Element[]} out Accumulator for the elements found.
 * @return {Element[]} The same accumulator, for convenience.
 */
function collectRenderedElements(vnode, out) {
	if (!vnode || typeof vnode !== 'object') {
		return out
	}
	if (Array.isArray(vnode)) {
		for (const child of vnode) {
			collectRenderedElements(child, out)
		}
		return out
	}
	if (vnode.component) {
		// Child component: descend into what it rendered, not its own vnode.el.
		return collectRenderedElements(vnode.component.subTree, out)
	}
	if (vnode.el && vnode.el.nodeType === ELEMENT_NODE) {
		out.push(vnode.el)
		return out
	}
	// Teleport / fragment / comment anchor — the real nodes are the children.
	return collectRenderedElements(vnode.children, out)
}

/**
 * Resolve the elements behind a mount result whose root node is an anchor
 * rather than an element.
 *
 * @param {object} instance The Vue 3 internal instance (`vm.$`).
 * @param {Node} fallback The raw root node to return when nothing is found.
 * @return {Element|object|Node} A single element, an axe `{ include }` context, or `fallback`.
 */
function resolveAnchoredRoot(instance, fallback) {
	const elements = instance ? collectRenderedElements(instance.subTree, []) : []
	if (elements.length === 1) {
		return elements[0]
	}
	if (elements.length > 1) {
		// Several roots (fragment, or a teleport plus in-place siblings). Scan
		// all of them rather than picking one — but as an explicit `include`
		// list, NOT by widening to `document.body`, which would drag unrelated
		// siblings of the teleport target into the result.
		return { include: elements }
	}
	// Nothing rendered at all: hand back the raw node so axe's own error
	// surfaces, rather than silently scanning nothing and "passing".
	return fallback
}

/**
 * Resolve an axe-core scan context from whatever the caller handed us.
 *
 * Accepts:
 *  - a Vue Test Utils wrapper (`.element` is the mounted root node)
 *  - a Vue instance (`.$el`)
 *  - a raw `Element` / `Document` / `DocumentFragment`
 *
 * When the root node is a Teleport/fragment anchor rather than an element,
 * the genuinely rendered elements are located instead — see
 * {@link collectRenderedElements}.
 *
 * @param {object|Element|Document} target The mount result or DOM node to resolve.
 * @return {Element|Document|object} The resolved axe-core context.
 * @throws {TypeError} When `target` is none of the above.
 */
function resolveNode(target) {
	if (target && typeof target === 'object') {
		// Note: deliberately NOT `target.element instanceof Object` — jsdom's
		// DOM nodes live in a different realm than this module's `Object`
		// under Jest's jsdom environment, so a real `instanceof` check
		// against THIS realm's `Object` is always false for them even
		// though the node is perfectly valid. `typeof .nodeType === 'number'`
		// is the reliable, realm-agnostic duck-type check.
		if (target.element && typeof target.element.nodeType === 'number') {
			// Vue Test Utils wrapper.
			return target.element.nodeType === ELEMENT_NODE
				? target.element
				: resolveAnchoredRoot(target.vm && target.vm.$, target.element)
		}
		if (target.$el && typeof target.$el.nodeType === 'number') {
			// Raw Vue instance.
			return target.$el.nodeType === ELEMENT_NODE
				? target.$el
				: resolveAnchoredRoot(target.$, target.$el)
		}
		if (typeof target.nodeType === 'number') {
			// Already a DOM node (Element, Document, DocumentFragment, ...).
			return target
		}
	}
	throw new TypeError(
		'expectAccessible(target): target must be a @vue/test-utils wrapper '
		+ '(with .element), a Vue instance (with .$el), or a DOM node — got '
		+ `${Object.prototype.toString.call(target)}.`,
	)
}

/**
 * Format axe-core violations into a readable multi-line message: one block
 * per rule, with its impact, help text, help URL, and every affected
 * selector — enough to fix the violation without re-running axe locally.
 *
 * @param {Array<object>} violations The `results.violations` array from `axe.run()`.
 * @return {string} A human-readable summary.
 */
function formatViolations(violations) {
	const blocks = violations.map((violation) => {
		const nodes = violation.nodes
			.map((node) => `    - ${node.target.join(' ')}${node.failureSummary ? `\n      ${node.failureSummary.replace(/\n/g, '\n      ')}` : ''}`)
			.join('\n')
		return `  [${violation.impact ?? 'unknown'}] ${violation.id} — ${violation.help}\n`
			+ `    ${violation.helpUrl}\n${nodes}`
	})
	return `expectAccessible: ${violations.length} axe-core violation(s):\n\n${blocks.join('\n\n')}`
}

/**
 * Run `axe-core` against a mounted component's DOM and assert zero
 * violations for the given (default: WCAG 2.1 A + AA) rule set.
 *
 * ```js
 * import { mount } from '@vue/test-utils'
 * import { expectAccessible } from '@conduction/nextcloud-vue/testing'
 * import MyComponent from '../src/components/MyComponent.vue'
 *
 * test('MyComponent has no WCAG 2.1 AA violations', async () => {
 *   const wrapper = mount(MyComponent, { propsData: { ... } })
 *   await expectAccessible(wrapper)
 * })
 * ```
 *
 * A genuinely upstream or false-positive rule can be excluded via
 * `options.excludeRules` — always pair an exclusion with a comment
 * explaining why (see `tests/a11y/*.a11y.spec.js` for examples); never
 * exclude a rule just to make a real violation go away.
 *
 * @param {object|Element|Document} target A @vue/test-utils wrapper, Vue instance, or DOM node.
 * @param {object} [options] Overrides for the axe-core run.
 * @param {string[]} [options.tags] `runOnly` tags — defaults to {@link WCAG_AA_TAGS}.
 * @param {string[]} [options.excludeRules] Rule IDs to disable, e.g. `['color-contrast']`
 *   when jsdom cannot compute real computed styles. Prefer a narrow, documented exclusion
 *   over widening `tags`.
 * @param {object} [options.axeOptions] Raw axe-core `RunOptions`, merged in last (escape hatch).
 * @return {Promise<object>} The full axe-core `results` object (for callers that want more than pass/fail).
 * @throws {Error} When one or more violations are found, with a formatted summary of each.
 */
export async function expectAccessible(target, options = {}) {
	// Deferred require: axe-core is an optional devDependency (see module
	// docblock) and this file is only ever reached from test code, never
	// from the production bundle — a top-level `import` would still be
	// fine bundle-wise (unreachable from src/index.js), but a deferred
	// require gives a clearer error message when a consumer imports this
	// helper without having installed axe-core themselves.
	let axe
	try {
		// eslint-disable-next-line global-require
		axe = require('axe-core')
	} catch (err) {
		throw new Error(
			'expectAccessible() requires the "axe-core" package. Add it to your '
			+ 'devDependencies (`npm install --save-dev axe-core`) — it is an '
			+ 'optional peerDependency of @conduction/nextcloud-vue, never a '
			+ 'transitive install.',
		)
	}

	const node = resolveNode(target)
	const { tags = WCAG_AA_TAGS, excludeRules = [], axeOptions = {} } = options

	const runOptions = {
		runOnly: { type: 'tag', values: tags },
		...axeOptions,
	}
	if (excludeRules.length > 0) {
		runOptions.rules = {
			...(runOptions.rules ?? {}),
			...Object.fromEntries(excludeRules.map((ruleId) => [ruleId, { enabled: false }])),
		}
	}

	const results = await axe.run(node, runOptions)

	if (results.violations.length > 0) {
		throw new Error(formatViolations(results.violations))
	}

	return results
}
