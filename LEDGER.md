# Ledger — sessions and costs

Sessions and costs; moved from `STATUS.md` on 2026-10-22, #241 (5). The text below is verbatim; the lead designer appends new sessions here.

## Sessions so far

| Role | Session | Model | Cost (USD) |
|---|---|---|---|
| Reviewer, PR #1 | session_017Cy1rPGkyASqr46YBiqRA5 | fable-5-1 | 3.57 |
| Physics checker, L0 | session_01DWTkmgnhZ8uX5wY5crffj2 | sonnet-5-5 | 0.89 |
| Engineer, L0 fixes | session_012k8zVPth3PETHnbHhoZkrW | opus-5-5 | 1.54 |
| Engineer, L0 v2 | session_017g15v5xSD3RWWRRWtzuBCJ | opus-5-5 | 1.77 |
| Reviewer, fixes and v2 | session_0135xRdTHuFwAefY16Hy5vfu | fable-5-1 | 4.70 |
| Physics checker, v2 | session_01XqJFVUAYNUWsmcR9Vh8Qur | sonnet-5-5 | 0.80 |
| Nightly regression, test 1 (no repo) | session_01ApfJTLNkjCfepi7fVjyFW8 | sonnet-5-5 | 0.09 |
| Nightly regression, test 2 (no `add_repo`) | session_01Md1GQ7LftRREZ1w6sZyMpb | sonnet-5-5 | 0.09 |
| Nightly regression, test 3 (works) | session_01RQvwmFsoF6vu1G5wzQJsnP | sonnet-5-5 | 0.09 |
| Engineer, L1 (PR #5) | session_01NEZ3dFYvXRDcUQJWexkacC | opus-5-5 | 6.65 |
| Physics checker, L1 | session_01GmQGV34nzAo394dCthy28J | sonnet-5-5 | 1.22 |
| Engineer, L1 fixes (#185, #187) | session_01TQvnSvo7qZzJ4HBuas89nY | opus-5-5 | 2.65 |
| Reviewer, L1 | session_01RYgtwmNTAS4VRWxefHDetg | sonnet-5-5 | 1.19 |
| Engineer, L1 review fixes (#189) | session_014jtbGrQdvSycQU8E6stAeY | opus-5-5 | 4.97 |
| Reviewer, L1 re-review | session_01GsfMyFUqaSXRsVGQhELH2U | sonnet-5-5 | 0.53 |
| Engineer, L2 rows 1–12 (PR #15) | session_0111ENvC2XXCj4tA5T9zTZQ7 | opus-5-5 | 11.48 |
| Engineer, L2 heat v2 and heat sink | session_011dfRdXfFAYsLmAY2C9a6Qg | opus-5-5 | 8.25 |
| Physics checker, L2 | session_01KdLbYYddDJgStcfriEdqsv | sonnet-5-5 | 2.82 |
| Reviewer, L2 | session_01AKKABP9PxiAjtEkN1wcowa | sonnet-5-5 | 1.34 |
| Engineer, D pass (PR #24) | session_012PgbFfMKtgaDjSpVz451eZ | opus-5-5 | 7.83 |
| Engineer, D-pass fixes (#212) | session_01VgbfDLKbvp1rTyfbnxLcNd | opus-5-5 | 2.93 |
| Physics checker, D pass | session_01UFe2RUu58iTgEttPPf5dZ4 | sonnet-5-5 | 2.26 |
| Reviewer, D pass | session_01TVQqxMbuhGDobwni8xCnqq | sonnet-5-5 | 1.09 |
| Engineer, L3 (PR #35) | session_01LapPHkFEVnX7ADLbgrCENH | opus-5-5 | 13.09 |
| Physics checker, L3 | session_014dyKkuWtmsZa9fcmrS8jkp | sonnet-5-5 | 3.22 |
| Engineer, L3 fixes 1 (#219, stopped on Q13) | session_016VbwLzzv4YyZZL383cPXbx | opus-5-5 | 2.94 |
| Engineer, L3 fixes 2 (#219, #220) | session_01AQ4WNuYgQLBevpeWC2HZku | opus-5-5 | 3.12 |
| Reviewer, L3 | session_01WR2QvB555iEiVuoLRBQS7A | sonnet-5-5 | 1.45 |
| Engineer, mass pass (PR #40) | session_019smwJw2FbuFFrWfmYWTDmz | opus-5-5 | 8.07 |
| Reviewer, mass pass | session_012AUgxm8yu3YHzVQ5gLjGC9 | sonnet-5-5 | 0.83 |
| Engineer, feel prototype | session_011PcMxJ4ydx4kZctZb2Gefn | opus-5-5 | 5.41 |
| Engineer, prototype loadout | session_013115n9cwYfUvYMg8ij5ed4 | opus-5-5 | 3.71 |
| Engineer, prototype export and replay | session_01D3M6QwPL2KWFkX1Scsi4fd | opus-5-5 | 2.93 |
| Reviewer, feel prototype (PR #42) | session_01FHeYxhXNqrCLrjyT1kpwia | sonnet-5-5 | 0.31 |
| Engineer, path model (PR #48) | session_01GVBq5ohYZDDfg15HAkHm71 | opus-5-5 | 13.57 |
| Physics checker, path model | session_01PsqTHfLh2EPTgKeY3KroeR | sonnet-5-5 | 4.08 |
| Reviewer, path model | session_01D2L2Kyg1bin1QGk1UZQvfW | sonnet-5-5 | 0.59 |
| Engineer, prototype v2, created on the wrong model and archived after 35 s (the lead designer's error) | session_01Tf9UpKXmBCZJZbj4Rj2s8M | fable-5-1 | 1.12 |
| Engineer, prototype v2 (PR #51) | session_013XH7jici9kFqQf6EJYqURu | opus-5-5 | 11.73 |
| Reviewer, prototype v2 (PR #51; no blocking finding, 4 non-blocking) | session_01EjFiN5BcJedtsbn1K6ucc6 | sonnet-5-5 | 1.00 |
| Docs audit (read-only; report on `audit/docs`, `audit/2026-10-21-docs.md`: 72 findings) | session_01RwaxZTmMVcMs2QbrF8KohP | sonnet-5-5 | 6.59 |
| Physics system audit (read-only; `audit/physics`, `audit/2026-10-21-physics.md`: 29 findings) | session_01VxycQ6zZQf69yMEK5QXyJr | opus-5-5 | 3.78 |
| Scenario quality audit (read-only; `audit/scenarios`; it spawned sub-agents) | session_01Pr1RKAyvUNZpe8ticEBuyF | sonnet-5-5 | running, 12.42 at 23:41 UTC |
| Scenario quality audit (read-only; `audit/scenarios`; spawned sub-agents; stopped at the cap, 322/332 mutations) | session_01Pr1RKAyvUNZpe8ticEBuyF | sonnet-5-5 | 15.03 |
| Engineer, documents consolidation (PR #52) | session_01HKAWbNEcwdtowpBUb7i2Jo | sonnet-5-5 | 2.42 |
| Reviewer, consolidation (PR #52; one blocking, eight non-blocking) | session_01JAdhmiLBQzzCJa8ZNjcMTE | sonnet-5-5 | 1.70 |
| Engineer, physics pass 2 (PR #54; locks `4f39a0e`, `c9224e2`; 71 scenarios) | session_017TbugELy7BgwKBUJsKhZHd | opus-5-5 | 29.34 |
| Physics checker, pass 2 (blind, from the lock; `checker/pass2`) | session_01FgK1kvqH6KcixryHNyjJug | sonnet-5-5 | 2.84 |
| Reviewer, pass 2 (PR #54; no blocking, 12 notes) | session_01UCbwmbarXpLmZ8QbgMVQYK | sonnet-5-5 | 2.24 |
| Engineer, pass 2 fix round 1 (S6 successor, #249) | session_012dBdWLjk4QsAwftq8yQQY1 | opus-5-5 | 5.12 |
| Engineer, pass 2 fix round 2 (frozen records, #250; the first session to notify the lead designer by trigger) | session_014Kqr2R7XYXWHmsaCNEqKfo | opus-5-5 | 2.31 |
| Reviewer, pass 2 fix rounds 1–2 (light re-review; no blocking) | session_017FizntYRrBaAFYhdC4bsbW | sonnet-5-5 | 1.08 |
| Engineer, `tools/mutate` (PR #56; 123 mutations) | session_01ELZUpkHg9fxfaMzLyCp5R5 | opus-5-5 | 6.96 |
| Reviewer, `tools/mutate` (PR #56; no blocking, 6 notes) | session_01Fnct3X7paeLnNUSBXDGirU | sonnet-5-5 | 0.95 |
| Engineer, L4a (`m0/l4a`, PR #58; worker restarted, earlier cost not reported) | session_01FpUHAGXwS7MQ9fDiQV6M31 | opus-5-5 | ≥ 2.32 |
| Physics checker, L4a (blind, from lock `6feb7e0`; `checker/l4a`; 0 mismatches, 3 discrepancies) | session_017mYp4vpcVbLbTrXruRXDP5 | sonnet-5-5 | 2.83 |
| Reviewer, L4a (PR #58; 2 blocking for the lead designer, 9 notes) | session_01JLq9WkPYXvq2MKY4iWZUxt | sonnet-5-5 | 1.81 |
| Engineer, L4a fix round (#258; head `fe32dc5`) | session_013MRAhtyyGbE3gKKimEYvsH | opus-5-5 | 8.01 |
| Physics checker, L4a fix round (blind, from lock `7399706`; 0 mismatches, 3 wording gaps) | session_01Wr6puuwLsvDJzWzrQYRdPN | sonnet-5-5 | 1.62 |
| Reviewer, L4a fix round (PR #58, light re-review; 0 blocking, 3 notes) | session_01LQ9KUec9DtX8tjySLLvMur | sonnet-5-5 | 0.98 |
| Engineer, L4b (`m0/l4b`, PR #62; 15 scenarios, 171 mutations) | session_01MwEE8qKmDVhDfvqWe4UnWn | opus-5-5 | 19.06 |
| Physics checker, L4b (blind, from lock `e5c67dc`; `checker/l4b`; 0 discrepancies, 4 notes) | session_01Fhhp1vQjFJpdW3v1XjiUqi | sonnet-5-5 | 3.91 |
| Reviewer, L4b (PR #62; 0 blocking, 9 notes) | session_0191sXFiff1SUfcYSCCYKYiL | sonnet-5-5 | 1.01 |
| Audit before L5, documents (light; `audit/l4-docs`; 32 findings) | session_015MiuXbDJDY3ER7gYb4HMt3 | sonnet-5-5 | 1.70 |
| Audit before L5, process (light; `audit/l4-process`; 10 findings) | session_016xMPBjzauERJgfNVoFhTbE | sonnet-5-5 | 0.91 |
| Audit before L5, physics (light; `audit/l4-physics`; 20 findings) | session_01PxqWgmGKWgnmYN4z3Sb9v7 | sonnet-5-5 | 2.33 |
| Audit before L5, scenarios (light; `audit/l4-scenarios`; 19 findings; notified by trigger) | session_01KLRjP6m3agMAXhhbdn8thh | sonnet-5-5 | 1.97 |
| Engineer, L4 fix (`m0/l4-fix`, PR #64: the physics audit's B1, `L4.books.two`, `battle.openingRange`; notification not on record) | session_01AFipcrRMycb5uqDDcB1fB9 | opus-5-5 | 6.41 (4.51 when #272 was written; the session resumed after the usage limit, re-anchored `l4b.rel.worldSpeed`, kept its partial mutation log and notified by trigger at 13:36 UTC) |
| Reviewer, L4 fix (PR #64, light; 0 blocking, 4 notes; notified by trigger) | session_01UTmHgSuJy1TgUL28GNf5Lv | sonnet-5-5 | 0.42 |
| Engineer, L4 scenario-hygiene round, take 1 (stopped at the account's five-hour usage limit before writing anything, 12:48 UTC) | session_01GCEtFEw9Yx3QSA9geWZgTH | opus-5-5 | not reported |
| Engineer, L4 scenario-hygiene round, take 2 (`m0/l4-hygiene` from `41a417b`, §13l.7, #271) | session_01L8hXHHD5QjjkMEFSnzGvw4 | opus-5-5 | 10.58 (PR #67, head `4f34ecb`; 20 scenarios; notified by trigger) |
| Physics checker, L4 scenario-hygiene round (blind, from locks `c998ff2` and `9a87d0f`; `checker/l4-hygiene`) | session_01Jyjqm388W1Vokm8gHDRcge | sonnet-5-5 | 4.06 (0 numeric mismatches, 4 label discrepancies, 7 gaps; notified by trigger) |
| Reviewer, L4 scenario-hygiene round (PR #67; 0 blocking, 7 notes; notified by trigger) | session_01GiA5hCfSYz1org75B46PLC | sonnet-5-5 | 1.25 |
| Engineer, L5a the kinetic pass (`m0/l5a-kinetic`, PR #73, head `d3314ff`; 18 scenarios, 12 withdrawn; notified by trigger) | session_01SYb2ggvdzrs6Wkv4poedYu | opus-5-5 | 16.82 |
| Physics checker, L5a (blind, from lock `4e217c0`; `checker/l5a`; 4 discrepancies, none changing a verdict; notified by trigger) | session_01XkBuUzH7GYPyvKqtXN5Njc | sonnet-5-5 | 1.90 |
| Reviewer, L5a (PR #73; 1 blocking, 3 decisions, 6 notes; notified by trigger) | session_01NDg1145HtJvSBDeUX9x453 | sonnet-5-5 | 1.03 |
| Engineer, L5a fix round (#282 (7), head `d9e55d1`; 3 successors; notified by trigger) | session_01SvoQV7Y7js179KxHYMir2p | opus-5-5 | 3.34 |
| Reviewer, L5a fix round (PR #73, light; 0 blocking, 3 notes; notified by trigger) | session_01NwAEJ4ozPa3ZESrSXUBpbN | sonnet-5-5 | 0.45 |
| Engineer, L5m (`m0/l5m-turret`, PR #78; 12 successors, `L0.turret.mount`; stopped rightly on three route changes; notified by trigger) | session_01WLVDoUFqy72Yq2qdMomSCo | opus-5-5 | 7.97 |
| Engineer, L5m route successors (#286; 3 successors, data notes; notified by trigger) | session_01CqGVA6ZLNPcKvXynVkDxjY | opus-5-5 | 4.04 |
| Physics checker, L5m (blind; `checker/l5m`; 0 blocking, 5 notes; notified by trigger) | session_01RK9ndyzx6r1Vezi6AGKrpY | sonnet-5-5 | 1.73 |
| Reviewer, L5m (PR #78; 0 blocking, 8 notes; notified by trigger) | session_01QHhyCxx64XvgAXGSeEBbaU | sonnet-5-5 | 1.35 |
| Engineer, L5b senses and the knowledge model (`m0/l5b-senses`, PR #84, head `3b2bd51`; `js/sensors.js`, S1–S9, 7 constants; 8 questions; notified by trigger) | session_01TxfVV2pnW24vz4uTSzSciR | opus-5-5 | 9.59 |
| Physics checker, L5b (blind, from lock `a1174e7`; 0 numeric discrepancies, 0 blocking, 8 notes; notified by trigger) | session_01VGwjX6cise4udiD1zYY38i | sonnet-5-5 | 1.37 |
| Reviewer, L5b (PR #84; 0 blocking, 7 findings; notified by trigger) | session_01Tux7HRzP4r2YcUorJTjYEc | sonnet-5-5 | 0.66 |
| Engineer, L5c weapons (`m0/l5c-weapons`, PR #88, head `42391b5`; W1–W14 less W9, `js/missile.js`, `js/defence.js`; 14 questions; notified by trigger) | session_01FGkcorhSN5Vdhec9rnEiyn | opus-5-5 | 23.34 |
| Physics checker, L5c (blind, from lock `9c21d46`; 0 numeric mismatches in 12 scenarios, 8 findings, 1 blocking: `L1.pd.kinetic` does not enforce the flak dose law; notified by trigger) | session_0121fPWd2hcCuvWibkuWPkBg | sonnet-5-5 | 2.81 |
| Engineer, L5c fix round (#296; head `a7ee5f8`: `pd.range`, the body's impulse, three successors; 2 questions; notified by trigger) | session_01X1gtC7jUZGTc2g5jVkX1qk | opus-5-5 | 7.08 |
| Engineer, L5c fix round 2 (#298; head `a4005d4`: `L1.pd.kinetic.v2`, `L2.missile.seekers.v2`; the crossing case and `L2.pd.saturation` not built, 2 questions; notified by trigger) | session_01XzQ7C4ro57Qy4dmmdkwsJM | opus-5-5 | 4.85 |
| Reviewer, L5c (PR #88 at `a4005d4`; 0 blocking, 7 findings; 34 of 34 `l5c.*` mutations KILLED; notified by trigger) | session_01MKjVmvJumw88Rvj9oo3SGi | sonnet-5-5 | 0.98 |
| Engineer, L5d the helm and the enemy (`m0/l5d-helm` from `ld/l5d`, #301; PR #94, head `3da955c`, lock `97d2740`; 18 scenarios, 10 questions; then H8's successor under #303, head `dd67aa0`; notified by trigger) | session_01LpASMAypvQc8EhHRGaN8k9 | opus-5-5 | 29.39 |
| Physics checker, L5d (blind, from lock `97d2740`; H4, H9–H12; H8 deferred to its successor; 0 numeric mismatches, 8 findings, 0 blocking; notified by trigger) | session_01JZxBhiqZeK8ytPxmzBx97E | sonnet-5-5 | 1.49 |
| Reviewer, L5d (PR #94; reviews at `3da955c` and `dd67aa0`: 1 blocking, resolved by #303's successor, 12 non-blocking; notified by trigger and message) | session_01EP7NCUqBPMwRgWJsLRq6P1 | sonnet-5-5 | 1.53 |
| Engineer, L5d fix rounds (#306, #307, #308; `m0/l5d-helm` `dd67aa0` → `dc50c56`; H15–H20, H9′; 32 of 32 `l5d.*` KILLED; notified by trigger) | session_01ND3BEPMGkBojwdudZAByyY | opus-5-5 | 13.24 |
| Physics checker, L5d fix rounds (blind; H8′, H15–H20, H9′; 8 VERIFIED, 8 discrepancies, 0 blocking; notified by trigger) | session_01WHewLv1j6FaAWN78ZSEkVW | sonnet-5-5 | 1.95 |
| Reviewer, L5d fix rounds (light re-review; 0 blocking, 4 non-blocking; worker restarted, earlier cost not reported; notified by trigger) | session_012Ee2P2wf6zEmTbZ9kRW9EZ | sonnet-5-5 | ≥ 0.32 |
| Engineer, the prototype page on the L5d loop (#310; `proto/l5d` `8c05cfc`, PR #96; L0.determinism MISMATCH found; notified by trigger) | session_017Jhxt1rVP4N6Dcqh48Ykuu | opus-5-5 | 6.84 |
| Engineer, deterministic transcendentals (#310, #311; `m0/det-math` `f2318c9`, PR #97; notified by trigger) | session_01Wvk2oq2CyopWPzKgNQJYss | opus-5-5 | 4.22 |
| Reviewer, PR #97 (0 blocking, 5 non-blocking; notified by trigger) | session_0185K3jWeLwLK3XyEXU5UdcG | sonnet-5-5 | 0.82 |
| Reviewer, PR #96 (0 blocking, 3 non-blocking; notified by trigger) | session_017U1vtCixpnBCJdGe9ZpXVv | sonnet-5-5 | 0.61 |
| Auditor, process audit (#321; `audits/2026-10-24-process.md`; notified by trigger) | session_01T8f36eKFqDZPBk5qHurPue | sonnet-5-5 | 1.57 |
| Engineer, L5e1 (#316, #317; `m0/l5e1` `e05a02b`, PR #101; worker restarted, cost may be low; notified by trigger) | session_01V1bdgeUjyqM9R6N6q37PRq | opus-5-5 | ≥ 5.99 |
| Physics checker, L5e1 (blind; J3, J7–J9, the fragment fix; 0 blocking; notified by trigger) | session_016YzrysyeMRVpYwMSqxpcaB | sonnet-5-5 | 1.16 |
| Reviewer, L5e1 (0 blocking, 4 non-blocking; notified by trigger) | session_011iShUBNoNDPRAPSbCDfCXd | sonnet-5-5 | 0.98 |
| Engineer, L5e1 fix round (plume occlusion, the two survivors, weak checks; `7a4fe57`; notified by trigger) | session_01JusqyribLxSy75GET9Ye7e | opus-5-5 | 10.43 |
| Physics checker, L5e1 fix round (plume occlusion; 0 blocking; not fully blind, disclosed; notified by trigger) | session_01EayNPAnem7QdoxibT8h6Ga | sonnet-5-5 | 0.98 |
| Reviewer, L5e1 fix round (light; no finding; notified by trigger) | session_01FE4deyhxBY2ggmvGVdHCx5 | sonnet-5-5 | 0.73 |
| Runner, `battle.openingRange` 500–3000 m and the re-records (#318; `run/opening-range` `2cec56a`; 174 VERIFIED; notified by trigger; a first copy archived empty at once, the prompt not expanded) | session_01U2gpT1cMDWBKhTe3kBhwye | sonnet-5-5 | 0.72 |
| Runner, the pace study's grid (§17 item 52; `run/pace` `8dd35d6`, `tools/estimates/out/`; notified by trigger) | session_018bqyYRiZUXXkB8Znd3CZek | sonnet-5-5 | 0.53 |
| Engineer, §17 item 53 and the field's energy frame (#327; PR #103, `ac91efd`; notified by trigger) | session_01CAL2Wwfpzq5LmqxiRWAdDK | opus-5-5 | 6.00 |
| Physics checker, PR #103 (blind; 0 blocking, 3 non-blocking; notified by trigger) | session_012Y3cHk3UTBGdUTxEqxnWin | sonnet-5-5 | 0.45 |
| Reviewer, PR #103 (0 blocking, 4 non-blocking; notified by trigger) | session_01AV1zutGsj1uUQQm6rgJuLk | sonnet-5-5 | 0.50 |
| Engineer, the reference builds' rebuild (#330, #331; draft PR #104, `1d7845e`; stopped at the stop rule; still open, cost so far) | session_01SC9bT7XzCShErTLAScXgUu | opus-5-5 | ≥ 6.60 |
| Runner, item 55: `regress` under L1 | session_0184EvFVAF3uPPJ8u6d9oyhb | sonnet-5-5 | 0.29 |
| Runner, item 55: the helm suite, today and L1 | session_018CzG2efzqJLEh5utTmS1AX | sonnet-5-5 | 0.47 |
| Runner, item 55: the helm suite base / L1 / P2, `regress` under P2 | session_01JEsqkpArJ9unCs6ng4gGCF | sonnet-5-5 | 0.39 |
| Runner, item 55: the helm suite and `regress` under P3 | session_01S9x8RHyzN6aW5YiUmiYCVn | sonnet-5-5 | 0.36 |
| Engineer, §17 item 55 (#335, #339, §13n.9; PR #105, merged `da029d3`; two rounds) | session_011bat8qrcsUMVXEQ4MPu2Qi | opus-5-5 | 14.05 |
| Physics checker, PR #105 K1–K3 (blind, partly: saw two criterion fragments by grep, disclosed; 0 blocking; its trigger refused at lineage depth 8) | session_019miu9xqavcWsHTbJDL89V9 | sonnet-5-5 | 0.88 |
| Reviewer, PR #105 (0 blocking, 2 non-blocking; its trigger refused at lineage depth 8) | session_01BT4vDUMpSEphfNWJsVoywM | sonnet-5-5 | 0.92 |
| Runner, `regress` on PR #105's merge (179 + 160 + 5) | session_01LZ6Y5jV6Y3KTdTs6BLBmVP | sonnet-5-5 | 0.54 |
| Lead designer chat (2026-10-24, took over at item 55's review; cost at 241k tokens) | session_01VnsqF6AQX456h5ihxqZjh5 | opus-5-5 | 6.85 |

L1 total: 17.21 USD (engineer 14.27, physics checker 1.22, reviews 1.72).
L2 total: 23.89 USD (engineers 19.73, physics checker 2.82, reviewer 1.34).
D pass total: 14.11 USD (engineers 7.83 + 2.93, physics checker 2.26, reviewer 1.09).
L3 total: 23.82 USD (engineers 13.09 + 2.94 + 3.12, physics checker 3.22, reviewer 1.45).
Mass pass total: 8.90 USD (engineer 8.07, reviewer 0.83).
Feel prototype total: 12.36 USD (engineers 5.41 + 3.71 + 2.93, reviewer 0.31).
Path model total: 18.24 USD (engineer 13.57, physics checker 4.08, reviewer 0.59).
Prototype v2 total: 13.85 USD (engineer 11.73, reviewer 1.00, mis-created session 1.12).
Audits (2026-10-21): 25.40 USD (documents 6.59, physics 3.78, scenarios 15.03).
Consolidation: 4.12 USD (engineer 2.42, reviewer 1.70).
Physics pass 2 total: 42.93 USD (engineer 29.34, physics checker 2.84, reviewer 2.24, fix rounds 5.12 + 2.31, re-review 1.08).

Sessions have reported a **seven-day usage limit warning**.
`tools/mutate` total: 7.91 USD (engineer 6.96, reviewer 0.95).
L4a total: ≥ 17.57 USD (engineer ≥ 2.32 reported after a worker restart + fix round 8.01, physics checkers 2.83 + 1.62, reviewers 1.81 + 0.98).
L4b total: 23.98 USD (engineer 19.06, physics checker 3.91, reviewer 1.01). L4 total (L4a + L4b): ≥ 41.55 USD.
Audits before L5 (2026-10-22, light): 6.91 USD (documents 1.70, process 0.91, physics 2.33, scenarios 1.97).
L4 fix round total: 6.83 USD (engineer 6.41, reviewer 0.42).
L4 scenario-hygiene round total: 15.89 USD (engineer 10.58, physics checker 4.06, reviewer 1.25). L4 total (L4a + L4b + fix + hygiene): ≥ 64.27 USD.
L5a total: 23.54 USD (engineers 16.82 + 3.34, physics checker 1.90, reviewers 1.03 + 0.45).
L5m total: 15.09 USD (engineers 7.97 + 4.04, physics checker 1.73, reviewer 1.35).
L5b total: 11.62 USD (engineer 9.59, physics checker 1.37, reviewer 0.66).
L5c total: 39.06 USD (engineers 23.34 + 7.08 + 4.85, physics checker 2.81, reviewer 0.98). L5 so far (L5a + L5m + L5b + L5c): 89.31 USD.
L5d total: ≥ 47.92 USD (engineer 29.39, fix rounds 13.24, physics checkers 1.49 + 1.95, reviewers 1.53 + ≥ 0.32). L5 so far (L5a + L5m + L5b + L5c + L5d): ≥ 137.23 USD.

The lead designer chat's own cost (planning, answers, checks, merges) is **not in this ledger** (#270 (7)): only the sessions it creates are costed.

**From process v2 (#325) the lead designer chats are costed here too**, one row per chat (`get_session` `cost_usd`; the chain in `STATUS.md`): `session_01Ld11QmhkPubc8PkfKtd7CT` 43.0, `session_014nrUDvPgiLEjm64scJFkyW` 104.2, `session_01VL5M5dKNeREUVf7y1y3P87` 64.6, `session_01DFw3o4EBEtf1adcpyJ5786` 67.2, `session_01S8gXf1kch2FCFHYE8nwhrn` 91.3 (the figures the owner was given, 2026-10-24, not re-read by this chat), `session_01Bt5RVRLCv85dFpXLq4qB5W` **26.64** at its hand-over (read by itself, 2026-10-24 07:35 UTC). `session_01EAtiqegHjnDwsoHwD7cjur` **13.16** at its hand-over (read by itself, 2026-10-24 12:35 UTC; 370k tokens of context). `session_01DJwKiaxa29KDtFqVjBviSe` **7.74** so far (read by itself, 2026-10-24 15:23 UTC; 309k tokens of context).

## Estimates against actuals (#270 (1))

One row per pass under the plan gate (#241): the raw range the plan stated, where it is recorded, the actual from the table above and the ratio of the actual to the raw midpoint. #246 (4)'s factors (×2.5 repeated, ×4 new) are shown to the owner beside the lead designer's own expectation (#270 (2)); the factor is reconsidered only when three consecutive rows land within 1.5×.

| Pass | Raw estimate (USD) | Source | Actual (USD) | Ratio on the midpoint |
|---|---|---|---|---|
| Physics pass 2 | 50–60 (the rule's figure; raw not recorded separately) | #243, §13k | 42.93 | 0.78 of the rule's midpoint; raw unknown |
| `tools/mutate` | 3–5 | #241 (6) | 7.91 | 1.98 |
| L4a | 10–14 | #253 | ≥ 17.57 (lower bound: the engineer's cost before a worker restart is not reported) | ≥ 1.46 |
| L4b | 18–25 | #253, #262 | 23.98 | 1.12 |
| L4 fix round | 3–5 | #270 (9) | 6.83 (#272 says 4.93: the engineer's cost rose after its last turn) | 1.71 |
| L4 scenario-hygiene round | 10–15 | #271, §13l.7 | 15.89 | 1.27 |
| L5a (the kinetic pass, with its fix round) | 11–16 | #278, §13n.5 | 23.54 | 1.74 |
| L5m (the turret by its mount) | 10–15 (5–8 in #281, corrected by the probe of #285 before any session) | #285 | 15.09 | 1.21 |
| L5b (senses and the knowledge model) | 15–21 | #278, §13n.5 (the probe of #289 confirmed it) | 11.62 | 0.65 |
| L5c (weapons, with two fix rounds) | 27–39 | #295, §13n.5 | 39.06 | 1.18 |
| L5d (the helm and the enemy, with three fix rounds) | 33–47 (26–36 in #278, re-costed by the probe of #301) | #301, §13n.5 | ≥ 47.92 | ≥ 1.20 |
| L5e1 (rules, builds, sweep, with one fix round) | 20–30 | #316, §13n.8 | ≥ 20.27 | ≥ 0.81 |
| §17 item 55 (with K6, #339) | 11–17 (raw 9–14 × 1.24) | #335, §13n.9 | 16.39 (engineer 14.05, checker 0.88, reviewer 0.92, runner 0.54; the probe's runners 1.51 not counted) | 1.17 of the × 1.24 midpoint |

Three consecutive passes within 1.5× are **not** shown (L4a is a lower bound already at 1.46): #267's factor change is withdrawn (#270 (1)).
