import { existsSync, mkdirSync, writeFileSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

import { applyPatches, discoverApps, listPatches, loadApp, maybeRunSetup, run } from "./shared.js";

const APP_JSON_TEMPLATE = {
  repo: "https://github.com/org/repo",
  commit: "<full-commit-sha>",
  branch: "main",
};

export const init = (root: string, name: string) => {
  const dir = path.resolve(root, name);
  const configPath = path.join(dir, "app.json");

  if (existsSync(configPath)) throw new Error(`${configPath} already exists.`);

  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(APP_JSON_TEMPLATE, undefined, 2) + "\n");
  console.log(`Created ${configPath}`);
  console.log(`\nFill in the repo URL and commit SHA, then run: pillra clone ${name}`);
};

export const apply = (root: string, target?: string) => {
  const apps = target
    ? (() => {
        const dir = path.resolve(root, target);
        const app = loadApp(dir);

        if (!app) throw new Error(`No app.json found in: ${dir}`);

        return [app];
      })()
    : discoverApps(root);

  if (apps.length === 0) throw new Error("No apps found.");

  for (const app of apps) {
    const cloneDir = path.join(app.dir, "app");

    console.log(`\n▶ ${app.name}`);

    if (!existsSync(cloneDir)) {
      throw new Error(`No local clone found. Run 'pillra clone ${app.name}' first.`);
    }

    console.log(`  Resetting to ${app.config.commit.slice(0, 8)}…`);
    run(`git reset --hard ${app.config.commit}`, cloneDir);
    run("git clean -fd", cloneDir);

    const patches = listPatches(app.patchesDir);

    applyPatches(patches, app.patchesDir, cloneDir);

    if (app.config.setup) {
      maybeRunSetup(app.config.setup, cloneDir);
    }

    console.log(`  ✓ Ready at ${cloneDir}`);
  }
};

export const clone = (root: string, target?: string) => {
  const apps = target
    ? (() => {
        const dir = path.resolve(root, target);
        const app = loadApp(dir);

        if (!app) throw new Error(`No app.json found in: ${dir}\n\nRun 'pillra init ${target}' to create one.`);

        return [app];
      })()
    : discoverApps(root);

  if (apps.length === 0) throw new Error("No apps found.");

  for (const app of apps) {
    const cloneDir = path.join(app.dir, "app");

    console.log(`\n▶ ${app.name}`);

    if (existsSync(cloneDir)) {
      console.log("  Already cloned — delete app/ to re-clone.");
    }
    else {
      console.log(`  Cloning ${app.config.repo} @ ${app.config.commit.slice(0, 8)}…`);
      run(`git clone --filter=blob:none --no-checkout ${app.config.repo} app`, app.dir);
      run(`git checkout ${app.config.commit}`, cloneDir);
    }

    const patches = listPatches(app.patchesDir);

    applyPatches(patches, app.patchesDir, cloneDir);

    if (app.config.setup) {
      maybeRunSetup(app.config.setup, cloneDir);
    }

    console.log(`  ✓ Ready at ${cloneDir}`);
  }
};
