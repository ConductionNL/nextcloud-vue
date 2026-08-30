import { computed } from 'vue'
import { useAppStatus } from './useAppStatus.js'

/**
 * Reactive "may this user edit via Buildiq?" signal.
 *
 * Gating is deliberately simple (ADR-041): the Buildiq edit button shows
 * whenever the Buildiq app is enabled and reachable for the current user.
 * `useAppStatus(...).enabled` already answers that — it reads
 * `OC.appswebroots`, which Nextcloud populates only with apps the current user
 * may access (so app group-restrictions are honoured for free). No per-user
 * role or permission HTTP request is made.
 *
 * TWO KEYS, ON PURPOSE. `OC.appswebroots` is keyed by the Nextcloud app id,
 * and that id moved from `openbuild` to `buildiq` when the app shipped
 * `<id>buildiq</id>`. A single-key lookup on the stale name is a SILENT
 * no-op: the map simply has no such key, `available` stays false, and the
 * button renders nothing with no error anywhere — which is exactly how it
 * disappeared from every host app at once. Checking both keys keeps the
 * button working on installs that have taken the rename and on those still
 * serving the old id. Drop the `openbuild` fallback once no supported install
 * ships the old app id.
 *
 * The legacy key is consulted only when the current one misses. `useAppStatus`
 * is a synchronous, per-`appId`-cached lookup with no lifecycle hooks, so
 * calling it lazily inside the computed is safe — and a miss falls through to
 * `getCapabilities()`, which the app-availability guard's tests assert is never
 * reached when the shell short-circuits via `appswebroots`.
 *
 * @return {{ available: import('vue').Ref<boolean> }} `available` is true when
 *   either app id is enabled for the current user.
 *
 * @example
 * const { available } = useBuildiqEditAvailability()
 * // <CnBuildiqEditButton :available="available" ... />
 */
export function useBuildiqEditAvailability() {
	const available = computed(() =>
		useAppStatus('buildiq').enabled.value || useAppStatus('openbuild').enabled.value,
	)

	return { available }
}

/**
 * Deprecated alias kept for consumers.
 *
 * The app formerly called OpenBuild was renamed to Buildiq in the fleet-wide
 * rename of 2026-08-21, so `useBuildiqEditAvailability` is the canonical name.
 * This library is consumed by ~18 apps that still call
 * `useOpenBuildEditAvailability`, so the old name stays exported as the same
 * function rather than removed. Migrate to `useBuildiqEditAvailability`.
 *
 * @deprecated Use `useBuildiqEditAvailability`.
 */
export const useOpenBuildEditAvailability = useBuildiqEditAvailability
