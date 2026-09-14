/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * This repository lints itself with the preset it publishes.
 *
 * It used to extend `stylelint-config-recommended` and
 * `stylelint-config-recommended-vue` directly, while shipping a DIFFERENT
 * config to the fleet at `@conduction/nextcloud-vue/stylelint`. The published
 * one extended `@nextcloud/stylelint-config`, which this package never
 * declared, so requiring it in a consuming app threw MODULE_NOT_FOUND. Nothing
 * here noticed, because nothing here ever loaded it.
 *
 * A preset its publisher does not run is a preset nobody tests. So this file is
 * a one-line re-export, and `npm run stylelint` now exercises exactly what an
 * app gets.
 */
module.exports = require('./stylelint/index.js')
