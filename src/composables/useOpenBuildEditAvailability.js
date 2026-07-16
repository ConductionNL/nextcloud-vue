import { useAppStatus } from './useAppStatus.js'

/**
 * Reactive "may this user edit via OpenBuild?" signal.
 *
 * Gating is deliberately simple (ADR-041): the OpenBuild edit button shows
 * whenever the OpenBuild app is enabled and reachable for the current user.
 * `useAppStatus('openbuild').enabled` already answers that — it reads
 * `OC.appswebroots`, which Nextcloud populates only with apps the current user
 * may access (so app group-restrictions are honoured for free). No per-user
 * role or permission HTTP request is made.
 *
 * @return {{ available: import('vue').Ref<boolean> }} `available` is the
 *   reactive enabled flag for the `openbuild` app.
 *
 * @example
 * const { available } = useOpenBuildEditAvailability()
 * // <CnOpenBuildEditButton :available="available" ... />
 */
export function useOpenBuildEditAvailability() {
	const { enabled } = useAppStatus('openbuild')
	return { available: enabled }
}
