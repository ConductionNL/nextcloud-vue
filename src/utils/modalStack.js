/**
 * Modal stacking order — the layer every open `.modal-mask` sits on.
 *
 * THE BUG THIS FIXES
 * ------------------
 * `@nextcloud/vue` v9 gives every `NcModal` mask the SAME layer: its scoped
 * stylesheet carries a flat `.modal-mask { z-index: 9998 }`, and `NcDialog`
 * renders an `NcModal` so it inherits that constant too. This library then
 * shipped an unscoped `.modal-mask.dialog__modal { z-index: 10005 !important }`
 * override, which flattened things further — the `!important` beat anything a
 * consumer could set, so EVERY open dialog in an app landed on exactly 10005.
 *
 * Equal `z-index` means the painting order falls back to DOM order, and
 * `NcModal` teleports its mask to `<body>`, so "which dialog is on top" became
 * a mount-timing race. The mask is `position: fixed` at 100% × 100% and the
 * dialog content is its descendant, so the loser of that race has its ENTIRE
 * subtree painted under the other dialog's full-viewport mask — every click
 * aimed at the top dialog is swallowed by the one underneath.
 *
 * Measured live in OpenBuild: the "Create application" wizard and the nested
 * "Generate an app with AI" dialog were both open and both visible, and every
 * click aimed at the AI dialog was received by the wizard's own
 * `#wizard-app-description` textarea. Teleporting the inner dialog to `<body>`
 * does not help — both masks are already there; the tie is the problem, not the
 * teleport target.
 *
 * THE FIX
 * -------
 * Keep one shared stack of open masks. Each mask that enters the DOM takes the
 * next layer strictly ABOVE the current top; each mask that leaves releases its
 * layer. The stacking order then follows OPEN ORDER (wall-clock insertion),
 * which is what users mean by "the topmost dialog", and no longer depends on
 * where in `<body>` Vue happened to put the teleported node.
 *
 * The layer is written as an INLINE `z-index`, which beats `@nextcloud/vue`'s
 * scoped rule (inline styles outrank any non-`!important` declaration). The
 * unscoped baseline in `src/css/patches.css` is deliberately NOT `!important`
 * for the same reason.
 *
 * WHY A `MutationObserver` AND NOT A PROP
 * ---------------------------------------
 * The dialogs that collide are not all ours. The OpenBuild wizard is
 * `CnWizardDialog` (this library) but the AI dialog is an `NcDialog` written in
 * the consuming app, and `@nextcloud/vue` exposes no z-index prop. A per-component
 * opt-in would therefore fix half of any given collision. Watching the DOM for
 * `.modal-mask` insertions covers every modal in the app — ours, the consumer's,
 * and `@nextcloud/vue`'s own internal ones — with no call sites to keep in sync.
 *
 * Usage: `CnAppRoot` installs this on mount, so manifest-driven apps get it for
 * free. Apps that do not mount `CnAppRoot` should call `installModalStack()`
 * once from `main.js`.
 */

/**
 * Layer of the first (bottom-most) open modal is `BASE + STEP`, i.e. 10005 —
 * the value the old unscoped override hardcoded. Preserving it keeps
 * single-dialog apps pixel-identical to before this fix.
 *
 * @type {number}
 */
export const MODAL_STACK_BASE_Z_INDEX = 10000

/**
 * Gap between adjacent modal layers. Small enough to stay clear of the 2^31
 * ceiling under any realistic nesting depth, large enough that a consumer can
 * slot something (a popover, a tooltip) between two dialogs if it must.
 *
 * @type {number}
 */
export const MODAL_STACK_STEP = 5

/** CSS selector for the element `NcModal` puts its mask class on. */
const MASK_SELECTOR = '.modal-mask'

