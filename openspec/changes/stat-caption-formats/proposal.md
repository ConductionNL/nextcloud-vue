# Proposal: stat-caption-formats

## Why

Board PqContract's KPI captions read formatted figures: "per maand, uit € 42.000 per jaar" and "opzegdatum 1 nov". A stat caption filled `{field}` tokens from the endpoint payload as raw values only, so a caption printed 42000 and 2026-11-01.

## What changes

A caption token may carry a template format, `{annualValue|currency}` or `{noticeDate|longdate}`, filled as a template token is (`fillTemplate`, with the page's app config for the reporting currency). A token without a format is unchanged.

## Scope

CnStatWidget's `resolvedCaption`.
