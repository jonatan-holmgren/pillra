import { existsSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

import { applyPatches, listPatches, loadApp, run } from "./shared.js";

export const edit = (root: string, target: string) => {
  const appDir = path.resolve(root, target);
  const app = loadApp(appDir);

  if (!app) throw new Error(`No app.json found in: ${appDir}`);

  const cloneDir = path.join(app.dir, "app");
  const editDir = path.join(app.dir, "app-edit");

  if (!existsSync(cloneDir)) {
    throw new Error(`No local clone found. Run 'pillra clone ${target}' first.`);
  }

  if (existsSync(editDir)) {
    console.log("Cleaning up previous edit session…");
    run(`git worktree remove --force ${editDir}`, cloneDir);
  }

  run(`git worktree add --detach ${editDir} ${app.config.commit}`, cloneDir);

  const patches = listPatches(app.patchesDir);

  applyPatches(patches, app.patchesDir, editDir, true);

  console.log(`
  Edit session ready: ${app.name}
  Directory: ${editDir}

  Make changes and commit them with git.
  Each commit becomes one patch file.

  When done: pillra save ${target}
`);
};
