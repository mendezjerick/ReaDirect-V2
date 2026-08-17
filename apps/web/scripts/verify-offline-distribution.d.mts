export function resolveDistributionPaths(options: {
  repositoryRoot: string;
  webRoot: string;
}): {
  versionName: string;
  signedApk: string;
  signedAab: string;
  localTestingApks: string;
};
