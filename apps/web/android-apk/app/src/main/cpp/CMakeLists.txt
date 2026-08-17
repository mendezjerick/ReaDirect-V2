cmake_minimum_required(VERSION 3.22.1)

project(readirect_offline_asr LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)

add_subdirectory(whisper.cpp)

add_library(readirect_whisper SHARED offline_asr_jni.cpp)

target_include_directories(
    readirect_whisper
    PRIVATE
    whisper.cpp/include
)

find_library(android_log_library log)
find_library(android_library android)

target_link_libraries(
    readirect_whisper
    PRIVATE
    whisper
    ${android_library}
    ${android_log_library}
)

target_compile_options(
    readirect_whisper
    PRIVATE
    -O3
    -fvisibility=hidden
    -fvisibility-inlines-hidden
)
