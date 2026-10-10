# contract-reader

[![tests](https://github.com/dguywhoknows/contract-reader/actions/workflows/tests.yml/badge.svg)](https://github.com/dguywhoknows/contract-reader/actions/workflows/tests.yml)

Paste a contract or Terms of Service to get clause-by-clause risk flags, readability scores, plain-English rewrites and Q&A with citations.

Live: https://dguywhoknows.github.io/contract-reader/

## Overview

Legalese Lens splits a contract into clauses (numbered sections, articles, ALL-CAPS headings) and runs a local risk library of 14 patterns over each one: auto-renewal, forced arbitration, class-action waivers, unilateral changes, data sharing, perpetual content licenses, liability caps, termination without notice, indemnification, non-competes and more. Every clause gets a Flesch-Kincaid grade, a legalese-term count and passive-voice detection, and every flag is highlighted in the text. The AI rewrites any clause in grade-7 plain English, produces a cited summary (what you agree to, ranked red flags, questions to ask before signing), and answers questions using TF-IDF retrieval so each answer cites the clauses it relied on. It is an educational tool, not legal advice.

## Pages

- **Review**
- **Key terms**
- **Compare**
- **Checklist**
- **Library**
- **Settings**

## Features

- Clause segmentation for numbered, article-style and ALL-CAPS headed documents
- 14-pattern risk library with severity, explanation and in-text highlighting
- Per-clause readability: Flesch-Kincaid grade, longest sentence, legalese terms, passive voice
- Risk radar + readability bars that jump to the clause
- AI plain-English rewrites per clause (grade-7 target)
- AI summary with §-citations: TL;DR, what you agree to, red flags, questions to ask
- Retrieval-augmented Q&A: local TF-IDF cosine picks the clauses, AI answers with citations
- Key terms page: money amounts, deadlines and notice periods (with context), dates, defined terms, what you must do and what the other side may do, each linked to its clause
- Compare page: align two versions of a contract by title and content (even when clauses are renumbered), show word-level changes, and list risk flags that were added or removed
- Checklist page: questions that matter for terms of service, leases, employment and freelance contracts, each marked as addressed (with the clause) or missing
- Library page: several documents saved in the browser with a risk score and top red flags
- The offline summary is built from the document's own flags, obligations and checklist gaps

## How it works

LLM calls are used for:

- Clause simplification
- Cited contract summary (JSON) that verifies local flags
- RAG question answering over the top-k retrieved clauses

Everything else (segmentation, risk detection, readability metrics, retrieval, highlighting) runs locally in the browser.

## Getting started

No build step and no dependencies. Serve the folder with any static server:

```bash
git clone https://github.com/dguywhoknows/contract-reader.git
cd contract-reader
python -m http.server 8000
```

Then open http://localhost:8000.

### Configuration

Without an API key the app runs in demo mode with sample model output. To use a live model, open
**Settings → Configure provider** and paste a key for [Groq](https://console.groq.com/keys) or
[OpenRouter](https://openrouter.ai/keys). The key is stored in this browser's `localStorage` (namespaced to
this app) and is sent only to the selected provider.

## Testing

`src/core.js` holds the app's logic as pure functions and is covered by 8 unit tests.

```bash
node tests/run-node.js        # CI runs this on every push
```

Or open `tests/index.html` in a browser ([live](https://dguywhoknows.github.io/contract-reader/tests/)).

## Project structure

```
index.html           markup for every page
src/app.js           UI, page wiring and event handlers
src/core.js          pure logic with no DOM access (unit-tested)
src/demo.js          sample responses used when no API key is configured
src/lib/ai.js        LLM client: Groq / OpenRouter, streaming, JSON mode, retries
src/lib/dom.js       DOM helpers, namespaced storage, markdown renderer
src/lib/router.js    hash router and the Settings page
styles/base.css      design tokens and shared components
styles/app.css       app-specific styles
tests/               unit tests (browser runner + Node runner for CI)
```

## Tech

- Regex risk-pattern library
- Flesch-Kincaid grade with heuristic syllables
- TF-IDF + cosine similarity retrieval
- Segmentation, risk patterns, readability, retrieval, key-term extraction, word diff and clause alignment in src/core.js covered by unit tests run in the browser and in CI
- Vanilla JavaScript, no framework or bundler
- Deployed with GitHub Pages

## License

MIT
