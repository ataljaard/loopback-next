#!/usr/bin/env node
// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: loopback-next
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * This is an internal script to verify that local monorepo dependencies
 * are excluded from package-lock files.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const promisify = require('util').promisify;

const readFile = promisify(fs.readFile);

const Project = require('@lerna/project');

async function checkPackageLocks() {
  const project = new Project(process.cwd());
  const packages = await project.getPackages();
  const rootPath = project.rootPath;
  const lockFiles = packages.map(p =>
    path.relative(rootPath, path.join(p.location, 'package-lock.json')),
  );

  const checkResults = await Promise.all(
    lockFiles.map(async lockFile => {
      return {lockFile, violations: await checkLockFile(lockFile)};
    }),
  );
  const badPackages = checkResults.filter(r => r.violations.length > 0);
  if (!badPackages.length) return 0;

  console.error();
  console.error('Invalid package-lock entries found!');
  console.error();
  for (const {lockFile, violations} of badPackages) {
    console.error('  %s', lockFile);
    for (const v of violations) {
      console.error('    -> %s', v);
    }
  }

  console.error();
  console.error('Run the following command to fix the problems:');
  console.error();
  console.error('  $ npm run update-package-locks');
  console.error();
}

if (require.main === module) {
  checkPackageLocks().then(
    result => process.exit(result),
    err => {
      console.error(err);
      process.exit(2);
    },
  );
}

async function checkLockFile(lockFile) {
  const data = JSON.parse(await readFile(lockFile, 'utf-8'));
  return Object.keys(data.dependencies || []).filter(dep =>
    dep.startsWith('@loopback/'),
  );
}
