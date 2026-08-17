export type OfflineAndroidRelease = {
  versionName: string;
  signedApk: string;
  signedAab: string;
  localTestingApks: string;
};

export function resolveOfflineAndroidRelease(options: {
  gradlePath: string;
  outputDirectory: string;
}): OfflineAndroidRelease;
