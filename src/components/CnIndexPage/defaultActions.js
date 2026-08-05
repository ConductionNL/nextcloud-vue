import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'

/**
 * Build CnIndexPage's built-in row actions from the show*Action flags.
 *
 * @param {object} opts
 * @param {{ view: boolean, edit: boolean, copy: boolean, del: boolean }} opts.flags
 * @param {object} opts.viewIcon Component to use as the View action icon.
 * @param {{ onView: Function, onEdit: Function, onCopy: Function, onDelete: Function }} opts.handlers
 * @return {Array<object>}
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
