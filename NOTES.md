After each save point, push it to GitHub.
OpenAI model with “luna”: gpt-5.6-luna

## How to run
- From this project folder, run `node server.js`.
- Open http://localhost:4173 in a browser.
- The local `.env` file supplies the OpenAI key to the server only. Never commit it.

## Done
- Saved the full project brief in `BRIEF.md`.
- Built Version 1 with a customized study-guide form, AI-made practice quiz, missed-answer explanations, and a real-question helper.
- Added browser-only saving in `public/storage.js` with made-up sample topics.
- Added a small server in `server.js`; the key stays on the server and the AI system instructions are read from `BRIEF.md` for every request.
- Added “Thinking…” loading states and double-submit protection.
- Wrote “Saves on this computer only for now” into the app.

## MVP feature checks
- Pick a topic and get a customized guide — UI and server route are ready; live check is blocked until `.env` contains a valid OpenAI API key. Submit the first form.
- Take a practice quiz from the guide — UI and server route are ready; click “Make a practice quiz” after a guide appears.
- See missed answers and why — implemented in the browser; answer the quiz and click “Check my answers.”
- Get safe answers to real questions — UI and server route are ready; type a question in “Ask SmartStudy.”

## Current blocker and next step
- The configured `.env` value was rejected by OpenAI with HTTP 401, so replace it directly in `.env` with a valid OpenAI Platform API key, restart `node server.js`, and repeat the MVP checks.

## Maybe Later
- Ask the AI to explain a hard idea in smaller pieces.
- Get a new guide focused only on missed topics.
- Choose a study style, like flashcards or short notes.
- Set a test date and get a day-by-day study plan.
- Get a kind, encouraging reply when feeling stuck.
- Show the AI refusing dangerous chemical questions and suggesting a teacher.
- Paste class notes to shape the study guide.
- Print the study guide to study offline.
