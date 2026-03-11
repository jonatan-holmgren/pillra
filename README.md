# pillra

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
pnpm install -g pillra
# or
bun add -g pillra
```

## Usage

### `pillra init <app>`

Scaffold a new app directory with a template `app.json`.

```sh
pillra init open-lavatory
```

Fill in the `repo` and `commit` fields, then run `pillra clone`.

### `pillra clone [app]`

Clone the upstream repo and apply patches into `.app/`. Run without an argument to clone all apps in the current directory.

```sh
pillra clone               # all apps
pillra clone open-lavatory
```

Only needs to run once. `.app/` is the live patched copy you work against.

### `pillra apply [app]`

Re-apply patches to an existing `.app/` — no network needed. Use this after pulling updated patches from a teammate.

```sh
pillra apply               # all apps
pillra apply open-lavatory
```

Resets `.app/` to the pinned commit and re-applies all patch files.

### `pillra edit <app>`

Prepare an edit session for modifying patches.

```sh
pillra edit open-lavatory
```

Creates `.app-edit/` as a git worktree from the local `.app/` (no network), applies existing patches as commits, then prints the directory path. Make changes and commit them in `.app-edit/` using your normal tools — each commit becomes one patch file. When done, run `pillra save`.

### `pillra save <app>`

Finalize the edit session: regenerate patch files from commits in `.app-edit/`, then clean up.

```sh
pillra save open-lavatory
```

If a `setup` command is configured, you'll be asked whether to run it against `.app/`.

### `pillra bump <app>`

Advance the pinned commit to the latest upstream and re-apply patches.

```sh
pillra bump open-lavatory
```

Fetches new commits into `.app/`, updates `commit` in `app.json`, then sets up `.app-edit/` with your patches applied on top of the new base. If patches apply cleanly, review and adjust commits as needed. If there are conflicts, resolve them (`git am --continue`) and finish remaining patches manually. Then run `pillra save`.

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

| Field     | Required                | Description                                          |
|-----------|-------------------------|------------------------------------------------------|
| `repo`    | yes                     | Git remote URL                                       |
| `commit`  | yes                     | Full commit SHA to pin                               |
| `branch`  | for `bump`              | Branch to resolve latest commit from                 |
| `setup`   | no                      | Command to run after cloning (you'll be prompted)    |
| `patches` | no (default: `patches`) | Directory containing `.patch` files                  |

## Workflow

```sh
# First time
pillra init myapp        # scaffold app.json
# edit myapp/app.json
pillra clone myapp       # clone upstream → .app/

# Editing patches
pillra edit myapp        # sets up .app-edit/
# make commits in .app-edit/
pillra save myapp        # regenerate patches, clean up

# After a teammate updates patches
pillra apply myapp       # re-apply to .app/ instantly

# Tracking a new upstream commit
pillra bump myapp        # fetch + set up .app-edit/ at new commit
# resolve conflicts if any
pillra save myapp        # regenerate patches, update app.json
```

Commit `app.json` and `patches/` to your repo. Ignore `.app/` and `.app-edit/`.
