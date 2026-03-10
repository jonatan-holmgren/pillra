import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

import { listPatches, loadApp, run, runShell } from "./shared.js";

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

  console.log(`\nResolving latest commit on ${branch}…`);
  const latestCommit = resolveLatestCommit(app.config.repo, branch);

  if (latestCommit === app.config.commit) {
    console.log(`Already at latest (${latestCommit.slice(0, 8)}).`);

    return;
  }

  console.log(`  ${app.config.commit.slice(0, 8)} → ${latestCommit.slice(0, 8)}`);

  const editDir = path.join(app.dir, ".app-edit");

  if (existsSync(editDir)) {
    console.log("Cleaning up previous edit session…");
    rmSync(editDir, { recursive: true });
  }

  console.log(`\nCloning ${app.config.repo} @ ${latestCommit.slice(0, 8)}…`);
  run(`git clone ${app.config.repo} .app-edit`, app.dir);
  run(`git checkout ${latestCommit}`, editDir);

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
  Conflict during bump of: ${app.name}
  Directory: ${editDir}

  Resolve conflicts, then "git am --continue".
  Remaining patches will need to be re-applied manually.
  When all commits are clean, type "exit".
`);
  }
  else {
    console.log(`
  Bump session: ${app.name}
  Directory:    ${editDir}

  Patches applied cleanly. Review or adjust commits,
  then type "exit" to finalize.
`);
  }

  runShell(editDir, app.name);

  console.log("\nRegenerating patches…");

  if (existsSync(app.patchesDir)) {
    readdirSync(app.patchesDir)
      .filter(f => f.endsWith(".patch"))
      .forEach(f => rmSync(path.join(app.patchesDir, f)));
  }
  else {
    mkdirSync(app.patchesDir, { recursive: true });
  }

  const result = execSync(
    `git format-patch ${latestCommit} --output-directory ${app.patchesDir} --zero-commit --no-signature`,
    { cwd: editDir, encoding: "utf8" },
  ).trim();

  const generated = result ? result.split("\n").map(p => path.basename(p)) : [];

  if (generated.length === 0) {
    console.log("No commits above new pinned commit — patches cleared.");
  }
  else {
    console.log(`Generated ${generated.length} patch(es):`);
    generated.forEach(p => console.log(`  ${p}`));
  }

  rmSync(editDir, { recursive: true });

  // Update commit in app.json
  const configPath = path.join(app.dir, "app.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));

  config.commit = latestCommit;
  writeFileSync(configPath, JSON.stringify(config, undefined, 4) + "\n");

  console.log(`\nUpdated app.json commit → ${latestCommit.slice(0, 8)}`);
  console.log("Done. Review patches and app.json, then commit them.");
};
