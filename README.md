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
- **Client certificate (mTLS) support** for self-hosted instances behind
  Cloudflare mTLS or any reverse proxy requiring a client certificate

## Self-hosted instances and mTLS

The app talks to the official instance at `https://spliit.app/` by default.
In *About → Settings* you can point it to any self-hosted Spliit instance
by changing the **Base URL**.

If your instance requires a **client certificate** (e.g. [Cloudflare mTLS](https://developers.cloudflare.com/ssl/client-certificates/)),
import a PKCS#12 (`.p12`/`.pfx`) file from *About → Client certificate (mTLS)*.
The certificate is stored in the app's private storage and presented
automatically whenever the server requests one during the TLS handshake.
Standard CA validation of the server is unchanged.

To convert a Cloudflare client certificate (PEM cert + private key) to PKCS#12:

```bash
openssl pkcs12 -export -out client.p12 -in client.pem -inkey client-key.pem
```

This is implemented by a local Expo native module (`modules/spliit-mtls`,
Android only) that plugs a custom OkHttp client factory into React Native's
networking layer, so every app request (tRPC/fetch) goes through it.

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
- [x] Custom base URL for self-hosted instances (upstream feature)
- [x] Client certificate (mTLS) support for Cloudflare-protected instances
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
