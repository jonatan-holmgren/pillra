import { existsSync, mkdirSync, writeFileSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

import { applyPatches, discoverApps, listPatches, loadApp, run } from "./shared.js";

const APP_JSON_TEMPLATE = {
  repo: "https://github.com/org/repo",
  commit: "<full-commit-sha>",
  branch: "main",
};

const scaffold = (dir: string, name: string) => {
  mkdirSync(dir, { recursive: true });
  const configPath = path.join(dir, "app.json");

  writeFileSync(configPath, JSON.stringify(APP_JSON_TEMPLATE, undefined, 2) + "\n");
  console.log(`Created ${configPath}`);
  console.log(`\nFill in the repo URL and commit SHA, then run: pilla setup ${name}`);
};

export const setup = (root: string, target?: string) => {
  const apps = target
    ? (() => {
        const dir = path.resolve(root, target);
        const app = loadApp(dir);

        if (!app) {
          scaffold(dir, target);

          return [];
        }

        return [app];
      })()
    : discoverApps(root);

  if (apps.length === 0 && !target) throw new Error("No apps found.");

  if (apps.length === 0) return;

  for (const app of apps) {
    const cloneDir = path.join(app.dir, ".app");

    console.log(`\n▶ ${app.name}`);

    if (existsSync(cloneDir)) {
      console.log("  Already cloned — delete .app/ to re-clone.");
    }
    else {
      console.log(`  Cloning ${app.config.repo} @ ${app.config.commit.slice(0, 8)}…`);
      run(`git clone --filter=blob:none --no-checkout ${app.config.repo} .app`, app.dir);
      run(`git checkout ${app.config.commit}`, cloneDir);
    }

    const patches = listPatches(app.patchesDir);

    applyPatches(patches, app.patchesDir, cloneDir);

    if (app.config.setup) {
      console.log(`  Running setup: ${app.config.setup}`);
      run(app.config.setup, cloneDir);
    }

    console.log(`  ✓ Ready at ${cloneDir}`);
  }
};
