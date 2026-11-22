---
name: review-loop
description: Run the review loop from docs/review.md on the current branch before opening a pull request or marking one ready.
---

Follow [`docs/review.md`](../../../docs/review.md) on the current branch:

1. Run `./dev check`; fix until green.
2. Start the `reviewer` agent on `git diff origin/main...HEAD`. For a big change not yet coded,
   give it the plan instead.
3. Fix the blocking findings and run `./dev check` again.
4. Start the `reviewer` once more, on the fixes only.
5. Stop after two rounds. Put anything left in the pull request description under
   **Open review notes** and say so in your reply.
