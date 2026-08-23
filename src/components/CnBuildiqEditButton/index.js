import CnBuildiqEditButton from './CnBuildiqEditButton.vue'

export default CnBuildiqEditButton
export { CnBuildiqEditButton }

/**
 * Deprecated alias kept for consumers.
 *
 * The app formerly called OpenBuild was renamed to Buildiq in the fleet-wide
 * rename of 2026-08-21, so `CnBuildiqEditButton` is the canonical name. This
 * library is consumed by ~18 apps that still import `CnOpenBuildEditButton`,
 * so the old name is re-exported as the same implementation rather than
 * removed. Migrate to `CnBuildiqEditButton`.
 *
 * @deprecated Use `CnBuildiqEditButton`.
 */
export { default as CnOpenBuildEditButton } from './CnBuildiqEditButton.vue'
