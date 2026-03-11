import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

import { listPatches, loadApp, run } from "./shared.js";

const resolveLatestCommit = (repo: string, branch: string): string => {
  const result = execSync(`git ls-remote ${repo} refs/heads/${branch}`, { encoding: "utf8" });
  const commit = result.split("\t")[0]?.trim();

  if (!commit) throw new Error(`Could not resolve ${branch} on ${repo}`);

  return commit;
};

export const bump = (root: string, target: string) => {
  const appDir = path.resolve(root, target);
  const app = loadApp(appDir);

  if (!app) throw new Error(`No app.json found in: ${appDir}`);

  const branch = app.config.branch;

  if (!branch) {
    throw new Error(`No "branch" field in app.json for ${app.name}. Add one to enable bumping.`);
  }

  const cloneDir = path.join(app.dir, "app");

  if (!existsSync(cloneDir)) {
    throw new Error(`No local clone found. Run 'pillra clone ${target}' first.`);
  }

  console.log(`\nResolving latest commit on ${branch}…`);
  const latestCommit = resolveLatestCommit(app.config.repo, branch);

  if (latestCommit === app.config.commit) {
    console.log(`Already at latest (${latestCommit.slice(0, 8)}).`);

    return;
  }

  console.log(`  ${app.config.commit.slice(0, 8)} → ${latestCommit.slice(0, 8)}`);

  const editDir = path.join(app.dir, "app-edit");

  if (existsSync(editDir)) {
    console.log("Cleaning up previous edit session…");
    run(`git worktree remove --force ${editDir}`, cloneDir);
  }

  console.log("\nFetching new commits…");
  run("git fetch origin", cloneDir);
  run(`git worktree add --detach ${editDir} ${latestCommit}`, cloneDir);

  // Update app.json now so 'pillra save' knows the new base commit
  const configPath = path.join(app.dir, "app.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));

  config.commit = latestCommit;
  writeFileSync(configPath, JSON.stringify(config, undefined, 4) + "\n");
  console.log(`  Updated app.json commit → ${latestCommit.slice(0, 8)}`);

  const patches = listPatches(app.patchesDir);
  let conflicted = false;

  if (patches.length > 0) {
    console.log(`\nApplying ${patches.length} patch(es) as commits…`);

    for (const patch of patches) {
      console.log(`  ${patch}`);
      const patchPath = path.join(app.patchesDir, patch);

      try {
        run(`git am ${patchPath}`, editDir);
      }
      catch {
        console.log(`\n  Conflict applying ${patch}.`);
        conflicted = true;
        break;
      }
    }
  }

  if (conflicted) {
    console.log(`
  Conflict during bump: ${app.name}
  Directory: ${editDir}

  Resolve conflicts, then run "git am --continue".
  Remaining patches will need to be re-applied manually.

  When done: pillra save ${target}
`);
  }
  else {
    console.log(`
  Bump ready: ${app.name}
  Directory: ${editDir}

  Patches applied cleanly. Review or adjust commits.

  When done: pillra save ${target}
`);
  }
};
