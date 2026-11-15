# Direction A UI refresh — 2026-11-15

Claude produced the frontend design and reviewed actual desktop/mobile screenshots after researching official studio sites: Inko, studio fnt, Untitled Macao, Wang Zhi-Hong, Marx Design, Bleed, Mucho, and A Practice for Everyday Life. Codex reviewed the implementation, repaired integration issues, and ran the release checks.

## Preserved contracts

- Existing floating category selector, category dialog, Close and permanent Back to Top controls retain their source and global styles.
- Animation source, durations, easing and keyframes are unchanged. The CSS module contains no animation, transition, transform, opacity or clip-path declarations.
- Closing a detail restores the position before opening it. Reading multiple Next cases retains the first list entry; browser Back/Forward keeps its existing semantics.
- Runtime content, ordering, publishing, media, chapter pairing, admin persistence, provider boundaries and Print/PDF code are unchanged.

## Visual changes

An isolated CSS module refines the wordmark presentation, editorial list spacing, bottom-aligned desktop text, complete uncropped list images, typography, metadata contrast, detail introduction and chapter hierarchy. No new fonts, dependencies or navigation entries were introduced.

Codex identified that transition text clones leave the list's DOM ancestry. Claude supplied the CSS correction so detached clones retain the same typography and geometry, without changing transition behavior. A regression test compares the real text and detached clone at 390, 820 and 1440 pixels. Codex also restored the original 1.2 detail-title line height after the existing readability check rejected the tighter first draft.

## Validation

- `npm ci`, `npm run typecheck`, `npm test`: passed; 64 unit tests.
- `npm run test:e2e`: 76/77 passed initially; the remaining detail-title check passed after restoring line height, using a targeted rerun. This is not a claim of a second complete 77-test run.
- `npm run build`, `npm run build:pages`: passed. The final Pages test command rebuilt the final stylesheet and passed all 13 tests.
- `npm run test:e2e:pages`: 13/13 passed, including base-path Close return position, Next case history, runtime content and admin flows.
- `npm run test:official`: 5/6 passed on the unchanged baseline before UI edits. Existing failure: N001 has no imported V3 provenance, at `tests/official/content-integrity.test.ts:74`. No formal content or integrity assertion was altered to hide it.
- Manual desktop, tablet and mobile review; complete-image rendering; original category dialog geometry/font/background/animation compared before and after.
- Secondary ink on paper computes to 5.40:1 contrast. Credential scan and `git diff --check` passed.

Release verification must also confirm the Pages workflow SHA and run dependency installation, typecheck, tests and Pages build in a fresh code-only clone.
