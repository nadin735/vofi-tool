# VOFI Tool (Complete Financial Plan)

An interactive tool for comparing investment projects under a deposit rate and a borrowing rate, following the VOFI method (vollständiger Finanzplan) used in German investment analysis courses.

## What it does

For each project, and for a "do nothing" alternative, it builds the account balance period by period, applying the deposit rate when the balance is positive and the borrowing rate when it is negative. If a project's balance would fall below a set credit limit, it is marked as not feasible. Projects are ranked by final balance.

## Features

- **Text import**: paste a table copied from a PDF or worksheet (one row per line, label first, then the numbers) and the tool automatically fills in base payments, rates, credit limit, withdrawals, and one row per project
- **Flat or per-period interest rates**: use a single rate for the whole horizon, or set a different rate for each period
- **Fixed or ratio-based withdrawals**: enter exact values per period, or a starting value plus a ratio across periods
- **Reset button**: clears everything back to a blank starting state
- **Copy results**: shows the full ranking and account balance tables as plain text, ready to copy elsewhere

## Why VOFI instead of NPV

Standard NPV or IRR calculations assume a single discount rate. VOFI is more realistic once deposit and borrowing rates diverge, which is common in practice and central to how this topic is taught in German finance courses (see Grob, Kruschwitz).

## Run it
