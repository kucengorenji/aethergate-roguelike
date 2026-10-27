// Pure helpers for the asset checks in check-asset-budget.mjs, unit-tested.

/**
 * Paths a license manifest covers: every backticked path in the first column of
 * its table. A path ending in `/` covers everything below it.
 */
export function coveredPaths(manifest) {
  const paths = [];
  for (const line of manifest.split('\n')) {
    const first = /^\|\s*`([^`]+)`/.exec(line);
    if (first) paths.push(first[1]);
  }
  return paths;
}

/** Files (repo-relative) that no manifest path covers. */
export function unlicensed(files, covered) {
  return files.filter((f) => !covered.some((c) => (c.endsWith('/') ? f.startsWith(c) : f === c)));
}

/** Sum of file sizes in megabytes. */
export function totalMB(sizes) {
  return sizes.reduce((n, s) => n + s, 0) / (1024 * 1024);
}
