# File and Document Storage Module

## Status

Planned. Task 35 should define a storage abstraction before any business module
stores files directly.

Task 35 is split into:

* Task 35.1 Storage Abstraction Foundation
* Task 35.2 File Metadata, Ownership, and Access Control
* Task 35.3 Upload, Download, and Signed Access
* Task 35.4 Document Retention and Deletion Policies
* Task 35.5 File Administration UI

## Objective

Provide tenant-safe file and document storage for receipts, invoices, reports,
attachments, exports, and future media without coupling business modules to a
specific storage backend.

Initial deployment may use local filesystem storage on the Ubuntu VPS. The API
must preserve the option to add object storage later.

## Ownership

This module owns:

* storage provider abstraction
* file metadata
* file ownership and purpose classification
* upload/download access controls
* retention rules
* deletion and legal-hold controls

Business modules own the business record that references a file.

## Data Model

Planned entities:

* `StoredFile`: tenant-scoped file metadata, checksum, size, MIME type, purpose
* `FileReference`: link from a business record to a stored file
* `FileRetentionPolicy`: tenant default and outlet override retention rules
* `FileAccessGrant`: short-lived signed access grant metadata
* `FileDeletionRecord`: audit-friendly deletion or purge record

Tenant-owned files carry `tenantId`. Outlet-specific documents carry
`outletId` where applicable.

## Scope Rules

Configuration hierarchy:

Platform default -> tenant default -> outlet override.

Offline support classification: partial. POS devices may cache approved
documents locally, but authoritative metadata, retention, and deletion remain
server controlled.

## Invariants

* Business modules do not store raw files in their own tables.
* Stored files are tenant scoped.
* Checksums are recorded at upload.
* File content is never returned without authorization.
* Short-lived signed access is preferred over permanent public URLs.
* Financial and fiscal documents follow retention rules.
* Deletion cannot break immutable financial history.
* Legal hold prevents purge.

## Authorization

Suggested permissions:

* `files.view`
* `files.upload`
* `files.download`
* `files.manage`
* `files.retention_manage`

Outlet authorization applies when a file is outlet scoped.

## API

Planned APIs:

* `POST /files`
* `GET /files`
* `GET /files/:id`
* `GET /files/:id/download`
* `POST /files/:id/access-grants`
* `POST /files/:id/delete`
* `GET /file-retention-policies`
* `POST /file-retention-policies`
* `PATCH /file-retention-policies/:id`

## Flutter

Admin UI:

* file list and filters
* upload workflow for allowed purposes
* file details
* retention policy management
* deletion and legal-hold visibility

Restaurant-app may consume generated download links but should not manage
retention.

## Audit Requirements

Audit:

* upload completion
* download grant creation
* retention policy changes
* deletion requests
* purge completion
* legal-hold changes

## Non-Goals

* public media CDN
* image editing
* document OCR
* cloud-only storage dependency
* full document management suite
