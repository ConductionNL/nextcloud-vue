import { translate as t } from '@nextcloud/l10n'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'

/**
 * Build CnIndexPage's built-in row actions from the show*Action flags.
 *
 * @param {object} opts The action-building options.
 * @param {{ view: boolean, edit: boolean, copy: boolean, del: boolean }} opts.flags
 *   Which built-in actions to include, from the page's `show*Action` props.
 * @param {object} opts.viewIcon Component to use as the View action icon.
 * @param {{ onView: Function, onEdit: Function, onCopy: Function, onDelete: Function }} opts.handlers
 *   Click handlers bound to each emitted action, in the same order as `flags`.
 * @return {Array<object>} The enabled actions in menu order (view, edit, copy,
 *   delete), each `{label, icon, handler}` — delete additionally `destructive`.
 */
export function buildDefaultActions({ flags, viewIcon, handlers }) {
	// t() at BUILD-actions time, not module time: the labels were string
	// literals for the menu's whole life, which is why Edit/Copy/Delete
	// rendered in English in every locale despite their catalog entries
	// having existed all along. Runs after registerTranslations(), so the
	// consuming app's language is already resolved.
	const out = []
	if (flags.view) {
		out.push({ label: t('nextcloud-vue', 'View'), icon: viewIcon, handler: handlers.onView })
	}
	if (flags.edit) {
		out.push({ label: t('nextcloud-vue', 'Edit'), icon: Pencil, handler: handlers.onEdit })
	}
	if (flags.copy) {
		out.push({ label: t('nextcloud-vue', 'Copy'), icon: ContentCopy, handler: handlers.onCopy })
	}
	if (flags.del) {
		out.push({ label: t('nextcloud-vue', 'Delete'), icon: TrashCanOutline, destructive: true, handler: handlers.onDelete })
	}
	return out
}
