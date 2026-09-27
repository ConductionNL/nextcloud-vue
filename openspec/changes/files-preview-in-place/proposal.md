---
kind: code
depends_on: []
---

# Proposal: files-preview-in-place

## Why

A reader who opens a publication and clicks one of its documents should
see it, not download it or be sent to another app. The library opens a
file three different ways depending on which component drew the row:

- `CnFilesTab` (the object sidebar) opens it in Nextcloud's Viewer over
  the page, then falls back to a share link, then to the Files app.
- `CnFilesCard` (the files integration widget on detail pages and
  dashboards) renders a plain link to `file.url`.
- `CnFilesWidget` opens the Files app in a new tab.

And none of them previews a data file. A CSV or a JSON attachment, which
is what a data catalogue publishes, is a download in every case, because
the Viewer does not render tables.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| opencatalogi | `pub-preview` | Preview an attached document or data file in the browser before downloading it. | partial | built |

Built evidence: "nextcloud-vue CnFilesCard.vue:28-29 renders a plain
file.url link; CnFilesTab.vue:76-105 has the image preview and Viewer,
but the PublicationDetail sidebar only has the audit tab". Note: "Not
settled whether the detail-page widget renders CnFilesCard (link only) or
the CnFilesTab body with Viewer. Nothing public previews data files."

Read for this change: the files integration's widget is `CnFilesCard`
(`src/integrations/builtin/files.js:16`, `:33`), so the detail page
renders the plain link. The row is in `publications`, opencatalogi's core
area.

## Competitor evidence, quoted from the opencatalogi matrix

- CKAN, yes: "resource views render files in the page at
  /dataset/<id>/resource/<rid>/view ... through bundled view plugins:
  text/JSON/XML (ckanext/textview/plugin.py:16-27), images
  (ckanext/imageview), tables (ckanext/datatablesview), video, audio and
  web pages". The matrix records the ckan-2.12.0 source tree, no URL.
- xxllnc Publiceren, yes: documents open "in its in-browser viewer at
  https://vught.woopublicaties.nl/editor?pdf=<document url>", and
  https://xxllnc.nl/applicaties/publiceren/ says readers can view
  documents "online inzien".
- DKAN, partial: CSV rows readable through the datastore query API, no
  preview for PDF, https://git.drupalcode.org/project/dkan

Two competitors rated yes. No demand row.

## What changes

- One way to open a file for every files component: the Viewer when it
  handles the type, otherwise a preview the library draws itself,
  otherwise the browser, otherwise the Files app.
- A data preview, `CnFilePreview`, for what the Viewer does not show:
  the first rows of a CSV or TSV as a table, and JSON or XML as a
  formatted read-only view, each with a Download button.
- `CnFilesCard` and `CnFilesWidget` open files through it instead of a
  bare link or the Files app.
- On public pages, where the Viewer is not loaded, PDFs and images open
  in the browser's own viewer and data files in `CnFilePreview`.

## Affected projects

- `nextcloud-vue`: `CnFilesCard`, `CnFilesWidget`, `CnFilesTab`,
  `CnRelatedFiles`, a new `CnFilePreview`, a new `useFileOpener`.
- Consumers: opencatalogi (publication detail), filinq, dossiq, every
  detail page with the files integration.

## Backward compatibility

A click that opened the Viewer still does. A click that opened a new tab
may now open a preview dialog; the dialog carries Download and Open in
Files, so nothing that was reachable becomes unreachable. No props are
removed.

## Out of scope

- Opencatalogi's own public site outside the library's public runtime.
  It can mount `CnFilePreview` once shipped; that is opencatalogi's half.
- Office documents. The Viewer opens them when an office app is
  installed; the library does not render them.
