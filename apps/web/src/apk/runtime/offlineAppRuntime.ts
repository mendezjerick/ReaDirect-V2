import { offlineAsrBridge } from "../native/offlineAsrBridge";
import { offlineTtsBridge } from "../native/offlineTtsBridge";
import { runOfflineInitialization } from "../onboarding/offlineInitialization";
import {
  OfflineLearnerRepository,
  offlineLearnerRepository,
} from "../storage/offlineLearnerRepository";

import type { OfflineAsrTranscription } from "../native/offlineAsrBridge";

export type OfflineRecordingContext = {
  expectedTranscript: string;
};

export type OfflineActivityAsr = {
  startRecording(
    maxDurationMs?: number,
    context?: OfflineRecordingContext,
  ): Promise<{ sampleRateHz: 16000; maxDurationMs: number }>;
  stopRecording: typeof offlineAsrBridge.stopRecording;
  playRecording: typeof offlineAsrBridge.playRecording;
  transcribeRecording: typeof offlineAsrBridge.transcribeRecording;
  clearRecording: typeof offlineAsrBridge.clearRecording;
  stopAndTranscribe(): Promise<OfflineAsrTranscription>;
  cancelRecording(): Promise<void>;
};

export type OfflineActivityTts = Pick<typeof offlineTtsBridge, "play" | "stop">;

export type OfflineAppRuntime = {
  repository: Pick<OfflineLearnerRepository, "initialize" | "update">;
  initialize: typeof runOfflineInitialization;
  asr: OfflineActivityAsr;
  tts: OfflineActivityTts;
};

export const nativeOfflineAppRuntime: OfflineAppRuntime = {
  repository: offlineLearnerRepository,
  initialize: runOfflineInitialization,
  asr: offlineAsrBridge,
  tts: offlineTtsBridge,
};
