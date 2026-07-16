// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// NEXTCLOUD_ICONS — the curated set of Nextcloud built-in `icon-*` CSS classes
// offered in the menu-item icon dropdown (CnMenuTreeNode). These are the icons
// CnAppNav actually renders for a menu entry via its `cssIconClass` path (an
// `icon-*` class), so anything picked here shows up unchanged in the live nav.
//
// Nextcloud ships these as CSS classes (core/css/icons*.scss); there is no JS
// registry to enumerate, so this is a hand-maintained list of the common,
// stable ones. `value` is the class; `label` is a human-readable name.

/**
 * @type {Array<{value: string, label: string}>}
 */
export const NEXTCLOUD_ICONS = [
	{ value: 'icon-dashboard', label: 'Dashboard' },
	{ value: 'icon-home', label: 'Home' },
	{ value: 'icon-category-dashboard', label: 'Dashboard (category)' },
	{ value: 'icon-files', label: 'Files' },
	{ value: 'icon-folder', label: 'Folder' },
	{ value: 'icon-category-files', label: 'Files (category)' },
	{ value: 'icon-folder-shared', label: 'Shared folder' },
	{ value: 'icon-file', label: 'File' },
	{ value: 'icon-filetype-text', label: 'Text document' },
	{ value: 'icon-picture', label: 'Picture' },
	{ value: 'icon-contacts', label: 'Contacts' },
	{ value: 'icon-user', label: 'User' },
	{ value: 'icon-group', label: 'Group' },
	{ value: 'icon-calendar', label: 'Calendar' },
	{ value: 'icon-mail', label: 'Mail' },
	{ value: 'icon-comment', label: 'Comment / Messages' },
	{ value: 'icon-talk', label: 'Talk' },
	{ value: 'icon-search', label: 'Search' },
	{ value: 'icon-settings', label: 'Settings' },
	{ value: 'icon-category-customization', label: 'Customization' },
	{ value: 'icon-category-monitoring', label: 'Monitoring' },
	{ value: 'icon-category-organization', label: 'Organization' },
	{ value: 'icon-category-integration', label: 'Integration' },
	{ value: 'icon-projects', label: 'Projects' },
	{ value: 'icon-tag', label: 'Tag' },
	{ value: 'icon-star', label: 'Star / Favorite' },
	{ value: 'icon-add', label: 'Add' },
	{ value: 'icon-edit', label: 'Edit' },
	{ value: 'icon-delete', label: 'Delete' },
	{ value: 'icon-details', label: 'Details' },
	{ value: 'icon-info', label: 'Info' },
	{ value: 'icon-checkmark', label: 'Checkmark' },
	{ value: 'icon-history', label: 'History' },
	{ value: 'icon-share', label: 'Share' },
	{ value: 'icon-download', label: 'Download' },
	{ value: 'icon-upload', label: 'Upload' },
	{ value: 'icon-link', label: 'Link' },
	{ value: 'icon-external', label: 'External link' },
	{ value: 'icon-clippy', label: 'Clipboard' },
	{ value: 'icon-toggle', label: 'Toggle / View' },
	{ value: 'icon-toggle-filelist', label: 'List view' },
	{ value: 'icon-toggle-pictures', label: 'Grid view' },
	{ value: 'icon-filter', label: 'Filter' },
	{ value: 'icon-sound', label: 'Sound' },
	{ value: 'icon-video', label: 'Video' },
	{ value: 'icon-quota', label: 'Quota' },
	{ value: 'icon-password', label: 'Password / Lock' },
	{ value: 'icon-lock', label: 'Lock' },
	{ value: 'icon-public', label: 'Public' },
	{ value: 'icon-activity', label: 'Activity' },
	{ value: 'icon-notifications', label: 'Notifications' },
	{ value: 'icon-more', label: 'More' },
	{ value: 'icon-clock', label: 'Clock' },
	{ value: 'icon-address', label: 'Address / Map' },
]
