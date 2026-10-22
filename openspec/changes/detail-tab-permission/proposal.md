# Proposal: detail-tab-permission

## Why

dossiq gates its social-domain pages and its Privacy page tab on role permissions (`sociaal-domein`, `privacy`), which a
menu entry and a page tab read. The case page's Indication and Case meeting tabs are tabs of a `tabs` widget, which
read no permission, so every handler saw them (dossiq privacy-and-social-domain-groups 1.5).

## What changes

A `tabs` widget entry takes `permission`, read as a page tab reads it: drawn for a holder, and drawn when no
permissions are known. Additive.
