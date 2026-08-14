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
	const out = []
	if (flags.view) {
		out.push({ label: 'View', icon: viewIcon, handler: handlers.onView })
	}
	if (flags.edit) {
		out.push({ label: 'Edit', icon: Pencil, handler: handlers.onEdit })
	}
	if (flags.copy) {
		out.push({ label: 'Copy', icon: ContentCopy, handler: handlers.onCopy })
	}
	if (flags.del) {
		out.push({ label: 'Delete', icon: TrashCanOutline, destructive: true, handler: handlers.onDelete })
	}
	return out
}
