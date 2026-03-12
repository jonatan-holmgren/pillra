import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

import { loadApp, maybeRunSetup, run } from "./shared.js";

export const save = (root: string, target: string) => {
  const appDir = path.resolve(root, target);
  const app = loadApp(appDir);

  if (!app) throw new Error(`No app.json found in: ${appDir}`);

  const cloneDir = path.join(app.dir, "app");
  const editDir = path.join(app.dir, "app-edit");

  if (!existsSync(editDir)) {
    throw new Error(`No edit session found. Run 'pillra edit ${target}' first.`);
  }

  console.log("Regenerating patches…");

  mkdirSync(app.patchesDir, { recursive: true });

  // Run format-patch first. If it fails, existing patches are preserved
  const result = execSync(
    `git format-patch ${app.config.commit} --output-directory ${app.patchesDir} --zero-commit --no-signature`,
    { cwd: editDir, encoding: "utf8" },
  ).trim();

  const generated = result ? result.split("\n").map(p => path.basename(p)) : [];

  // Remove stale patches that weren't regenerated
  const generatedSet = new Set(generated);

  readdirSync(app.patchesDir)
    .filter(f => f.endsWith(".patch") && !generatedSet.has(f))
    .forEach(f => rmSync(path.join(app.patchesDir, f)));

  if (generated.length === 0) {
    console.log("No commits above pinned commit — patches cleared.");
  }
  else {
    console.log(`Generated ${generated.length} patch(es):`);
    generated.forEach(p => console.log(`  ${p}`));
  }

  run(`git worktree remove --force ${editDir}`, cloneDir);

  if (app.config.setup) {
    maybeRunSetup(app.config.setup, app.dir);
  }

  console.log("\nDone. Review patches, then commit them.");
};
