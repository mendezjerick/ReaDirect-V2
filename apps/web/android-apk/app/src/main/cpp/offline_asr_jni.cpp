#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>
#include <android/log.h>
#include <jni.h>

#include <algorithm>
#include <cstddef>
#include <string>

#include "whisper.h"

namespace {

constexpr char kLogTag[] = "ReaDirectOfflineAsr";

struct AssetModelLoader {
  AAsset *asset;
};

size_t readAsset(void *context, void *output, size_t bytes) {
  auto *loader = static_cast<AssetModelLoader *>(context);
  const int read = AAsset_read(loader->asset, output, bytes);
  return read > 0 ? static_cast<size_t>(read) : 0;
}

bool isAssetEof(void *context) {
  auto *loader = static_cast<AssetModelLoader *>(context);
  return AAsset_getRemainingLength64(loader->asset) <= 0;
}

void closeAsset(void *context) {
  auto *loader = static_cast<AssetModelLoader *>(context);
  if (loader->asset != nullptr) {
    AAsset_close(loader->asset);
    loader->asset = nullptr;
  }
}

void throwJavaException(JNIEnv *environment, const char *message) {
  jclass exceptionClass =
      environment->FindClass("java/lang/IllegalStateException");
  if (exceptionClass != nullptr) {
    environment->ThrowNew(exceptionClass, message);
  }
}

} // namespace

extern "C" JNIEXPORT jlong JNICALL
Java_com_readirect_offline_asr_WhisperNative_initContextFromAsset(
    JNIEnv *environment, jclass, jobject assetManager, jstring assetPath) {
  const char *assetPathChars =
      environment->GetStringUTFChars(assetPath, nullptr);
  AAssetManager *nativeAssetManager =
      AAssetManager_fromJava(environment, assetManager);
  if (nativeAssetManager == nullptr) {
    environment->ReleaseStringUTFChars(assetPath, assetPathChars);
    throwJavaException(environment, "Android assets are unavailable.");
    return 0;
  }
  AAsset *asset = AAssetManager_open(nativeAssetManager, assetPathChars,
                                     AASSET_MODE_STREAMING);
  environment->ReleaseStringUTFChars(assetPath, assetPathChars);

  if (asset == nullptr) {
    throwJavaException(environment,
                       "The packaged ASR model could not be opened.");
    return 0;
  }

  AssetModelLoader assetLoader{asset};
  whisper_model_loader modelLoader{
      &assetLoader,
      readAsset,
      isAssetEof,
      closeAsset,
  };
  whisper_context_params contextParameters = whisper_context_default_params();
  contextParameters.use_gpu = false;
  contextParameters.flash_attn = true;

  whisper_context *context =
      whisper_init_with_params(&modelLoader, contextParameters);

  if (context == nullptr) {
    closeAsset(&assetLoader);
    throwJavaException(environment,
                       "The packaged ASR model could not be initialized.");
    return 0;
  }

  __android_log_print(ANDROID_LOG_INFO, kLogTag,
                      "Initialized offline ASR model");
  return reinterpret_cast<jlong>(context);
}

extern "C" JNIEXPORT void JNICALL
Java_com_readirect_offline_asr_WhisperNative_freeContext(JNIEnv *, jclass,
                                                         jlong contextPointer) {
  auto *context = reinterpret_cast<whisper_context *>(contextPointer);
  if (context != nullptr) {
    whisper_free(context);
  }
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_readirect_offline_asr_WhisperNative_transcribe(
    JNIEnv *environment, jclass, jlong contextPointer, jint requestedThreads,
    jfloatArray audioSamples) {
  auto *context = reinterpret_cast<whisper_context *>(contextPointer);
  if (context == nullptr) {
    throwJavaException(environment,
                       "The offline ASR model is not initialized.");
    return nullptr;
  }

  const jsize sampleCount = environment->GetArrayLength(audioSamples);
  if (sampleCount < 800) {
    throwJavaException(environment,
                       "The recorded audio is too short to transcribe.");
    return nullptr;
  }

  jfloat *samples = environment->GetFloatArrayElements(audioSamples, nullptr);
  if (samples == nullptr) {
    throwJavaException(environment, "The recorded audio could not be read.");
    return nullptr;
  }

  whisper_full_params parameters =
      whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
  parameters.n_threads = std::clamp(static_cast<int>(requestedThreads), 1, 8);
  parameters.language = "en";
  parameters.translate = false;
  parameters.no_context = true;
  parameters.no_timestamps = true;
  parameters.single_segment = false;
  parameters.suppress_blank = true;
  parameters.temperature = 0.0F;
  parameters.print_realtime = false;
  parameters.print_progress = false;
  parameters.print_timestamps = false;
  parameters.print_special = false;

  whisper_reset_timings(context);
  const int inferenceResult =
      whisper_full(context, parameters, samples, static_cast<int>(sampleCount));
  environment->ReleaseFloatArrayElements(audioSamples, samples, JNI_ABORT);

  if (inferenceResult != 0) {
    throwJavaException(environment, "Offline speech recognition failed.");
    return nullptr;
  }

  std::string transcript;
  const int segmentCount = whisper_full_n_segments(context);
  for (int segment = 0; segment < segmentCount; ++segment) {
    transcript.append(whisper_full_get_segment_text(context, segment));
  }

  return environment->NewStringUTF(transcript.c_str());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_readirect_offline_asr_WhisperNative_getSystemInfo(JNIEnv *environment,
                                                           jclass) {
  return environment->NewStringUTF(whisper_print_system_info());
}
