# Videos from the Dockentra YouTube channel

Added 2026-10-19. The owner adds a video in **/admin/videos** by pasting its YouTube link; once published it appears on **/videos**, and with "Show on homepage" also in the homepage section "See the work" (up to three).

## How it works

- **Only the Dockentra channel.** The server asks YouTube (oEmbed) who uploaded the video and refuses anything not from `https://www.youtube.com/@Dockentra` (`src/lib/videos/youtube.ts`).
- **Only the ID is stored.** `website_videos.youtube_id` is checked against `^[A-Za-z0-9_-]{11}$`; the player is built from the ID, so nothing typed in the admin can become markup.
- **New videos start as drafts.** Publish, unpublish, show on homepage, edit title/description, order, mark as a vertical Short, remove (from the website only; the video stays on YouTube).
- **Nothing loads from YouTube until a visitor presses play.** The still is served by this site (`/video-thumbs/<id>`, only for IDs on the list); the player is `youtube-nocookie.com` (privacy-enhanced mode). The privacy policy says so.
- **CSP:** `frame-src` names `https://www.youtube-nocookie.com` (and Turnstile behind its key). No image, script or connect host was added.
- **Search:** each published video gets a `VideoObject` (upload date from the channel's RSS feed). `/videos` is `noindex` and out of the sitemap while it has no published video. The channel is in `LocalBusiness.sameAs` and the footer.
- **Fails closed:** if the store cannot be reached, public pages show no videos and the admin screen says videos are unavailable.

## Activation in production (owner approval required)

The table does not exist until migration **`supabase/migrations/0009_website_videos.sql`** is applied to the WEBSITE Supabase project. It is additive (one new table, RLS on, nothing granted to `anon`/`authenticated`) and idempotent.

1. Supabase dashboard → the website project → SQL Editor → paste the file → Run.
2. Deploy the site (persistence follows `PRICING_PERSISTENCE`, i.e. Supabase in production; `VIDEOS_PERSISTENCE` can override).
3. /admin/videos → paste a link → Add → Publish.

Until step 1 the site behaves exactly as before: no videos section, `/videos` says "No videos here yet" and is `noindex`.

## Making YouTube and the site help each other (owner, in YouTube Studio)

YouTube does not promote a website for free; paid YouTube ads are a separate decision. What does help, at no cost:

- **Channel → Customisation → Basic info → Links:** add `https://dockentra.ie` (first link is shown on the channel banner).
- **Every video description:** first line `https://dockentra.ie/…` pointing at the matching page (e.g. TikTok Shop video → `/services/tiktok-shop-fulfilment`).
- **Titles and descriptions** in the words people search: "fulfilment Ireland", "TikTok Shop fulfilment Ireland", "Amazon FBA prep Ireland", "Limerick".
- **Only claim what is true on the day:** a warehouse walkthrough video tells viewers the warehouse is operating; keep it consistent with the "Opening Soon" status on the site.
- Add the video to the site here, so the page and the video link to each other.
