# Building زیست‌یار for Android

This repository packages the existing MkDocs learning site as an offline-first Android app with Capacitor. The website remains independently deployable to GitHub Pages.

## App identity

- Display name: زیست‌یار
- Android application ID: `com.paymon1.zistyar`
- Native wrapper: Capacitor 8
- Web content: generated locally from the repository into `www/`

The generated `www/` directory and `android/` project are build outputs and are not committed. This keeps the repository focused on source content and makes CI builds reproducible.

## Windows prerequisites

Install:

1. Node.js 22 LTS or newer.
2. Python 3.12.
3. Android Studio (Capacitor 8 requires Android Studio 2025.2.1 or newer).
4. In Android Studio > Tools > SDK Manager, install Android SDK Platform 36 and Android SDK Build-Tools, plus Android SDK Command-line Tools.

Android Studio supplies the supported JDK. If building from a separate terminal, make sure Android Studio's bundled JDK is selected or JDK 21 is installed and available.

## First local build

Open PowerShell in the repository root:

```powershell
npm install
python -m pip install -r requirements-site.txt
npm run build:web
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio opens the native project. Allow Gradle sync to finish, connect an Android phone with USB debugging enabled (or create an emulator), select the device, and press Run.

To build an APK from PowerShell after the first project generation:

```powershell
cd android
.\gradlew.bat assembleDebug
```

The debug APK is written to:

`android/app/build/outputs/apk/debug/app-debug.apk`

Copy it to an Android phone and install it for testing. Android may ask the user to allow installation from that file manager/browser.

## Automated builds

The GitHub Actions workflow **Build Zistyar Android app** runs when app content or app build files change, and can also be started manually from the Actions tab. It uploads an APK and an AAB as workflow artifacts for 30 days.

The APK is a debug build for device testing. The first AAB is an unsigned release bundle and is **not yet ready for Google Play upload**. A Play release must be signed with a private upload key. Never commit the keystore or passwords to this repository.

## Google Play release checklist

Before public release:

- Create a Google Play developer account and complete Google's identity/account verification.
- Create a private upload keystore and keep secure backups.
- Add signing credentials as GitHub Actions secrets; do not put them in source files.
- Configure a signed release AAB and verify its signature.
- Prepare the store listing, screenshots, app icon, privacy policy, content rating, target audience and data-safety declarations.
- Complete any required testing track and account-specific testing requirements shown in Play Console.
- Submit the signed AAB for review.

New Google Play apps and updates must meet the target API requirement in force at submission time. As of August 31, 2026, the published requirement for standard Android apps is Android 16 / API 36 or higher.

## Local student data

Study progress, notes, highlights, planner tasks and saved flashcards currently use browser local storage. In the Android app, that storage belongs to the app's WebView on that device. It is not automatically synchronized with the website or another phone. Keep using the dashboard's JSON backup/export feature; do not uninstall the app before exporting important data.

## Offline behavior

The chapter pages and their local assets are bundled into the app, so the core library can load without a network connection. External resource links still require internet access. Search, navigation and all study tools should be checked on a real device before release.
