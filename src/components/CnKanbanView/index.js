import CnKanbanView from './CnKanbanView.vue'

export default CnKanbanView
export { CnKanbanView }

/**
 * The former name of CnKanbanView, kept so existing imports keep working.
 *
 * @deprecated Since the view mode is called `kanban`. Import `CnKanbanView`.
 */
export const CnBoardView = CnKanbanView
