import { useAppStatus } from './useAppStatus.js'

/**
 * Reactive "may this user edit via Buildiq?" signal.
 *
 * Gating is deliberately simple (ADR-041): the Buildiq edit button shows
 * whenever the Buildiq app is enabled and reachable for the current user.
 * `useAppStatus('openbuild').enabled` already answers that — it reads
 * `OC.appswebroots`, which Nextcloud populates only with apps the current user
 * may access (so app group-restrictions are honoured for free). No per-user
 * role or permission HTTP request is made. The `openbuild` app id is
 * unchanged by the 2026-08-21 rename, so the lookup key stays as it is.
 *
 * @return {{ available: import('vue').Ref<boolean> }} `available` is the
 *   reactive enabled flag for the `openbuild` app.
 *
 * @example
 * const { available } = useBuildiqEditAvailability()
 * // <CnBuildiqEditButton :available="available" ... />
 */
export function useBuildiqEditAvailability() {
	const { enabled } = useAppStatus('openbuild')
	return { available: enabled }
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
