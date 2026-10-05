/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWeekStripWidget: the `week-strip` dashboard widget (the current week as
 * day columns with the dated items under each day). It is registered in
 * `CnWidgetGrid/registerDashboardWidgets.js`, inline, because a bare
 * side-effect import of this module may be tree-shaken away.
 */

import CnWeekStripWidget from './CnWeekStripWidget.vue'

export { CnWeekStripWidget }
export default CnWeekStripWidget
