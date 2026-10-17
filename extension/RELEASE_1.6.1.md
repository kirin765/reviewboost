# ReviewBoost extension 1.6.1 release

Release prepared and submitted on 2026-10-14 (Asia/Seoul).

| Store | Version | Verified status |
| --- | --- | --- |
| Chrome | 1.6.1 | Pending review; automatic publication enabled |
| Firefox | 1.6.1 (AMO version `6575701`) | Public; signed XPI downloaded; readable source uploaded |
| Whale | 1.6.1 | Under review; replaced pending 1.6.0 |
| Edge | 1.6.1 | In review; replaced pending 1.6.0 |

## Changes

- Restore SSG review collection after its review wrapper changed from li to div.
- Include rating-only reviews in collection and Excel/CSV exports across supported shopping sites.
- Add the persisted “별점만 있는 리뷰도 포함” option, enabled by default.
- Send only reviews with text to text analysis.

The local code still used version 1.6.0, already submitted earlier today; release manifests and package metadata were advanced to 1.6.1.

## Validation

- TypeScript check passed; 240 tests across 26 files passed.
- Chrome and Firefox builds passed.
- ZIP integrity, root manifests (1.6.1), and packaged bytes checked against build output.
- Firefox readable source submitted with the version; signed XPI assets and manifest values match the build.

## Artifacts

| File | SHA-256 |
| --- | --- |
| `reviewboost-extension-1.6.1.zip` | `bd48248322302ad2a833011363ca50ab2ca55eb126a6bdf56fc339de7897177c` |
| `reviewboost-extension-edge-1.6.1.zip` | `bd48248322302ad2a833011363ca50ab2ca55eb126a6bdf56fc339de7897177c` |
| `reviewboost-extension-firefox-1.6.1-source.zip` | `44ceb586def0a48dea207f7fe3783f10b557ff74bca9b90480b4378cb8d66f4a` |
| `reviewboost-extension-firefox-1.6.1.zip` | `cf406ee2b2186c9285df916892e941a26ec3983e447973bbcf0f528a00fdddbb` |
| `reviewboost-extension-whale-1.6.1.zip` | `bd48248322302ad2a833011363ca50ab2ca55eb126a6bdf56fc339de7897177c` |
| `reviewboost-extension-firefox-1.6.1.xpi` | `1d95a7ff410ddd911a0fc5cb69d7d03d25f6a35149caa5e464b23e5ccb08ccf9` |
