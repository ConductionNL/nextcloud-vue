/**
 * OpenRegister Audit Trail entity type.
 *
 * Records changes made to objects for compliance and history tracking.
 */
export interface TAuditTrail {
	id: number
	uuid: string
	schema: number
	register: number
	object: number
	objectUuid: string | null
	registerUuid: string | null
	schemaUuid: string | null
	action: string
	changed: Record<string, unknown> | unknown[]
	user: string
	userName: string
	session: string
	request: string
	ipAddress: string
	version: string | null
	created: string
	organisationId: string | null
	organisationIdType: string | null
	processingActivityId: string | null
	processingActivityUrl: string | null
	processingId: string | null
	confidentiality: string | null
	retentionPeriod: string | null
	size: number
}
