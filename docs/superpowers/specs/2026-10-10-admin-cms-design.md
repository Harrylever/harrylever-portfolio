# Portfolio Admin CMS Design

**Date:** 2026-10-10
**Status:** Approved design

## Purpose

Add a private, single-owner admin panel to the existing Next.js portfolio so
the homepage, projects, and blog posts can be created, edited, previewed,
published, unpublished, and removed without editing source files. The public
site must keep its current visual language, routes, animation behavior, and SEO
surface while its content moves from TypeScript constants to PostgreSQL.

Success means the owner can manage the complete content lifecycle from
`/admin`, upload and reuse images through Cloudinary, preview drafts on the real
public templates, and publish without redeploying the application.

## Agreed Stack and Constraints

- Next.js remains the application and backend, deployed on Vercel.
- Neon supplies PostgreSQL.
- Drizzle ORM owns the application schema and migrations.
- Self-hosted Better Auth supplies email/password authentication and
  database-backed sessions through its Drizzle adapter.
- CUID2 strings are used for every primary key, including Better Auth tables.
- Cloudinary stores media; PostgreSQL stores asset metadata and references.
- Tiptap provides the visual rich-text editor and saves structured JSON.
- The panel has one administrator. Public signup and multi-user management are
  out of scope.
- Projects and posts support draft, preview, publish, unpublish, trash, restore,
  and permanent deletion. Scheduled publishing is out of scope.
- Homepage templates remain fixed, but their content, visibility, and order are
  editable.
- The existing content is imported without changing existing project and post
  slugs.

## Non-goals

- A general-purpose or multi-tenant CMS
- Public user accounts, comments, newsletters, or memberships
- Custom page-template construction
- Scheduled publishing or editorial approval workflows
- Full historical revision browsing or rollback
- Replacing the portfolio's existing visual design
- A separate API server, public database client, or Neon Data API

## Architecture

```text
Public pages
    | read published snapshots
    v
Next.js server components ---> content repositories ---> Drizzle ---> Neon
    ^                                  |
    | cache invalidation               | CUID2 keys
    |                                  v
Admin UI ---> protected server actions and route handlers
    |
    +-- Better Auth sessions in Neon
    +-- Tiptap structured content
    +-- signed direct uploads ---> Cloudinary
```

Public routes are server-rendered data consumers. Server components query only
published snapshots and pass serializable content to the existing animated
client components. Database access is isolated behind domain repositories so
UI components do not contain query logic.

Admin forms use server actions for ordinary mutations. Route handlers are used
for Better Auth, Cloudinary upload signatures, and endpoints that do not fit a
form action. Every protected page, action, preview, and route handler calls the
same server-only `requireAdmin()` guard; middleware may provide an early
redirect but is not the authorization boundary.

The application uses Neon's pooled `DATABASE_URL` for Vercel runtime traffic.
Drizzle Kit uses the direct `DATABASE_URL_UNPOOLED` for migrations. Schema
changes are generated and committed as Drizzle migrations rather than applied
as ad hoc SQL.

## Authentication

Better Auth runs inside the Next.js application with its PostgreSQL Drizzle
adapter. Email/password login is enabled, public signup is disabled in the
server configuration, and the user record has an `admin` role used by
`requireAdmin()`.

Initial setup is performed by an idempotent, command-line-only bootstrap
script. The script creates a Better Auth instance that permits signup only in
that local process, creates the initial account using Better Auth's own password
pipeline, marks it as an administrator, and exits. It reads the initial name,
email, and password from environment variables and refuses to create a second
administrator. Runtime auth remains configured with signup disabled. The
initial password variables should be removed after successful bootstrap.

The panel supports sign-in, sign-out, and authenticated password changes.
Changing the password revokes other sessions. There is no public password-reset
mailer in the first version; a locked-out owner uses a separate command-line
password-rotation command against the database.

Better Auth's user, account, session, and verification primary keys use the
same shared CUID2 generator as application records. Production cookies are
HTTP-only, secure, and same-site. Auth responses do not expose whether an email
exists, and repeated failed login attempts are rate-limited.

## Content Model

All primary keys are CUID2 text values. All timestamps are timezone-aware.
Mutable records have `created_at`, `updated_at`, and, where applicable,
`deleted_at`.

### Authentication tables

Better Auth owns `users`, `sessions`, `accounts`, and `verifications`. Drizzle
schema definitions and migrations remain the source of truth for these tables.
The `users` table includes the authorization role.

### Global site profile

`site_profile` is a singleton record with draft and published JSON snapshots.
It contains the identity shared across routes: name, location, tagline,
description, contact details, social links, and GitHub username. Publishing the
site profile updates metadata, navigation, and homepage consumers together.

