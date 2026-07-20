# Spliit Android

Unofficial **Android** build of [Spliit Mobile](https://github.com/spliit-app/spliit-mobile),
the mobile companion app for [Spliit](https://spliit.app) — a free and open source
alternative to Splitwise.

The upstream project currently targets iOS only. This fork makes the app build and
run on Android, entirely from the command line (no Android Studio required).

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://revolut.me/costateo)

## What's different from upstream

- Added the `android` configuration in `app.json` (package name, adaptive icon)
- Native Android project generated via `expo prebuild`
- Release builds signed with a dedicated keystore (kept out of version control)
- CLI build scripts in `scripts/`

## Stack

- [Expo](https://expo.dev/) (SDK 51) + [expo-router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/) 0.74
- [tRPC](https://trpc.io/) client talking to the official Spliit API
- [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)

## Requirements

- Node.js 18+
- JDK 17
- Android SDK command line tools (platform 34, build-tools 34) with
  `ANDROID_HOME` pointing to the SDK
- No Android Studio needed

## Build (CLI only)

```bash
# 1. Install dependencies
npm install

# 2. Generate the native Android project (first time only)
npx expo prebuild --platform android --no-install

# 3. Build
./scripts/build_release.sh    # standalone release APK (JS bundle embedded)
./scripts/build_android.sh    # debug APK (loads JS from the Metro dev server)
./scripts/install_android.sh  # build + install on a connected device/emulator
```

The release APK is copied to `spliit-release.apk` in the repository root.

### Release signing

`scripts/build_release.sh` expects a keystore at `android/app/release.keystore`
with its password in `android/keystore-password.txt` (one line). Both are
gitignored. To create one:

```bash
keytool -genkeypair -v \
  -keystore android/app/release.keystore \
  -alias spliit-release -keyalg RSA -keysize 2048 -validity 10000
```

Keep a backup of the keystore and password: every future update must be signed
with the same key.

### Debug workflow

The debug APK loads JavaScript from the Metro dev server:

```bash
./scripts/install_android.sh   # install the debug app on the device
npx expo start                 # start Metro, then open the app
```

## Roadmap

- [x] Build and run on Android from the CLI
- [ ] Screen-by-screen functional testing on Android
- [ ] Android-specific UI polish (menus, segmented controls, back button, keyboard)
- [ ] Dark mode
- [ ] Contribute Android support back upstream

## Credits

All application code comes from [spliit-app/spliit-mobile](https://github.com/spliit-app/spliit-mobile)
by [Sebastien Castiel](https://github.com/scastiel), and the
[Spliit](https://github.com/spliit-app/spliit) project (MIT licensed).
This fork only adds the Android build setup. Consider
[sponsoring the original author](https://github.com/sponsors/scastiel).

## Support this project

If the Android build is useful to you, you can buy me a coffee (via Revolut):

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://revolut.me/costateo)

## Contribute

Issues and pull requests are welcome, especially for Android-specific bugs
and UI fixes.
