# ReviewBoost extension 1.5.2 release

Submitted on 2026-10-11 (Asia/Seoul). Adds Olive Young collection and fixes platform names in the popup/history.

| Store | Item | Verified status |
| --- | --- | --- |
| Chrome | `kdmjkpfbccikgbaemcbifemeichmehlm` | Pending review; automatic publication enabled |
| Edge | `miocbdjngjgioklfjoimedfjmlfmhdli` (product `12dac2f6-a562-40de-a15e-ba5441811b64`) | In review |
| Whale | `bkenmdkiidkgeopjnaaafomacfjfciai` | Under review; version 1.5.2 |
| Firefox | AMO `3078940`, version `6562580`, file `5106718` | Public; signed XPI downloaded |

Firefox readable source was uploaded to the version through the AMO API. Chrome's listing homepage was set to `https://reviewboost.co.kr/` because `/extension` currently returns 404. Packaged `homepage_url` still points to `/extension`; that website page is part of the separate uncommitted redesign. Store descriptions and Olive Young host permission justifications were retained/updated. Edge certification notes provide the free Olive Young collection/export test steps.

Validation: extension TypeScript check and all 184 extension tests passed; Chrome and Firefox builds succeeded. The collector was previously verified with 15 live Olive Young reviews and CSV/XLSX export.

## Local artifacts (excluded from Git)

| File | SHA-256 |
| --- | --- |
| `reviewboost-extension-1.5.2.zip` | `dc406c8a34e9f9a4a54e1788f9117443fcdf5fd6462b73e49ec27fe1e116231d` |
| `reviewboost-extension-edge-1.5.2.zip` | `dc406c8a34e9f9a4a54e1788f9117443fcdf5fd6462b73e49ec27fe1e116231d` |
| `reviewboost-extension-firefox-1.5.2-source.zip` | `e82b4f1d08a37421d8aacd126a800670e32c1a1f7b9244669beefdd46de65b27` |
| `reviewboost-extension-firefox-1.5.2.zip` | `38a9c6f7aa20e75a993ece29506fda96c1dfd6dde7c5053b68be387052bf9732` |
| `reviewboost-extension-whale-1.5.2.zip` | `dc406c8a34e9f9a4a54e1788f9117443fcdf5fd6462b73e49ec27fe1e116231d` |
| `reviewboost-extension-firefox-1.5.2.xpi` | `9d76ed7b2ebbeecd42760d270e564ffe872f254e6b966bfb625f09d8b9a37430` |
