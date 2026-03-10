import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

import { applyPatches, listPatches, loadApp, run, runShell } from "./shared.js";

export const edit = (root: string, target: string) => {
  const appDir = path.resolve(root, target);
  const app = loadApp(appDir);

  if (!app) throw new Error(`No app.json found in: ${appDir}`);

  const editDir = path.join(app.dir, ".app-edit");

  if (existsSync(editDir)) {
    console.log("Cleaning up previous edit session…");
    rmSync(editDir, { recursive: true });
  }

  console.log(`\nCloning ${app.config.repo} @ ${app.config.commit.slice(0, 8)}…`);
  run(`git clone --filter=blob:none --no-checkout ${app.config.repo} .app-edit`, app.dir);
  run(`git checkout ${app.config.commit}`, editDir);

  const patches = listPatches(app.patchesDir);

  applyPatches(patches, app.patchesDir, editDir, true);

  console.log(`
  Edit session: ${app.name}
  Directory:    ${editDir}

  Make changes and commit them with git.
  Each commit will become one patch file.
  Type "exit" when done.
`);

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
    `git format-patch ${app.config.commit} --output-directory ${app.patchesDir} --zero-commit --no-signature`,
    { cwd: editDir, encoding: "utf8" },
  ).trim();

  const generated = result ? result.split("\n").map(p => path.basename(p)) : [];

  if (generated.length === 0) {
    console.log("No commits above pinned commit — patches cleared.");
  }
  else {
    console.log(`Generated ${generated.length} patch(es):`);
    generated.forEach(p => console.log(`  ${p}`));
  }

  rmSync(editDir, { recursive: true });

  console.log("\nDone. Review patches, then commit them.");
};
