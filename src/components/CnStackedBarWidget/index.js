/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStackedBarWidget: the `stacked-bar` dashboard widget (one segmented bar
 * with a legend that carries the numbers). It is registered in
 * `CnWidgetGrid/registerDashboardWidgets.js`, inline, because a bare
 * side-effect import of this module may be tree-shaken away.
 */

import CnStackedBarWidget from './CnStackedBarWidget.vue'

export { CnStackedBarWidget }
export default CnStackedBarWidget
