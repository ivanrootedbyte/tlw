# Professor L + Persona Comedy Upgrade

Replace only these files:

- data/star-trials.json
- data/personas.json
- js/star-trial-engine.js
- js/arena.js
- js/verdict.js

What changed:

- Professor L now asks serious, category-specific questions instead of repeating the same generic pattern.
- Each topic still has 8 unique rounds.
- Answers are shorter, wittier, and more persona-specific.
- iOrchard Keeper uses the correct `polished-minimalist` key and has 3 choices in every round.
- 20 stars is now the victory line, not the score ceiling.
- Scores can continue above 20.
- The game tracks the user's best local Star Trial score.

Validation:

- 160 topics
- 1,280 unique Professor L questions
- 23,040 answer choices
- all 6 personas present in every round
- exactly 3 choices per persona per round
- no duplicate answer text across the full premium pack
