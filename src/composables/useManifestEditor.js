import { ref, computed, reactive } from 'vue'
import { diffManifest } from '../utils/diffManifest.js'

/**
 * Non-enumerable marker set on a manifest object once it has been upgraded to
 * deep-reactive, so a repeated upgrade is a cheap no-op.
 */
const REACTIVE_UPGRADE_MARKER = '__cnReactiveUpgraded'

/**
 * Upgrade a manifest object to Vue-2.7 deep reactivity **in place**.
 *
 * manifest-shallow-reactivity-by-default: `useAppManifest` now returns the
 * manifest via `shallowRef`, so the object graph is NOT deep-observed on boot
 * (the common, read-only case pays nothing). In-app editing (ADR-041) still
 * requires deep reactivity so that mutating a nested property of the live
 * manifest re-renders the descendants that hold it. Vue 2.7's Composition-API
 * `reactive()` converts an existing plain object's properties to getter/setter
 * pairs IN PLACE and returns the SAME reference (classic Vue 2
 * `Object.defineProperty` semantics — verified against vue@2.7.16), so
 * already-mounted `provide`/`inject` consumers observe the change without a
 * remount. This is why the manifest must NOT be `markRaw`'d — `markRaw`
 * (`__v_skip`) makes `reactive()` a silent no-op, which would break live edits.
 *
 * Idempotent: guarded by a non-enumerable marker (Vue 2's own `__ob__` check
 * already makes a repeat call a no-op, but the explicit marker is cheaper to
 * reason about and test).
 *
 * @param {object} manifestObj The live manifest object to make deep-reactive.
 * @return {object} The same object reference, now deep-reactive.
 */
export function upgradeManifestToEditable(manifestObj) {
	if (!manifestObj || typeof manifestObj !== 'object') return manifestObj
	if (manifestObj[REACTIVE_UPGRADE_MARKER]) return manifestObj
	// Vue 2.7: converts in place, same reference, no clone.
	reactive(manifestObj)
	Object.defineProperty(manifestObj, REACTIVE_UPGRADE_MARKER, {
		value: true,
		enumerable: false,
		configurable: true,
	})
	return manifestObj
}

/**
 * Edit-mode state machine for in-app manifest editing (ADR-041).
 *
 * Edits are applied IN PLACE to the live manifest (`baseRef.value`) while a
 * pristine `snapshot` is kept for the diff baseline and for Cancel. This is
 * deliberate: Vue 2 `inject` captures the provided `cnManifest` value once at a
 * descendant's creation, so swapping in a *separate* working-copy object would
 * never reach already-mounted renderers (CnPageRenderer, CnAppNav, …). Mutating
 * the object they already hold is what makes edits appear live.
 *
 * The manifest may arrive **shallow/raw** (manifest-shallow-reactivity-by-
 * default): `useAppManifest` no longer deep-observes it on boot. `enter()` is
 * therefore responsible for ensuring the live manifest is deep-reactive
 * (`upgradeManifestToEditable`) before edits begin, as a belt-and-suspenders
 * fallback to `CnAppRoot`'s availability-gated upgrade (in case OpenBuild
 * availability resolves after mount).
 *
 * On Save the minimal delta is computed via `diffManifest(snapshot, live)` and
 * handed to the injected `persist` function (the library does not own the
 * persistence endpoint, per ADR-041); the snapshot is then re-baselined. Cancel
 * restores the live manifest from the snapshot in place.
 *
 * `working` is the object the grid and edit modals mutate — the live manifest
 * while editing, `null` otherwise. `source` is always the live manifest.
 *
 * @param {import('vue').Ref<object>} baseRef A ref holding the active manifest
 *   (the object descendants render — e.g. CnAppRoot's manifest ref).
 * @param {object} [options] Configuration.
 * @param {(delta: object) => (void|Promise<void>)} [options.persist] Called with
 *   the computed delta on Save; may be async. A throw aborts the save (edits and
 *   editing state are preserved so the user can retry or cancel).
 * @return {{
 *   editing: import('vue').Ref<boolean>,
 *   working: import('vue').ComputedRef<object|null>,
 *   dirty: import('vue').ComputedRef<boolean>,
 *   source: import('vue').ComputedRef<object>,
 *   snapshot: import('vue').Ref<object|null>,
 *   enter: () => void,
 *   cancel: () => void,
 *   save: () => Promise<object>,
 * }}
 */