### Homepage sections

`home_sections` contains one record for each fixed component type:

- `intro`
- `now`
- `built`
- `commits`
- `frames`
- `reach`
- `loop`
- `say`

Each row stores `draft_content`, `published_content`, draft and published
visibility, and draft and published position. Section content is JSONB because
the templates are fixed but their payloads differ substantially. Every section
type has a dedicated Zod schema and a dedicated admin form.

Publishing the homepage is one transaction: all validated draft section
payloads, visibility values, and positions become the new public snapshot
together. This prevents a partially published reorder. The `built` section
contains its own heading and supporting copy but reads its cards from published
projects marked as featured; it does not duplicate project records.

### Projects

`projects` contains:

- CUID2 ID and unique active slug
- `draft_content` and `published_content` JSONB snapshots
- lifecycle status and publish timestamps
- public display order
- featured flag and featured order
- optimistic-concurrency version timestamp
- trash timestamp

The validated project payload includes name, hook, homepage story, year, role,
display status, external URL, technology stack, cover asset, ordered gallery,
SEO fields, and a Tiptap case-study document.

### Blog posts

`posts` contains:

- CUID2 ID and unique active slug
- `draft_content` and `published_content` JSONB snapshots
- lifecycle status and publish timestamps
- optimistic-concurrency version timestamp
- trash timestamp

The validated post payload includes title, summary, tag, cover asset, SEO
fields, and a Tiptap document. Reading time and display year are derived from
the published document and publish date instead of entered independently.

### Media

`media_assets` stores the Cloudinary public ID, resource type, secure URL,
width, height, byte size, format, alt text, caption, and timestamps.
`media_usage` records which content record and field references an asset. The
application refreshes usage rows whenever validated content is saved.

Assets are not permanently deleted while usage rows exist. Trashing content
does not delete its media. Permanent asset deletion removes the Cloudinary
resource and the database record only after a dependency check succeeds.

### Content events

`content_events` records the acting admin, content type and ID, event type,
timestamp, and small non-sensitive metadata payload for create, update,
publish, unpublish, trash, restore, and permanent-delete operations. This is an
operational audit trail, not a full revision history.

## Draft and Publishing Semantics

Admin edits always update `draft_content`. Public queries always read
`published_content`; consequently, changing an already-published item never
changes or removes the live version until the owner explicitly publishes the
new draft.

Publishing validates the complete draft, copies it into the published
snapshot, writes the publication timestamp and audit event, and commits all of
those changes in one database transaction. Cache invalidation happens only
after the transaction succeeds. Unpublishing hides the public snapshot without
discarding draft content. Republishing restores the latest approved snapshot.

Preview requests are authenticated and use Next.js draft mode. They render the
same route components and design system as the public site, substituting the
draft snapshot at the repository boundary. Preview URLs never expose drafts to
unauthenticated visitors or search engines.

An edit includes the record's last-seen `updated_at`. A stale save returns a
conflict response rather than overwriting changes made in another browser tab.

## Admin Experience

The admin panel uses the portfolio's typography and palette but favors a quiet,
functional layout. Desktop uses persistent left navigation; mobile uses a
compact navigation drawer. Long-form Tiptap authoring is optimized for larger
screens, while routine edits remain usable on mobile.

Primary destinations are:

- **Overview:** recent edits, draft and published counts, and create shortcuts.
- **Home:** ordered fixed-section list with drag handles, visibility controls,
  section-specific forms, preview, and a single publish-homepage action.
- **Projects:** searchable and filterable table with create, edit, duplicate,
  reorder, preview, publish, unpublish, trash, and restore actions.
- **Blog:** the equivalent workflow for posts.
- **Media:** uploads, search, alt-text editing, usage display, URL copying, and
  guarded deletion.
- **Settings:** site identity, social/contact details, admin profile, password,
  and session management.

Project and post editors use a main writing area plus a narrower metadata and
publishing column. Tiptap supports paragraphs, H2/H3 headings, ordered and
unordered lists, block quotes, links, images, inline formatting, and fenced
code blocks. Arbitrary HTML, scripts, iframes, and executable embeds are not
accepted.

Draft saving is explicit. The interface shows saved, saving, error, and unsaved
states and warns before navigation with unsaved changes. Publishing and
unpublishing use confirmation dialogs. Destructive confirmation text names the
specific item and distinguishes trash from permanent deletion.

## Media Flow

The browser requests a short-lived upload signature from a protected Next.js
route. That route checks the admin session and returns parameters restricted to
the configured Cloudinary folder, media type, and size. The browser uploads
directly to Cloudinary, then sends the returned metadata to a server action
that validates it and creates `media_assets`.

