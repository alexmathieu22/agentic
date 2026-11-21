---
name: record-demo
description: >
  Use when a change touches the frontend and the pull request needs a screenshot
  of it, and a video when it is interactive. Captures both from the running app
  with Playwright in a headless browser, so it works in a sandbox with no display.
metadata:
  domain: engineering.coding
compatibility: Requires node, and either Playwright preinstalled in /opt or network access to its browser download
---

# Record a demo

A frontend change carries a screenshot of the change, and a video of it being used
when it is interactive (see `pull-request`).
In a sandbox there is no screen to capture, so drive the app with Playwright in a
headless browser and let it record.

## Steps

1. **Start the app** the way the repo does (its dev or start script), in the
   background, and wait until it answers on its port.
2. **Get Playwright outside the repo**, so the branch gets no new files. If the
   sandbox has it already (`ls /opt/playwright /opt/pw-browsers`), use that and
   skip the install:

   ```bash
   export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
   export NODE_PATH=/opt/playwright/node_modules
   ```

   Otherwise install it, with the browser in your own home, not root's:

   ```bash
   mkdir -p ~/pw && cd ~/pw && npm init -y && npm i playwright
   export PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers
   npx playwright install chromium
   sudo env "PATH=$PATH" npx playwright install-deps chromium
   ```

3. **Script the flow from the ticket**, end to end, and add the empty and error
   states when the change adds them. Slow it down a little so a person can follow:

   ```js
   const { chromium } = require('playwright');   // a .cjs file, so NODE_PATH finds it
   const browser = await chromium.launch();
   const ctx = await browser.newContext({
     viewport: { width: 1280, height: 720 },
     recordVideo: { dir: '/tmp/factory-demo', size: { width: 1280, height: 720 } },
   });
   const page = await ctx.newPage();
   await page.goto('http://localhost:PORT/');
   // ...hover, click, type: the feature being used, with page.waitForTimeout(600) between steps
   await ctx.close();   // the video is written when the context closes
   await browser.close();
   ```

4. **Take the screenshot first**, one per state the change adds or alters, with
   `await page.screenshot({ path: '/tmp/factory-demo/<state>.png' })`. Then the
   video, only when the change is interactive.
5. **Leave the files in `/tmp/factory-demo/`.** Check they are there and not
   empty. Keep a video to under a minute.

## If it fails

Say so under *Screenshots and demo* in the pull request description, with the reason (the
download was blocked, the app would not start) and the steps to see the feature
by hand. Do not leave the section out, and do not fake a recording.

## Done when

`/tmp/factory-demo/` holds a screenshot of the change (and a video when it is
interactive), or the description says plainly why it does not.
