#!/usr/bin/env bash
#
# Build the Spliit Android release APK (standalone, JS bundle embedded).
# Signed with android/app/release.keystore (password in android/keystore-password.txt).
#
# Usage:
#   ./scripts/build_release.sh
#
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}/android"
echo "==> assembleRelease (JAVA_HOME=${JAVA_HOME})"
./gradlew assembleRelease

APK="app/build/outputs/apk/release/app-release.apk"
cp "${APK}" "${ROOT_DIR}/spliit-release.apk"
echo "APK: ${ROOT_DIR}/spliit-release.apk"
