/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRowMarkList — self-registers the `row-mark-list` widget type (every row of
 * a list gets one of a few marks, saved in one request) into the shared
 * dashboardWidgetRegistry.
 * Importing this module also registers the widget type (dashboardRegistration.js).
 */

import CnRowMarkList from './CnRowMarkList.vue'

import './dashboardRegistration.js'

export { CnRowMarkList }
export default CnRowMarkList
