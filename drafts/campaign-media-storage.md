# Campaign purposes and media storage

Public links now resolve by backlinks.slug (`?token=...`), never sequential campaign
IDs. New slugs use nanoid(24); existing random slugs remain valid. Public media pages
also look up the slug. Numeric-only redirect/view links return 404 intentionally;
previously downloaded QR codes containing numeric URLs must be regenerated.
Internal campaign IDs remain numeric behind owner authentication. Random tokens
reduce guessing; they are public sharing links, not authorization for private data.

Development migration 003 adds purpose, qr_payload, content_data and a campaign_assets
metadata table. Original campaigns default to URL. The creation wizard supports all
eight generator content types plus PDF, MP3 and gallery (up to 12 links).

URL/media campaigns encode a tracked redirect. PDF/media links lead to a public
landing page; these pages validate campaign status, backlink ownership and expiry.
Other types encode direct content and cannot count scans. QR payloads are saved
to the authenticated owner's campaign; only media content is exposed publicly.
Do not share Wi-Fi/contact QR content unless intended for recipients.

Vercel Blob was selected by the user. Creating qrgenme-campaign-media in the existing
team/project returned 403; no store was created. There is no active upload endpoint
and no token has been retrieved. Current media campaigns accept existing public
HTTPS file links and work without Blob; the wizard states this limitation explicitly.

To finish uploads: create/connect a Blob store to qr_generator in Vercel Storage,
provision development credentials privately, then add authenticated client-upload
tokens with MIME/size/quota restrictions, owned asset verification, finalization
callbacks and orphan/delete cleanup. Public campaign files must be disclosed as
public before upload. Never put Blob credentials in client code or chat.
Suggested initial limits: PDF 10 MB, MP3 25 MB, gallery 12 images × 5 MB; enforce
in both token issuance and finalization, not just in the file picker.

The reserved SQL assets table alone does not enable uploads. File bytes do not go
into Neon. Account deletion must also delete owned blobs once Blob uploads are wired;
SQL cascading deletion does not remove remote files.

## Upload implementation (development)

Blob credentials are now configured locally. Authenticated uploads use the official
@vercel/blob SDK through a bounded server endpoint. The initial limit is 3 MB per
file (below Vercel function request limits), 12 images per gallery, 100 assets /
100 MB per account. The server inspects file signatures and sets MIME itself.
The owner must acknowledge public availability before selecting files.
Campaign creation locks and verifies asset ownership, MIME, URLs and unused status
before attaching them. Unattached files can be removed from the creation form.
Leaving the page without saving retains uploaded files and they count toward quota;
a reusable asset library and scheduled abandoned-file cleanup are still pending.
Account deletion removes managed blobs before cascading SQL deletion.
A real synthetic PNG upload/download/attachment test passed; fixture blobs and rows
were removed. No production deployment or production DB migration was performed.
