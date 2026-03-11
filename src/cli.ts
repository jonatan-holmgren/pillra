#!/usr/bin/env node
import { bump } from "./bump.js";
import { edit } from "./edit.js";
import { save } from "./save.js";
import { apply, clone, init } from "./setup.js";

const USAGE = `
pillra - maintain patches on top of pinned upstream git repos

Usage:
  pillra init <app>    Scaffold a new app directory with a template app.json
  pillra clone [app]   Clone upstream and apply patches (all apps, or one by name)
  pillra apply [app]   Re-apply patches to existing app/ (e.g. after pulling updated patches)
  pillra edit <app>    Prepare an edit session in app-edit/
  pillra save <app>    Finalize patches from app-edit/ and clean up
  pillra bump <app>    Advance pinned commit to latest upstream and re-apply patches

Typical workflow:
  pillra init myapp    # creates myapp/app.json
  # fill in repo and commit in myapp/app.json
  pillra clone myapp   # one-time clone to app/
  pillra apply myapp   # re-apply patches after pulling teammate changes
  pillra edit myapp    # sets up app-edit/ with patches as commits
  # make changes and git commit in app-edit/
  pillra save myapp    # regenerates patch files, removes app-edit/
  pillra bump myapp    # fetch new upstream commit, re-apply patches to app-edit/
  # resolve any conflicts in app-edit/, then:
  pillra save myapp    # regenerates patch files, removes app-edit/

Each app is a directory containing an app.json:
  {
    "repo":   "https://github.com/org/repo",
    "commit": "<sha>",
    "branch": "main",          // required for bump
    "setup":  "yarn install",  // optional post-clone command
    "patches": "patches"       // optional custom patches directory
  }
`.trim();

// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
const [, , command, ...args] = process.argv;
const root = process.cwd();

try {
  switch (command) {
    case "init": {
      const app = args[0];

      if (!app) {
        console.error("Usage: pillra init <app>");
        process.exit(1);
      }

      init(root, app);
      break;
    }
    case "clone": {
      clone(root, args[0]);
      break;
    }
    case "apply": {
      apply(root, args[0]);
      break;
    }
    case "edit": {
      const app = args[0];

      if (!app) {
        console.error("Usage: pillra edit <app>");
        process.exit(1);
      }

      edit(root, app);
      break;
    }
    case "save": {
      const app = args[0];

      if (!app) {
        console.error("Usage: pillra save <app>");
        process.exit(1);
      }

      save(root, app);
      break;
    }
    case "bump": {
      const app = args[0];

      if (!app) {
        console.error("Usage: pillra bump <app>");
        process.exit(1);
      }

      bump(root, app);
      break;
    }
    default: {
      console.log(USAGE);

      if (command) process.exit(1);

      break;
    }
  }
}
catch (error) {
  console.error(`\nError: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
