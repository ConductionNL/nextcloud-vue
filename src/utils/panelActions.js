/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The channel a bare widget uses to hand its overflow-menu items to whatever
 * surface is hosting it.
 *
 * WHY THIS EXISTS. A widget rendered in a tab panel draws no header, so the
 * items that header would have carried have nowhere to go. The rule a reader
 * expects is simply that the open tab decides what the strip's menu offers.
 *
 * For `CnObjectDataWidget` the lost items are Metadata and the full edit dialog,
 * and both disappeared when the panel stopped drawing a card. For a catalog
 * panel (`object-list`, `table`, so a Documents or Files tab) it is the Add
 * action, which `CnDetailWidgetHost` draws in its own card header. Metadata had no other home
 * at all. Edit had a near neighbour, the record Edit button on a detail page
 * header, but that opens the form the PAGE configures rather than the field
 * subset the widget declares, so a widget showing eight of forty fields still
 * lost the form scoped to its eight.
 *
 * WHY NOT RE-CREATE THEM ON THE STRIP. `CnTabsWidget` already holds the object,
 * the schema and the store, so it looks able to offer both itself. It is not:
 * the edit dialog is configured per widget (`overrides`, `include`, `exclude`,
 * the form's size and column count) and commits through the widget's own save
 * path. Rebuilding it upstairs would silently drop that configuration and
 * duplicate the save. So the modals stay with the widget that owns them and
 * only the MENU ITEMS travel.
 *
 * WHY DESCRIPTORS AND NOT THE SLOT ITSELF. Handing the ancestor a slot function
 * to render would work, and would leave the vnodes owned by one component while
 * mounted in another's tree, so a re-render of the owner would not reliably
 * reach them. Plain data plus a callback has no such seam.
 *
 * THE SHAPE. Two layers, because the widget does not know its own id on the
 * surface and should not have to:
 *
 *   - The SURFACE (`CnTabsWidget`) provides `{ set(id, items, source),
 *     clear(id, source) }` and renders the items belonging to whichever panel
 *     is open. It keys by id because `lazy` tabs stay mounted once visited, so
 *     several panels publish at the same time, and by SOURCE because a panel
 *     has two possible publishers.
 *   - The HOST (`CnDetailWidgetHost`) knows the id, and re-provides the channel
 *     with its own id and the `widget` source baked in: `{ set(items),
 *     clear() }`. It also publishes its OWN items under the `host` source: the
 *     catalog Add, which it draws in a card header that a panel does not have.
 *   - The WIDGET injects that narrowed channel and publishes while its own menu
 *     is suppressed.
 *
 * The two sources are why `set` takes one. A single slot per widget meant
 * whichever published last silently replaced the other, which would have cost a
 * catalog panel its Add the moment anything else published for the same tab.
 *
 * A widget outside such a surface injects the default `null` and does nothing,
 * which is every other use of every one of these components.
 *
 * @type {string}
 */
export const PANEL_ACTION_SINK = 'cnPanelActionSink'

/**
 * One item a widget offers to its host surface's overflow menu.
 *
 * `run` is a closure over the publishing widget, so it still opens that
 * widget's own dialog and commits through its own save path even though the
 * button a user clicks is rendered by an ancestor.
 *
 * @typedef {object} PanelAction
 * @property {string} key Stable identity for the list rendering it.
 * @property {string} label The user-facing item text, already translated.
 * @property {string} icon A `CnIcon` name.
 * @property {Function} run Invoked on click, with no arguments.
 */
