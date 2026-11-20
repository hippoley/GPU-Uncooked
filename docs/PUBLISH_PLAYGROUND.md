# Publishing GPU Uncooked's playable chapters

## Verified so far

The three chapters pass Node model tests. Chromium automation tested desktop (1440×900) and mobile (390×844) viewports and generated screenshots through the `Browser acceptance and screenshots` workflow. Browser screenshots are CI artifacts, not a public website.

## Production publication

The repository includes `.github/workflows/pages.yml`. It is configured to support both the feature preview branch and main, plus manual dispatch. Deploying the feature branch permits a public preview **without merging** the Draft PR. GitHub Pages may serve the same canonical site URL for both sources, so the last successful deployment determines visible content. The contents of `playground/` become the Pages site, and `playground/chapters/index.html` is copied to the site root `index.html`.

A repo administrator must select **Settings → Pages → Build and deployment → Source: GitHub Actions**. The current GitHub connection does not provide a Pages-settings mutation. For an early preview, select **Settings → Pages → Build and deployment → Source: GitHub Actions**, then run the `Publish CUDA Playground to GitHub Pages` workflow on the feature branch if it appears in Actions, or push a new feature-branch commit after GitHub recognizes the workflow. After reviewing/merging PR #2, the main push trigger can publish the reviewed version. Confirm the deployment URL reported by the workflow and manually open Chapters 01–03 on desktop and mobile.

The *expected* Pages URL (only after successful activation/deployment, not currently verified) is:
```
https://hippoley.github.io/GPU-Uncooked/
```

## Validation gates

- The browser acceptance workflow succeeds and screenshots can be inspected.
- Pages deployment concludes success and the public homepage returns HTTP 200.
- All three games load as JavaScript modules, work with keyboard controls, and link to next chapter.
- No GPU measurement claims are made merely from browser simulation.
- Security, copyright and technical precision reviewed before public announcement.

## If deployment is blocked

Do not report the expected URL as live. Check repository Pages settings, workflow permissions (`pages: write`, `id-token: write`), and GitHub Actions logs. Keep PR #2 as Draft until the chosen merge criteria are met. A successful deployment of the feature branch is only a preview, not a sign that GPU performance evidence has passed.
