#!/usr/bin/env bash
#
# Build the Spliit Android debug APK (CLI only, no Android Studio).
#
# Usage:
#   ./scripts/build_android.sh
#
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "${SCRIPT_DIR}/../android" && pwd)"

cd "${ANDROID_DIR}"
echo "==> assembleDebug (JAVA_HOME=${JAVA_HOME})"
./gradlew assembleDebug

echo "APK(s):"
find app/build/outputs/apk/debug -name '*.apk' 2>/dev/null || true
