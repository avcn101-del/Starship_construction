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
| Engineer, L4a (`m0/l4a`) | session_01FpUHAGXwS7MQ9fDiQV6M31 | opus-5-5 | running |
| Physics checker, L4a (blind, from lock `6feb7e0`; `checker/l4a`) | session_017mYp4vpcVbLbTrXruRXDP5 | sonnet-5-5 | running |

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