Images require useful alt text before they can be attached to publishable
content. Server-side validation rejects unsupported formats, oversized files,
unexpected Cloudinary folders, and metadata not matching the signed upload.
When Cloudinary upload succeeds but asset registration fails, the UI reports
the orphan and offers a retry; best-effort cleanup is attempted without hiding
the database failure.

## Validation and Error Handling

All client input is treated as untrusted and revalidated on the server. Domain
services accept parsed types rather than raw form payloads. Slugs are
normalized, reserved-route collisions are rejected, and project and post slugs
become immutable after first publication so routine edits cannot silently
break established URLs. External URLs are restricted to expected protocols,
and Tiptap nodes are checked against an allowlist before storage and rendering.

Server actions return typed field errors for expected validation failures and a
generic recoverable error for infrastructure failures. Sensitive database,
Cloudinary, auth, and environment details are never sent to the browser.
Missing public records return the existing 404 experience. Admin loading,
empty, error, and retry states provide a next action rather than an inert
screen.

Publishing, reordering, trash/restore operations, usage refreshes, and audit
events use transactions wherever multiple database writes must agree. Failed
transactions leave the prior published snapshot and cache untouched.

## Public-Site Integration

The public homepage, projects index/detail pages, blog index/detail pages,
metadata, and sitemap query repository functions rather than importing
`src/data/*.ts`. Only published, non-deleted records are returned.

Existing public route shapes remain:

- `/`
- `/projects`
- `/projects/[slug]`
- `/blog`
- `/blog/[slug]`

Sitemap entries are generated from published records only. Metadata is derived
from the published site profile and item SEO fields. Page-level cache tags are
scoped so a blog publication does not unnecessarily invalidate every project
page.

## Initial Content Migration

An idempotent content seed converts the current TypeScript data into validated
database records without creating duplicates when rerun:

- The site profile and all homepage sections are seeded and published.
- Existing projects are merged with their duplicated homepage `builds` data,
  preserving slugs and becoming published projects. Their current display
  order becomes project order; homepage build order becomes featured order.
- The one blog entry with a complete body is seeded as published.
- Summary-only placeholder posts are preserved as drafts so the admin can
  complete them without exposing dead article links.
- Current figure slots are placeholders rather than uploaded assets, so the
  seed preserves layout metadata but does not invent Cloudinary records.

After migration and verification, public code stops importing `ME`, `PROJECTS`,
and `POSTS`. The old data files may remain temporarily as seed fixtures but are
not runtime sources.

## Deployment and Environment Strategy

Production uses a Neon production branch and Vercel production environment
variables. Development and preview work uses separate Neon branches so schema
and content tests cannot mutate production. Cloudinary uploads use a dedicated
folder prefix per environment.

Required secret categories are:

- pooled and unpooled Neon connection strings
- Better Auth secret and canonical application URL
- Cloudinary cloud name, API key, and API secret
- one-time bootstrap administrator values during initial setup

Migrations are tested against a Neon branch before production application.
They run as an explicit deployment step, never opportunistically during a
serverless request. The content seed and administrator bootstrap are explicit,
idempotent commands and are not part of normal application startup.

## Testing and Acceptance Criteria

### Unit tests

- CUID2 generation and consistent string-key schemas
- Homepage, project, post, media, and site-profile Zod schemas
- Slug normalization and reserved-path rejection
- Tiptap node allowlisting and rendering transformations
- Reading-time derivation and published snapshot selection
- Cache-tag selection for every content mutation

### Database integration tests

- Draft changes do not alter published reads
- Publish, unpublish, trash, restore, and permanent-delete transitions
- Homepage publication is atomic across content, visibility, and ordering
- Featured projects drive homepage build cards without duplicate content
- Media usage prevents deletion of referenced assets
- Optimistic concurrency rejects stale saves
- Content seed and administrator bootstrap are idempotent
- Failed publication leaves the prior published snapshot intact

### End-to-end tests

- Anonymous visitors cannot open admin, preview, mutation, or upload routes
- The seeded administrator can sign in, sign out, and change the password
- Public signup attempts fail even when sent directly to the auth endpoint
- Projects and posts can be created, edited, previewed, published, unpublished,
  trashed, and restored
- Published edits remain private until `Publish changes` is confirmed
- Homepage sections can be edited, hidden, reordered, previewed, and published
- Cloudinary uploads register assets and enforce alt text and deletion rules
- Existing project and post URLs render the migrated content
- Sitemap and metadata contain only published records

### Release checks

The release must pass lint, TypeScript checking, automated tests, and a
production Next.js build. A migration rehearsal on a Neon branch must succeed,
followed by a smoke test of login, draft preview, publication, public rendering,
and media upload. No implementation is considered complete while a required
flow remains unverified.
