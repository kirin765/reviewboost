# ReviewBoost extension 1.5.3 release

Submitted to all four stores on 2026-10-14 (Asia/Seoul).

| Store | Version | Verified status |
| --- | --- | --- |
| Chrome | 1.5.3 | Pending review; automatic publication enabled |
| Firefox | 1.5.3 (AMO version `6575276`) | Public; signed XPI downloaded; readable source uploaded |
| Whale | 1.5.3 | Under review |
| Edge | 1.5.3 | In review; replaced the pending 1.5.2 submission |

## Changes

- Preserve Coupang title-only and rating-only reviews in Excel/CSV exports.
- Recover reviews omitted by truncated overall feeds using latest-first and rating filters, deduplicating by review ID and stopping at the requested unique count.
- Show export/text-analysis counts and retain partial-result notices in restored history.
- Keep rating-only rows out of text analysis.

## Validation

- TypeScript check passed; 195 tests passed across 23 files.
- Chrome and Firefox builds passed on Node 22.23.2.
- Live public product views contained 1,667 unique IDs; replay through the fixed collector exported all 1,667 rows (502 with text).
- ZIP integrity, root manifests (1.5.3), and packaged bytes checked against build output.
- Firefox signed XPI scripts/assets match the build; Mozilla reformatted the manifest without changing its JSON values.
- Edge and Whale packages use the identical Chromium build.

## Artifacts

| File | SHA-256 |
| --- | --- |
| `reviewboost-extension-1.5.3.zip` | `66caa5840b602f36d09768dc05e2119af1758da650bb5efad881477fa4db2033` |
| `reviewboost-extension-edge-1.5.3.zip` | `66caa5840b602f36d09768dc05e2119af1758da650bb5efad881477fa4db2033` |
| `reviewboost-extension-whale-1.5.3.zip` | `66caa5840b602f36d09768dc05e2119af1758da650bb5efad881477fa4db2033` |
| `reviewboost-extension-firefox-1.5.3.zip` | `8c95cae0244d6dc22aa4b65fd970f633db0b96e9a4d79be16d0d07013e0bbd6c` |
| `reviewboost-extension-firefox-1.5.3-source.zip` | `e10715b4f03604f9377202278d92255bac433708c5775f981c8582d56340dfb3` |

| `reviewboost-extension-firefox-1.5.3.xpi` | `78ff4d1b72152c8965350210fac731209a2a0679c4a8c94fec04c6df2323c66c` |

## Submission notes

Firefox source archive was uploaded to AMO version `6575276`. Validation returned zero errors and one Android minimum-version warning; this extension targets desktop Firefox. Edge accepted a separate 1.5.3 draft while 1.5.2 was in review. The older review was cancelled, certification notes were supplied, and 1.5.3 was submitted successfully. Dashboard confirms In review.
