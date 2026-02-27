import { createSubResourcePlugin } from '../createSubResourcePlugin.js'

/**
 * Audit trails plugin for the object store.
 *
 * Adds state, getters, and actions for fetching audit trail records
 * for an object. Read-only — no create/update/delete.
 *
 * State: auditTrails, auditTrailsLoading, auditTrailsError
 * Actions: fetchAuditTrails(type, objectId, params), clearAuditTrails()
 * Getters: getAuditTrails, isAuditTrailsLoading, getAuditTrailsError
 *
 * @param {object} [options={}] Plugin options
 * @param {number} [options.limit=20] Default page size
 * @return {Function} Plugin factory
 */
export const auditTrailsPlugin = createSubResourcePlugin('auditTrails', 'audit-trails')
