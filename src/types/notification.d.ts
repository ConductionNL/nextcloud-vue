/**
 * OpenRegister Notification entity type.
 *
 * Represents a notification related to an object (e.g., status changes,
 * assignments, deadline alerts). Typically delivered via Nextcloud's
 * notification system.
 */
export interface TNotification {
	id: string | number
	uuid?: string
	type: TNotificationType
	title: string
	message?: string
	objectId?: string
	objectUuid?: string
	objectType?: string
	userId?: string
	priority?: TNotificationPriority
	read?: boolean
	actionUrl?: string | null
	created: string
	updated?: string
}

/** Notification type categories. */
export type TNotificationType =
	| 'status-change'
	| 'assignment'
	| 'deadline'
	| 'mention'
	| 'comment'
	| 'system'
	| string

/** Notification priority levels. */
export type TNotificationPriority = 'urgent' | 'high' | 'normal' | 'low'
