# ReviewBoost extension 1.6.0 release

Submitted on 2026-10-14 (Asia/Seoul).

| Store | Version | Verified status |
| --- | --- | --- |
| Chrome | 1.6.0 | Pending review; automatic publication enabled |
| Firefox | 1.6.0 (AMO version `6575472`) | Public; signed XPI downloaded; readable source uploaded |
| Whale | 1.6.0 | Under review; replaced pending 1.5.3 |
| Edge | 1.6.0 | In review; replaced pending 1.5.3 |

## Changes

- Add Kakao Talk Store public review collection and Excel/CSV export.
- Normalize its four-point ratings, deduplicate review IDs, and show partial-result notices.
- Preserve collected Coupang reviews when alternate feeds are blocked.

## Validation

- TypeScript check and 231 tests across 25 files passed.
- Chrome and Firefox builds passed.
- ZIP integrity, root manifest version, and every packaged file checked against build output.
- Signed Firefox XPI scripts/assets and manifest values match the build.
- AMO validation: zero errors; one Android minimum-version warning (desktop Firefox target).
- Chrome and Edge host-permission explanations updated for store.kakao.com.

## Artifacts

| File | SHA-256 |
| --- | --- |
| `reviewboost-extension-1.6.0.zip` | `35dc836f0a3fe92da8782071827e308a243faebf0fcfc5a81b135a24d35545dc` |
| `reviewboost-extension-edge-1.6.0.zip` | `35dc836f0a3fe92da8782071827e308a243faebf0fcfc5a81b135a24d35545dc` |
| `reviewboost-extension-firefox-1.6.0-source.zip` | `2be11860b489cdbb08d4ecc748c12d4cafd56dd9372452cba89f036fbbbc0de5` |
| `reviewboost-extension-firefox-1.6.0.xpi` | `8e5c17ec524aa41e3b877fd57326d9f7534034d9d538f52870cb53327cc0a803` |
| `reviewboost-extension-firefox-1.6.0.zip` | `3628c13dad76319dbb8cf26fd4de57bef199d98fe7e9ba2d73da1b94451e8515` |
| `reviewboost-extension-whale-1.6.0.zip` | `35dc836f0a3fe92da8782071827e308a243faebf0fcfc5a81b135a24d35545dc` |
