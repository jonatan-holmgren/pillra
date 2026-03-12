import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

export type AppConfig = {
  repo: string;
  commit: string;
  branch?: string;
  setup?: string;
  patches?: string;
};

export type App = {
  name: string;
  dir: string;
  config: AppConfig;
  patchesDir: string;
};

export const childEnv = { ...process.env, COREPACK_ENABLE_STRICT: "0" };

export const promptYesNo = (question: string): boolean => {
  process.stdout.write(`${question} [y/N] `);
  const answer = execSync("head -1 /dev/tty", { encoding: "utf8" }).trim()
    .toLowerCase();

  return answer === "y" || answer === "yes";
};

export const maybeRunSetup = (setupCmd: string, cwd: string) => {
  if (promptYesNo(`  Run setup command? "${setupCmd}"`)) {
    run(setupCmd, cwd);
  }
};

export const run = (cmd: string, cwd: string) => {
  execSync(cmd, { cwd, stdio: "inherit", env: childEnv });
};

export const loadApp = (appDir: string): App | undefined => {
  const configPath = path.join(appDir, "app.json");

  if (!existsSync(configPath)) return;

  const config: AppConfig = JSON.parse(readFileSync(configPath, "utf8"));
  const name = path.basename(appDir);
  const patchesDir = path.join(appDir, config.patches ?? "patches");

  return { name, dir: appDir, config, patchesDir };
};

export const discoverApps = (root: string): App[] => readdirSync(root, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== "node_modules")
  .map(d => loadApp(path.join(root, d.name)))
  .filter((a): a is App => a !== undefined);

export const listPatches = (patchesDir: string): string[] => {
  if (!existsSync(patchesDir)) return [];

  return readdirSync(patchesDir)
    .filter(f => f.endsWith(".patch"))
    .sort();
};

export const applyPatches = (patches: string[], patchesDir: string, targetDir: string, asCommits = false) => {
  if (patches.length === 0) return;

  console.log(`  Applying ${patches.length} patch(es)${asCommits ? " as commits" : ""}…`);

  for (const patch of patches) {
    console.log(`    ${patch}`);
    const patchPath = path.join(patchesDir, patch);

    run(asCommits ? `git am ${patchPath}` : `git apply ${patchPath}`, targetDir);
  }
};
