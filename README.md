# Template Repository

## Contents

| Name            | Purpose                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| .eslintrc.json  | [ESLint](eslint.org/) configuration                                                              |
| .gitignore      | [Git ignore](https://git-scm.com/docs/gitignore)                                                 |
| .npmignore      | [NPM ignore](https://docs.npmjs.com/using-npm/developers.html#keeping-files-out-of-your-package) |
| package.json    | [NPM package](https://docs.npmjs.com/files/package.json)                                         |
| tsconfig.json   | [TypeScript](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) configuration      |
| node.js.yml     | [GitHub Action](https://github.com/features/actions): test on commit/pull request                |
| npm-publish.yml | [GitHub Action](https://github.com/features/actions): NPM & GitHub publish on release            |
| clean.ts        | Utility to selectively clean /dist/src/                                                          |
| /lib/           | Helpers often used in my projects                                                                |
| /interfaces/    | Interfaces often used in my projects                                                             |

---

## Configuration Files

### ESLint

ESLint configuration is used to maintain code quality, readability, and uniformity - across browser-based JavaScript, Node.js, and TypeScript.

-   Main rule set for Node.js files, though these rules are also used for TypeScript - where there is generally a high level of parity.
-   Second rule set for compiled Node.js files (matching: "\*\*/lib/src/\*.js", "\*\*/lib/src/\*\*/\*.js", "\*\*/dist/src/\*.js", "\*\*/dist/src/\*\*/\*.js")
-   Third rule set for other JavaScript files (matching: service.js, "\*\*/js/\*.js", "\*\*/js/\*\*/\*.js")

### TypeScript

TypeScript configuration establishes the directory structure and compile rules.

-   Source code is taken from /src/ file
-   Compiled code is written to /dist/src/

...because TypeScript does not clean up older compiled files, clean.ts is used (see below).

The current TypeScript configuration will produce:

-   Compiled files (.js)
-   Compiled map files (.js.map)
-   Declaration files (.d.ts)
-   Declaration map files (.d.ts.map)

---

## Ignore Files

### Git

Git ignore controls which files are sent to Bitbucket/GitHub,

Should include only the minimum number of files needed to reproduce development and testing.

**Note:** There is not a blanket ignore on /dist/src, the "git" script must be used.

### NPM

NPM ignore controls which files are sent to NPM,

Should include only the minimum number of files needed to utilise the package.

Tests are ignored, as end-users don't need these - contributors can get them from Git.

---

## package.json

Establishes "main" as "./dist/src/index" instead of "main.js".

Sets up three scripts:

-   clean - compiles TypeScript, then see clean.ts
-   build - runs "clean", then compiles TypeScript
-   test - runs "build", then runs mocha tests
-   git - runs "test", then runs "clean"

Before require/importing in another script, "build" must have been run.

Before committing to the Git repository, "git" must have been run.

Using npm init will update this with other NPM properties.

---

## GitHub Actions

### node.js.yml

If a commit/pull request is made onto the "master" branch, the "test" script is run.

### npm-publish.yml

If a release is made through the GitHub repository, the package is published to both NPM and GitHub packages. Requires the NPM_TOKEN secret to be setup in the repository.

---

## clean.ts

If you make an "example.ts" file and compile it, an "example.js" file is produced, if you later decide you don't need "example.ts" and delete it - the "example.js" file (and .js.map, .d.ts, .d.ts.map files) remains in the repository.

This usually isn't a massive deal, perhaps some wasted size on the NPM package until you notice and delete it, but if you're using functions that read directories (even if these functions aren't in your code - they are in Mocha) then these zombie files could cause problems.

clean.ts recursively selectively deletes everything inside of /dist/src/ that looks like a compiled JS file - either on request, or when tests are run - this ensures a clean working directory.
