# Design

## Decision 1: add to the existing registry

`src/utils/builtInFormatters.js` already holds the built-ins and `CnAppRoot` already provides them as `{ ...BUILT_IN_FORMATTERS, ...props.formatters }`. The two formatters join that map. No new mechanism.

## Decision 2: translate at call time with the library slug

A label resolved at module load would be English for every reader, because the catalogue registers after import. Both formatters call `t('nextcloud-vue', ...)` on each render, the same way `daysUntil` does.

## Decision 3: unknown status values pass through

A status value added to the registry later must still show something. The formatter returns `String(value)` for anything outside the seven, and `''` for null or undefined. Only own keys of the label map count, so `toString` is not read as a status.

## Decision 4: app copies keep winning

Integriq and dossiq register their own `connectionStatus` and `connectionSettingsLabel`. Consumer formatters override built-ins, so those apps render exactly as before until they drop the copy.

## Decision 5: `limited` joins the map

Hydra#673 (connection-registry design D12) adds a sixth status, `limited`, for a connection that works in part. `unavailable` would say it does not work at all. The formatter renders it as "Limited", and "Beperkt" for a Dutch reader. Before this change `limited` fell through as the raw value.

## Decision 6: `disabled` joins the map

Hydra#677 (connection-registry design D8) adds a seventh status, `disabled`, for a connection an admin switched off on purpose. `unconfigured` would say nobody filled in the setting. The formatter renders it as "Switched off", and "Uitgeschakeld" for a Dutch reader. Before this change `disabled` fell through as the raw value.
