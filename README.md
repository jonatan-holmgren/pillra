# pilla

Maintain a set of patches on top of pinned upstream git repositories. Each app lives in its own directory with an `app.json` that declares which repo and commit to pin, plus a `patches/` directory of `.patch` files to apply on top.

## Concept

Instead of forking a repo, you pin an upstream commit and store your changes as patch files alongside the config. This makes your modifications explicit, reviewable, and easy to rebase when the upstream moves.

```
my-project/
  open-lavatory/
    app.json        ← pin config
    patches/
      0001-fix-login.patch
      0002-add-dark-mode.patch
    .app/           ← cloned + patched repo (gitignored)
```

## Install

```sh
npm install -g pilla
# or
bun add -g pilla
```

## Usage

### `pilla setup [app]`

Clone and apply patches. Run without an argument to set up all apps in the current directory, or pass a name to set up one.

```sh
pilla setup              # all apps
pilla setup open-lavatory
```

If the directory doesn't exist yet, pilla creates it with a template `app.json` for you to fill in.

The cloned repo lands in `.app/` inside the app directory. Subsequent runs are skipped if `.app/` already exists — delete it to re-clone.

### `pilla edit <app>`

Open an interactive shell to modify patches.

```sh
pilla edit open-lavatory
```

Pilla clones the repo into `.app-edit/`, applies existing patches as commits, then drops you into a shell. Make changes and commit them — each commit becomes one patch file. Type `exit` when done; pilla regenerates the patch files and cleans up.

### `pilla bump <app>`

Advance the pinned commit to the latest upstream and re-apply patches.

```sh
pilla bump open-lavatory
```

Pilla resolves the latest commit on `branch`, clones it, and attempts to apply your patches. If they apply cleanly you get a shell to review before finalising. If there's a conflict, you're dropped into a shell to resolve it (`git am --continue`), then `exit`. Either way, pilla regenerates patches and updates `commit` in `app.json`.

## app.json

```json
{
  "repo": "https://github.com/org/repo",
  "commit": "abc123...",
  "branch": "main",
  "setup": "yarn install",
  "patches": "patches"
}
```

| Field     | Required                | Description                                      |
|-----------|-------------------------|--------------------------------------------------|
| `repo`    | yes                     | Git remote URL                                   |
| `commit`  | yes                     | Full commit SHA to pin                           |
| `branch`  | for `bump`              | Branch to resolve latest commit from             |
| `setup`   | no                      | Command to run after cloning (e.g. install deps) |
| `patches` | no (default: `patches`) | Directory containing `.patch` files      |

## Workflow

1. `pilla setup <app>` — scaffold `app.json`, fill in repo + commit, run again to clone
2. `pilla edit <app>` — make and commit changes, exit to save patches
3. Commit `app.json` and `patches/` to your repo
4. `pilla bump <app>` — when you want to track a newer upstream commit