/**
 * Open layers, oldest first. Entries are `{ token, zIndex }`; `token`
 * identifies a layer for release without depending on its position, so a modal
 * can close out of order (inner before outer, or outer before inner) without
 * disturbing the rest of the stack.
 *
 * @type {Array<{ token: number, zIndex: number }>}
 */
const stack = []

/** Monotonic token source; reset to 1 whenever the stack drains. */
let nextToken = 1

/** Live `MutationObserver`, or `null` when not installed. */
let observer = null

/**
 * How many callers currently want the binder alive.
 *
 * Reference-counted because app roots nest: OpenBuild's BuilderHost renders a
 * second `CnAppRoot` for the app being previewed, so the inner shell unmounting
 * must NOT tear down the stack the outer shell is still relying on.
 *
 * @type {number}
 */
let owners = 0

/**
 * Masks we have assigned a layer to, mapped to that layer. A `Map` (not a
 * `WeakMap`) because `uninstallModalStack()` has to walk it to release tokens.
 *
 * @type {Map<Element, { token: number, zIndex: number }>}
 */
const trackedMasks = new Map()

/**
 * How many modals currently hold a layer.
 *
 * @return {number} Stack depth; `0` when no modal is open.
 */
export function modalStackDepth() {
	return stack.length
}

/**
 * Layer of the top-most open modal, or the base when nothing is open.
 *
 * @return {number} A CSS `z-index` value.
 */
export function topModalZIndex() {
	return stack.length === 0
		? MODAL_STACK_BASE_Z_INDEX
		: stack[stack.length - 1].zIndex
}

/**
 * Take the next layer above the current top.
 *
 * Derived from `topModalZIndex()` rather than from a monotonic counter, so the
 * numbers come back down as modals close: open → open → close → close leaves
 * the stack empty and the next modal opens at the base layer again. Nothing
 * drifts upward over a long session.
 *
 * @return {{ token: number, zIndex: number }} The acquired layer.
 */
export function acquireModalLayer() {
	const layer = {
		token: nextToken++,
		zIndex: topModalZIndex() + MODAL_STACK_STEP,
	}
	stack.push(layer)
	return { ...layer }
}

/**
 * Release a previously acquired layer.
 *
 * @param {number} token Token from {@link acquireModalLayer}.
 * @return {boolean} `true` when a layer was released, `false` when the token
 *   was unknown (already released, or never acquired).
 */
export function releaseModalLayer(token) {
	const index = stack.findIndex((layer) => layer.token === token)
	if (index === -1) {
		return false
	}
	stack.splice(index, 1)
	if (stack.length === 0) {
		nextToken = 1
	}
	return true
}

/**
 * Hard reset: disconnect the binder regardless of how many owners it has, drop
 * every layer, and forget every tracked mask. Ignores the reference count, so
 * unlike {@link uninstallModalStack} one call always tears down.
 *
 * Intended for test teardown and for shutdown paths that have already discarded
 * every mask element. Does not touch the DOM.
 *
 * @return {void}
 */
export function resetModalStack() {
	if (observer) {
		observer.disconnect()
		observer = null
	}
	owners = 0
	stack.length = 0
	trackedMasks.clear()
	nextToken = 1
}

/**
 * Collect the mask elements introduced (or taken away) by a mutated node: the
 * node itself when it is a mask, plus any masks nested inside it.
 *
 * @param {Node} node A node from a `MutationRecord`'s added/removed list.
 * @return {Element[]} Zero or more mask elements.
 */
function masksIn(node) {
	if (!node || node.nodeType !== 1) {
		return []
	}
	const element = /** @type {Element} */ (node)
	const found = element.classList?.contains('modal-mask') ? [element] : []
	// Masks are teleported straight to <body>, so the nested case only arises
	// when a consumer passes NcModal a `container`. Guarded on child count so
	// the common "a text node moved" mutation costs nothing.
	if (element.childElementCount > 0) {
		found.push(...element.querySelectorAll(MASK_SELECTOR))
	}
	return found
}

