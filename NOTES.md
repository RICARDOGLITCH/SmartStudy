# SmartStudy notes

## Run it on your computer

From this folder, run:

```text
npm start
```

Then open http://localhost:3000.

The AI connects through `getKey()` in `ai.js`: the server asks `KEYGEN_URL/api/lookup-key` for a temporary OpenAI key using `KEYGEN_TOKEN`, caches it until `expiresAt`, and refreshes it once if OpenAI rejects it. Never put the returned key in browser code or print it. Fill in `KEYGEN_URL` and `KEYGEN_TOKEN` in `.env` yourself; `.env` is ignored by Git.

## Put it online with Vercel

SmartStudy uses Vercel Functions in `api/study-guide.js` and `api/answer.js`. Vercel serves the page from `public/`, and both functions reuse the server-only code in `ai.js` and `lib/api-handlers.js`. `vercel.json` includes `BRIEF.md` with each function so the AI instructions are sent online too. The local `server.js` still serves the same page and API routes on your computer.

In the Vercel project’s Settings → Environment Variables, add these two Production variables:

- `KEYGEN_URL`
- `KEYGEN_TOKEN`

No other Vercel setting is required. Leave Framework Preset as Other and Build Command blank. Do not upload `.env`; it is ignored by Git and Vercel.

## What’s done

- Customized AI study guides based on subject, topic, grade, time, and goal.
- Practice quizzes made from each guide.
- Score, missed questions, and explanations after a quiz.
- Ask SmartStudy for real, safe study help.
- Harmful chemical requests are refused and redirected to a teacher or trusted adult.
- Guides and recent quiz results save in browser localStorage through `public/storage.js`.
- Saves on this computer only for now.

## MVP check

1. Pick a topic and submit the form. Works when a guide appears with personalized focus, key ideas, and a memory plan.
2. Select “Practice quiz” from a guide. Works when quiz questions from that guide appear and can be answered.
3. Finish a quiz with at least one wrong answer. Works when the results show the missed answer and why.
4. Ask a normal study question, then a dangerous-chemical question. Works when the first gets a helpful answer and the second gets a safe refusal.

## Maybe Later

- The user can ask the AI to explain a hard idea in smaller pieces.
- The user can get a new guide focused only on the topics they missed.
- The user can choose a study style, like flashcards or short notes.
- The user can set their test date and get a day-by-day study plan.
- The user can get a kind, encouraging reply when they say they feel stuck.
- The user can see the AI refuse dangerous chemical questions and suggest a teacher.
- The user can paste their class notes to shape the study guide.
- The user can print their study guide to study offline.

## Next

- Add a student-tested feedback loop and use it to improve the guide prompts.
- Add a real database only after the localStorage MVP is tested.
- Prepare the written entry and short video around the four MVP moments.
