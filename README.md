# VOFI Tool

**Complete Financial Plan calculator for investment decisions under imperfect capital markets.**

Compares investment projects when deposit and borrowing rates differ, using the VOFI method (vollständiger Finanzplan), and ranks them by final account balance.

---

## Why this exists

Most introductory finance courses evaluate investments with a single discount rate (NPV, IRR). That assumption breaks down the moment deposit rates and borrowing rates diverge, which is the normal case in practice. VOFI handles this by simulating the actual account balance period by period, applying whichever rate applies given the balance at that moment, positive or negative. This is a standard method in German investment analysis courses (see Grob, Kruschwitz), and this tool implements it as a small, interactive calculator instead of a spreadsheet.

## What it does

For every project you enter, plus an automatic "do nothing" alternative, the tool:

1. Builds the account balance for each period, applying the deposit rate when the balance is positive and the borrowing rate when it is negative
2. Flags a project as not feasible if its balance would fall below a credit limit you set
3. Ranks every option by final balance, so the best choice is immediate

## Features

| Feature | Description |
|---|---|
| Text import | Paste a table copied from a PDF or worksheet, the tool recognizes rows like base payments, rates, and project cash flows automatically |
| Flat or per period rates | Use one rate for the whole horizon, or set a different rate for each period |
| Fixed or ratio based withdrawals | Enter exact values, or a starting value plus a ratio across periods |
| Reset | One click back to a blank state |
| Copy results | Full ranking and balance tables as plain text, ready to paste elsewhere |

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open the local address shown in the terminal.

## Project structure

\`\`\`
vofi-simple/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    └── VofiTool.jsx
\`\`\`

## Tech

Plain React, no external UI or chart libraries, plain tables and inline styles. Kept deliberately simple so every line is easy to read and explain.

## Background

Built while studying Investitionsrechnung at Freie Universität Berlin, as a way to turn a recurring exam topic into a small, reusable tool.
