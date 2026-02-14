| name | description | argument-hint |
| --- | --- | --- |
| git-forensics | Use when tasks involve git recovery, corrupted repos, lost commits, reflog analysis, or git repo repair. Forensic approach required -- not standard git commands. | git error message or recovery goal |

# Git Recovery Forensics

## Detection
Keywords: "recover", "corrupted", "lost commit", "fix git", "reflog", "fsck", "broken repo"

## Protocol
1. **BACKUP FIRST**: `cp -r .git .git.bak`
2. Check integrity: `git fsck --full --no-dangling`
3. Check reflog: `git reflog` (commits survive even after reset)
4. Check loose objects: `find .git/objects -type f`
5. Recover from pack files if needed: `git unpack-objects < .git/objects/pack/*.pack`
6. Try `git stash list` for stashed changes
7. Use `git log --all --oneline` to find orphaned branches

## Common Fixes
- **Corrupted HEAD**: `git symbolic-ref HEAD refs/heads/main`
- **Missing objects**: `git fetch origin && git reset --hard origin/main`
- **Detached HEAD with work**: `git reflog` then `git checkout -b recovery <hash>`
- **Broken index**: `rm .git/index && git reset`

## Rules
- **NEVER** run destructive commands without `.git.bak` backup
- Use `--dry-run` first for any destructive operation
- Check `git reflog` before anything -- commits almost always survive
- Use `git cat-file -t <hash>` to inspect object types
