# An object list badge takes its tone from the referenced record

## Why

DqZaakGerelateerd draws a sub-case's status "In behandeling" as a purple pill:
its status type's colour is `purple`. The case's Deelzaken list is an object
list with a `badge` column that names `widgetProps.resolve.colorField`, but only
the index page reads that colour; the object list ignored it and drew every
status grey.

## What changes

CnObjectListWidget reads a `badge` column's `widgetProps.resolve` colour and
icon fields for the rows it shows, one batch per column, and hands them to the
cell as the index page does (`widgetProps.looks`).
