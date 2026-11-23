---
kind: code
---

# Proposal: address-search

## Summary

ARCH-AUDIT MOVE item. dossiq's AddressSearch (with its pdokService shim) searches the PDOK Locatieserver through integriq's PDOK proxy for its LocationPicker and CaseLocationDialog; every app that stores a location needs the same field. CnAddressSearch is that field: suggestions, a free-text fallback, a lookup of the pick with its coordinates, and a quiet degraded state when the proxy is missing or PDOK is down. Built on CnSearchSelect.

## Scope

- New `src/components/CnAddressSearch/`, exported.
- No schema change: it is used from app code or as a form field.
