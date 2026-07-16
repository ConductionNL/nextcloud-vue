/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Catalog of the relation groups CnRelatedObjectsWidget can render, in tab
 * order. Used by CnRelatedObjectsWidgetForm to offer a "relations to show"
 * picker and by the widget's `includeGroups` whitelist. Keys MUST match the
 * group keys the widget builds in `loadTabs()` (`objects`, `files`, and the
 * LEAF_GROUPS keys).
 *
 * @module components/CnRelatedObjectsWidget/relatedGroups
 */

/**
 * @type {Array<{ key: string, label: string }>} group key → English label
 *   (consumers wrap with `t()`).
 */
export const RELATED_GROUPS = [
	{ key: 'objects', label: 'Objects' },
	{ key: 'files', label: 'Files' },
	{ key: 'mails', label: 'Mails' },
	{ key: 'events', label: 'Events' },
	{ key: 'contacts', label: 'Contacts' },
	{ key: 'notes', label: 'Notes' },
	{ key: 'tasks', label: 'Tasks' },
	{ key: 'deck', label: 'Deck' },
	{ key: 'talk', label: 'Talk' },
	{ key: 'forms', label: 'Forms' },
	{ key: 'maps', label: 'Maps' },
	{ key: 'polls', label: 'Polls' },
	{ key: 'bookmarks', label: 'Bookmarks' },
	{ key: 'collectives', label: 'Collectives' },
	{ key: 'photos', label: 'Photos' },
	{ key: 'cospend', label: 'Cospend' },
	{ key: 'timetracker', label: 'Time tracker' },
	{ key: 'analytics', label: 'Analytics' },
	{ key: 'flow', label: 'Flow' },
	{ key: 'openproject', label: 'OpenProject' },
	{ key: 'xwiki', label: 'XWiki' },
]
