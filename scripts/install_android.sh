#!/usr/bin/env bash
#
# Build and install the Spliit debug APK on a connected device/emulator.
#
# Usage:
#   ./scripts/install_android.sh
#
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "${SCRIPT_DIR}/../android" && pwd)"

cd "${ANDROID_DIR}"
echo "==> installDebug (JAVA_HOME=${JAVA_HOME})"
./gradlew installDebug