/**
 * Give a mask that just entered the DOM its layer.
 *
 * Re-entry is treated as a move, not a new modal: Vue relocates teleported
 * nodes (and transition wrappers re-append them), which shows up as a
 * remove+add pair. Re-assigning would hand the OUTER dialog a fresh layer above
 * its own child and put the original bug straight back, so a mask we already
 * track keeps the layer it has.
 *
 * @param {Element} mask A `.modal-mask` element.
 * @return {void}
 */
function assignLayer(mask) {
	const existing = trackedMasks.get(mask)
	if (existing) {
		mask.style.zIndex = String(existing.zIndex)
		return
	}
	const layer = acquireModalLayer()
	trackedMasks.set(mask, layer)
	mask.style.zIndex = String(layer.zIndex)
}

/**
 * Release the layer of a mask that just left the DOM.
 *
 * A `MutationObserver` callback runs after the DOM has settled, so a node that
 * is still reachable from its document was MOVED rather than removed — keep its
 * layer in that case.
 *
 * @param {Element} mask A `.modal-mask` element.
 * @return {void}
 */
function releaseLayerFor(mask) {
	const layer = trackedMasks.get(mask)
	if (!layer) {
		return
	}
	if (mask.ownerDocument?.contains(mask)) {
		return
	}
	trackedMasks.delete(mask)
	releaseModalLayer(layer.token)
}

/**
 * Handle one batch of mutations. Removals are processed before additions within
 * each record so a close-then-open in the same tick frees its layer first and
 * the replacement does not stack needlessly high.
 *
 * @param {MutationRecord[]} records Batch from the observer.
 * @return {void}
 */
function onMutations(records) {
	for (const record of records) {
		for (const node of record.removedNodes) {
			masksIn(node).forEach(releaseLayerFor)
		}
		for (const node of record.addedNodes) {
			masksIn(node).forEach(assignLayer)
		}
	}
}

/**
 * Whether the DOM binder is currently active.
 *
 * @return {boolean} `true` when {@link installModalStack} is in effect.
 */
export function isModalStackInstalled() {
	return observer !== null
}

/**
 * Give up one owner's claim on the binder.
 *
 * The binder only actually stops once the LAST owner releases it — app roots
 * nest, and an inner `CnAppRoot` unmounting must not blind the outer one.
 *
 * Inline `z-index` values already written are deliberately LEFT in place when it
 * does stop: stripping the layer off a mask that is still on screen would drop
 * it back under whatever it was covering.
 *
 * @return {void}
 */
export function uninstallModalStack() {
	if (owners > 0) {
		owners -= 1
	}
	if (owners > 0) {
		return
	}
	if (observer) {
		observer.disconnect()
		observer = null
	}
	for (const layer of trackedMasks.values()) {
		releaseModalLayer(layer.token)
	}
	trackedMasks.clear()
}

/**
 * Start assigning stacking layers to `.modal-mask` elements.
 *
 * Idempotent in effect — a second call while already installed does not add a
 * second observer or double-count masks, so it is safe for both `CnAppRoot` and
 * a consumer's `main.js` to call it. It does register a second OWNER, so the
 * binder survives until every caller has released it.
 *
 * @param {Element} [root] Subtree to watch. Defaults to `document.body`, which
 *   is where `NcModal` teleports to.
 * @return {() => void} Release function ({@link uninstallModalStack}).
 */
export function installModalStack(root) {
	if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
		return () => {}
	}
	const target = root || document.body
	if (!target) {
		return () => {}
	}
	owners += 1
	if (observer) {
		return uninstallModalStack
	}
	observer = new MutationObserver(onMutations)
	observer.observe(target, { childList: true, subtree: true })
	// Adopt masks that were already open when we were installed, in document
	// order — the best available proxy for open order at this point.
	target.querySelectorAll(MASK_SELECTOR).forEach(assignLayer)
	return uninstallModalStack
}
