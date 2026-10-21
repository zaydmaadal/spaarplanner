---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the guidelines in [rules.md](rules.md) (a saved copy; do not fetch anything)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in rules.md
4. Output findings in the terse `file:line` format

## Usage

When a user provides a file or pattern argument:
1. Read [rules.md](rules.md)
2. Read the specified files
3. Apply all rules from rules.md
4. Output findings using the format specified in rules.md

If no files specified, ask the user which files to review.
