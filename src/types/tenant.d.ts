/**
 * Type definitions for the multi-tenancy composable.
 *
 * Spec: openspec/changes/multi-tenancy-context — REQ-MT-1..5.
 */

import type { Ref } from 'vue'
import type { TOrganisation } from './organisation'

/**
 * Payload emitted on every `tenantSwitch` event.
 */
export interface TenantSwitchEvent {
	previousUuid: string | null
	uuid: string | null
	organisation: TOrganisation | null
}

/**
 * Subscribe-callback signature.
 */
export type TenantSwitchListener = (event: TenantSwitchEvent) => void

/**
 * Unsubscribe handle returned by `onTenantSwitch`.
 */
export type TenantSwitchUnsubscribe = () => void

/**
 * Raw event-bus shape exposed alongside the convenience helpers.
 */
export interface TenantSwitchBus {
	on(cb: TenantSwitchListener): TenantSwitchUnsubscribe
	off(cb: TenantSwitchListener): void
	emit(payload: TenantSwitchEvent): void
}

/**
 * Public shape of the tenant context (provided + injected).
 */
export interface TenantContext {
	activeOrganisationUuid: Ref<string | null>
	activeOrganisation: Ref<TOrganisation | null>
	setActiveTenant: (
		uuidOrPayload: string | { uuid: string | null; organisation?: TOrganisation | null } | null,
		organisation?: TOrganisation | null,
	) => void
	onTenantSwitch: (cb: TenantSwitchListener) => TenantSwitchUnsubscribe
	tenantSwitch: TenantSwitchBus
}

/**
 * Vue inject key — same `Symbol` used by both `provideTenantContext` and
 * `useTenantContext` at runtime.
 */
export declare const TENANT_CONTEXT_KEY: symbol

export declare function createTenantContext(
	initialUuid?: string | null,
	initialOrg?: TOrganisation | null,
): TenantContext

export declare function provideTenantContext(
	initialUuid?: string | null,
	initialOrg?: TOrganisation | null,
): TenantContext

export declare function useTenantContext(): TenantContext
