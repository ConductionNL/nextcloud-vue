/** CalDAV task priority levels (mapped from iCal 0-9 range). */
export type TTaskPriority = 'urgent' | 'high' | 'normal' | 'low'

/** CalDAV task status values. */
export type TTaskStatus = 'needs-action' | 'in-process' | 'completed' | 'cancelled'

/**
 * OpenRegister Task entity type.
 *
 * Tasks are CalDAV-based (iCalendar VTODO) and linked to objects.
 * Fetched via the /tasks sub-resource endpoint and normalized from
 * iCal format to this frontend-friendly shape.
 */
export interface TTask {
	id: string
	uid?: string
	calendarId?: string
	taskUri?: string
	title: string
	description?: string
	reference?: string
	objectUuid?: string
	deadline?: string | null
	daysText?: string
	isOverdue?: boolean
	isCompleted?: boolean
	priority: TTaskPriority
	status: TTaskStatus
	created?: string
	updated?: string
}