export function useManifestEditor(baseRef, options = {}) {
	const editing = ref(false)
	const snapshot = ref(null)

	const dirty = computed(() => {
		if (!editing.value || snapshot.value == null) return false
		return stableStringify(baseRef.value) !== stableStringify(snapshot.value)
	})

	// The live manifest is always the rendered source; edits mutate it in place.
	const source = computed(() => baseRef.value)
	// What the modals/grid mutate — the live manifest while editing.
	const working = computed(() => (editing.value ? baseRef.value : null))

	/** Enter edit mode: snapshot the live manifest for diff + cancel. */
	function enter() {
		// Fallback upgrade: ensure the live manifest is deep-reactive before
		// edits begin, in case OpenBuild availability resolved after CnAppRoot's
		// gated upgrade watch already ran (manifest-shallow-reactivity-by-default).
		upgradeManifestToEditable(baseRef.value)
		snapshot.value = deepClone(baseRef.value)
		editing.value = true
	}

	/** Restore the live manifest from the snapshot (in place) and leave edit mode. */
	function cancel() {
		if (snapshot.value && baseRef.value) restoreInPlace(baseRef.value, snapshot.value)
		snapshot.value = null
		editing.value = false
	}

	/**
	 * Compute the delta from the snapshot to the live manifest, hand it to the
	 * injected persist function, then re-baseline the snapshot. A persist throw
	 * aborts: edits and editing state are preserved so the user can retry/cancel.
	 *
	 * @return {Promise<object>} The delta that was saved.
	 */
	async function save() {
		const delta = diffManifest(snapshot.value ?? baseRef.value, baseRef.value)
		// A no-op save (nothing changed since enter()) yields an empty delta.
		// Skip persistence entirely — a persistence backend may reject `{}`
		// (e.g. OpenRegister forbids an empty object for an object property),
		// and there is nothing to store anyway.
		const isEmptyDelta = !delta || (typeof delta === 'object' && Object.keys(delta).length === 0)
		if (isEmptyDelta === false && typeof options.persist === 'function') {
			await options.persist(delta)
		}
		snapshot.value = deepClone(baseRef.value)
		editing.value = false
		return delta
	}

	return { editing, working, dirty, source, snapshot, enter, cancel, save }
}

/**
 * Restore `target`'s contents from `snap` by mutating in place (so the object
 * identity descendants hold is preserved and the revert is reactive). Keys
 * present in the snapshot are replaced; keys added during editing are removed.
 *
 * @param {object} target The live manifest object to restore.
 * @param {object} snap The pristine snapshot to restore from.
 */
function restoreInPlace(target, snap) {
	for (const key of Object.keys(target)) {
		if (!(key in snap)) delete target[key]
	}
	for (const key of Object.keys(snap)) {
		target[key] = deepClone(snap[key])
	}
}

/**
 * structuredClone with a JSON fallback (manifests are plain JSON, no cycles).
 * @param {*} value The value to deep-clone.
 * @return {*} A deep copy of the value.
 */
function deepClone(value) {
	if (value == null) return value
	if (typeof structuredClone === 'function') return structuredClone(value)
	return JSON.parse(JSON.stringify(value))
}

/**
 * Stable JSON for equality — manifests are plain JSON, so this is sufficient.
 * @param {*} value The value to serialise.
 * @return {string} The JSON string form used for equality comparison.
 */
function stableStringify(value) {
	return JSON.stringify(value)
}
