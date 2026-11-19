# .local: local working memory
`Optional: contributors can ignore this folder`

Untracked scratch memory for humans and agent sessions. Everything here is gitignored except this README. Never commit it, never put secrets here, keep files short.

Session start: read this file, then `branches/<current-branch>/notes.md`, then the newest file in `handoff/`.

| Folder | Use |
|---|---|
| `branches/<branch>/` | Memory for one branch: status, next steps, open questions. Branch name with `/` replaced by `--` (`feat/v1` -> `feat--v1`). Start from `notes.md`. |
| `parked/` | Ideas deliberately postponed: date, idea, why parked, what would revive it. |
| `decisions/` | Short decision log (what, why, date). |
| `handoff/` | End-of-session notes, `YYYY-MM-DD-topic.md`: done, next, gotchas. |
| `scratch/` | Throwaway drafts and command output. Safe to delete. |

Rules:

- When the user says "remember this branch state" (or similar), update `branches/<branch>/notes.md`: status, what's done, next steps, open questions.
- Update the branch's `notes.md` at the end of a work session anyway.
- When a branch is merged or dropped, delete its folder or move lasting facts to `decisions/`.
- Durable project facts belong in `AGENTS.md` or `README.md`, not here.
