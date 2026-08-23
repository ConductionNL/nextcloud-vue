/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Mount-one-component mechanics for the `check:smoke` lane, kept out of the
 * spec so the spec reads as the contract and this reads as the plumbing.
 */

const { mount } = require('@vue/test-utils')
const { synthProps } = require('./propSynth.js')

/**
 * Console output that is NOISE rather than a finding, with the reason.
 *
 * Kept deliberately short. Every pattern here is a hole in what the lane can
 * see, so a new entry needs to be about the HARNESS (an unimplemented jsdom
 * API, a stub's known limitation) and never about a component's own behaviour
 * — that is what the baseline is for. The two are different: an ignore pattern
 * hides a class of message for every component forever; a baseline entry
 * records one known-broken component and demands it be fixed.
 */
const IGNORE_PATTERNS = [
	// jsdom implements no navigation; components that build a link and then
	// read `window.location` during setup log this. Harness gap, not a defect.
	{ re: /Not implemented: navigation/i, why: 'jsdom has no navigation' },
	// The five components in realNextcloudVue.js's STUBBED_COMPONENT_NAMES
	// render as passthrough stubs; a parent asking one for a ref or a method it
	// does not have is a limitation of the stub, not of the parent.
	{ re: /\[Vue warn\]: Failed to resolve component: (NcAvatar|NcRichText|NcRichContenteditable|NcDashboardWidget|NcDashboardWidgetItem)\b/, why: 'ESM-only, stubbed — see realNextcloudVue.js' },
	// Vue Flow measures its container and reads the stylesheet at mount. jsdom
	// computes no layout, so the container is always 0x0, and the smoke lane
	// loads the ESM modules WITHOUT `dist/nextcloud-vue.css`, so the stylesheet
	// is genuinely absent here.
	//
	// VERIFIED before ignoring, rather than assumed: `dist/nextcloud-vue.css`
	// carries 100 `vue-flow__` rules, so a real consumer importing the library's
	// CSS does get them. Both warnings are this lane describing itself.
	{ re: /\[Vue Flow\]: (The Vue Flow parent container needs a width and a height|It seems that you haven't loaded the necessary styles)/, why: 'jsdom has no layout and the smoke lane loads no CSS — verified the rules DO ship in dist/nextcloud-vue.css' },
	// Vue's own advisory when a test mounts a component that expects to be a
	// route child. The sweep stubs router-view/router-link, so this is the
	// harness speaking, not the component.
	{ re: /Failed to resolve component: router-(view|link)/, why: 'router not installed in the sweep' },
	// There is no backend behind this lane — `@nextcloud/axios` is mocked and
	// resolves nothing useful — so every component that fetches in `mounted()`
	// correctly reports the failure. Eleven components do, and each is behaving
	// exactly as designed.
	//
	// The cost of this pattern is real and worth stating: it also hides a
	// GENUINE defect in a fetch path, because from out here "the request failed
	// because there is no server" and "the request failed because the component
	// built a bad URL" produce the same line. Fetch-path correctness therefore
	// belongs in a per-component spec with a mocked axios that asserts the
	// request, not in this lane. What this lane still guarantees for these
	// eleven is that they MOUNT and RENDER against the real component tree with
	// their error branch taken, which is the branch a user hits on a flaky
	// connection and the one least likely to be covered elsewhere.
	{ re: /(failed to fetch|fetch .*failed|search failed|failed to load|error fetching)/i, why: 'no backend in this lane — see the note in IGNORE_PATTERNS' },
	// Deliberate deprecation notices. The library's own convention is to
	// deprecate by warning rather than removing (see CLAUDE.md, "Rules for
	// Modifying Components"), so a component that warns here is OBEYING the
	// rule. Failing the lane for it would make the convention unusable.
	{ re: /is deprecated( and will be removed)?|deprecated;/i, why: 'deprecation notices are intended behaviour' },
	// The sweep mounts every component standalone, so anything that expects an
	// `NcContent` ancestor says so. Scoped to that ONE message deliberately:
	// NcAppNavigation's OTHER warning — the missing `ariaLabel` — is a real
	// accessibility finding and must keep failing.
	{ re: /is not mounted inside NcContent/, why: 'components are mounted standalone here' },
]

/**
 * Whether a captured message should be ignored.
 *
 * @param {string} msg The console message.
 * @return {boolean} True when the message is harness noise.
 */
function isIgnorable(msg) {
	return IGNORE_PATTERNS.some((p) => p.re.test(msg))
}

/**
 * Mount one component and report what the console said.
 *
 * Captures `console.warn` and `console.error` because that is where BOTH Vue's
 * own diagnostics (`[Vue warn]: ...`, including the render-time errors that do
 * not throw) and a component's deliberate error logging surface. A component
 * that renders but warns is not clean: in Vue 3 a warning is how removed Vue 2
 * APIs, bad prop types and unresolved children announce themselves, which is
 * exactly the class of defect a Vue 2 -> 3 migration leaves behind.
 *
 * `empty` reports that the component rendered no markup at all. That is NOT a
 * failure — plenty of components legitimately render nothing until configured
 * (`CnPageRenderer` with no matching route) — but it IS a limit on what the
 * sweep proved. A component whose root carries `v-if="totalPages > 1 || ..."`
 * (e.g. `CnPagination`) renders an empty tree under minimal props, so its
 * internals are never evaluated and it passes trivially. The real `_uid` defect
 * in `CnPagination`'s `pageSizeId` computed is invisible here for exactly this
 * reason. Counting these keeps the lane from overstating its own coverage.
 *
 * @param {string} name The component's registered name.
 * @param {object} Component The component definition.
 * @return {{ok: boolean, messages: Array<string>, threw: string|null, empty: boolean}} Outcome.
 */
async function mountOnce(name, Component) {
	const messages = []
	const capture = (m) => {
		const s = typeof m === 'string' ? m : String(m && m.message ? m.message : m)
		if (!isIgnorable(s)) messages.push(s.split('\n')[0].trim())
	}

	const spyWarn = jest.spyOn(console, 'warn').mockImplementation(capture)
	const spyErr = jest.spyOn(console, 'error').mockImplementation(capture)

	// Attached to `document`, not mounted detached. Components that hand their
	// root element to a library which then measures or walks it need to be IN
	// the document: Leaflet throws a bare "Map container not found." from
	// CnMapWidget's mounted hook otherwise. Same reason
	// `tests/a11y/support/mountAttached.js` exists for the a11y lane; done
	// inline here because this lane also has to own the error handling below.
	const container = document.createElement('div')
	document.body.appendChild(container)
	// Anything that appears in <body> beyond these is content this component
	// TELEPORTED out of its own tree — which is what NcDialog and NcModal do, so
	// it covers most of the library's dialogs. Without accounting for it, every
	// dialog looks like it rendered nothing (`wrapper.html()` is empty because
	// the markup left the wrapper) and the empty-render count is meaningless: it
	// read 49 of 233 while those components were in fact rendering fine.
	const preexisting = new Set(Array.from(document.body.children))

	let threw = null
	let wrapper = null
	let empty = false
	try {
		wrapper = mount(Component, {
			attachTo: container,
			props: synthProps(name, Component),
			global: {
				// Vue routes a throw from a lifecycle hook to `errorHandler` and
				// only falls back to logging when none is set. Setting it matters
				// for more than tidiness: a hook that throws AFTER its microtask
				// (an `await`ed init, a leaflet callback) escapes the try/catch
				// around `mount()` entirely, and without a handler Node treats it
				// as an uncaught exception and kills the worker mid-run — one
				// component's defect then looks like the whole lane exploding.
				config: {
					errorHandler: (err) => capture(err),
					warnHandler: (msg) => capture('[Vue warn]: ' + msg),
				},
				stubs: {
					'router-view': { template: '<div />' },
					'router-link': { template: '<a><slot /></a>' },
				},
				mocks: {
					$route: { name: 'smoke', params: {}, query: {}, path: '/' },
					$router: { push() {}, replace() {}, resolve: () => ({ href: '/' }) },
				},
				// The manifest-renderer family (CnPageRenderer, CnAppNav, ...)
				// normally receives these from a CnAppRoot ancestor via provide.
				// Mounted standalone they inject the declared defaults and then
				// correctly report that they have nothing to render. Supplying a
				// one-page manifest whose id matches the mocked `$route.name`
				// puts them on their real render path instead of their
				// nothing-to-do path, which is the point of the sweep.
				provide: {
					cnManifest: {
						version: '1.0.0',
						menu: [],
						pages: [{ id: 'smoke', route: '/', type: 'custom', title: 'Smoke', component: 'Smoke' }],
					},
					cnCustomComponents: { Smoke: { template: '<div />' } },
					cnTranslate: (key) => key,
				},
			},
		})
		// Let async mounted hooks settle before judging the component clean.
		// Without this the sweep reports a pass for anything that fails one tick
		// after mount, which is most things that talk to a store or an API.
		await Promise.resolve()
		await new Promise((resolve) => setTimeout(resolve, 0))
		// A component whose root `v-if` is false renders as an HTML COMMENT
		// placeholder (`<!--v-if-->`), not as an empty string — so stripping
		// comments is what makes this measure the thing it claims to. Without it
		// the count reads 1 instead of the real figure, and `CnPagination` (root
		// `v-if="totalPages > 1 || ..."`) looks exercised when it rendered
		// nothing at all.
		const strip = (s) => String(s || '').replace(/<!--[\s\S]*?-->/g, '').trim()
		// `wrapper.html()`, NOT `container.innerHTML`: the container holds Vue
		// Test Utils' own `<div data-v-app="">` host element, which is never empty
		// and would make every component look exercised (measured: 0 of 233).
		const own = strip(wrapper.html())
		const teleported = Array.from(document.body.children)
			.filter((el) => el !== container && !preexisting.has(el))
			.map((el) => strip(el.innerHTML))
			.join('')
		empty = own === '' && teleported === ''
	} catch (e) {
		threw = String(e && e.message ? e.message : e).split('\n')[0].trim()
	} finally {
		try {
			if (wrapper) wrapper.unmount()
		} catch (e) {
			// An unmount failure is a real defect too, but attribute it clearly
			// rather than letting it masquerade as a mount failure.
			if (!threw) threw = 'unmount: ' + String(e && e.message ? e.message : e).split('\n')[0].trim()
		}
		container.remove()
		spyWarn.mockRestore()
		spyErr.mockRestore()
	}

	return { ok: threw === null && messages.length === 0, messages, threw, empty }
}

/**
 * The library's `Cn*` component exports, in stable alphabetical order.
 *
 * Reads the public barrel rather than the filesystem on purpose: the barrel is
 * the API consumers actually get, so a component that exists on disk but is
 * not exported is correctly out of scope, and one that is exported but broken
 * is correctly in scope.
 *
 * @param {object} barrel The `src/index.js` module.
 * @return {Array<[string, object]>} `[name, Component]` pairs.
 */
function componentExports(barrel) {
	return Object.keys(barrel)
		.filter((k) => /^Cn[A-Z]/.test(k))
		.filter((k) => {
			const v = barrel[k]
			// A component definition is an object (SFCs compile to one) or a
			// function (defineAsyncComponent / functional). Anything else that
			// happens to be Cn-prefixed is not a component.
			return v && (typeof v === 'object' || typeof v === 'function')
		})
		.sort()
		.map((k) => [k, barrel[k]])
}

module.exports = { mountOnce, componentExports, IGNORE_PATTERNS }
