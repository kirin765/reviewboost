# Playwright smoke artifacts

Curated smoke artifacts from the manual Playwright CLI pass.

## Screenshots
- `screenshots/home.png`
- `screenshots/pricing.png`
- `screenshots/login.png`
- `screenshots/dashboard-desktop.png`

## Console logs
- `logs/home-console.log`
- `logs/dashboard-desktop-console.log`

Both logs contain the same dev-only HMR websocket error from Next dev server:
- `ws://127.0.0.1:3001/_next/webpack-hmr`
- This is caused by `allowedDevOrigins` not including `127.0.0.1:3001`.
- It did not block the smoke run or the Playwright test suite.

## Mobile drawer state snapshots
- `snapshots/dashboard-mobile-open.yml`
- `snapshots/dashboard-mobile-closed.yml`
- `snapshots/dashboard-mobile-open-again.yml`

These YAML snapshots are the most reliable artifact for the mobile drawer flow because they capture the accessible state and visible controls directly.

## Raw artifacts
The unfiltered raw Playwright CLI output remains in:
- `output/playwright/.playwright-cli/`
