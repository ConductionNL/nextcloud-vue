/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSlotGrid — self-registers the `slot-grid` widget type (the objects of one
 * schema laid out by a row value and a column value, added per cell) into the
 * shared dashboardWidgetRegistry.
 * Importing this module also registers the widget type (dashboardRegistration.js).
 */

import CnSlotGrid from './CnSlotGrid.vue'

import './dashboardRegistration.js'

export { CnSlotGrid }
export default CnSlotGrid
