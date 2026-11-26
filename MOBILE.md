# Shortflix mobile apps (Capacitor)

The web app is wrapped with Capacitor so the same codebase ships as the website,
an iOS app and an Android app.

- App id: com.manitniwas.shortflix
- App source: the Vite build in `dist` (built per deploy; not committed)
- Native projects: `ios/` (Swift Package Manager) and `android/` (Gradle)

## What CI does today (.github/workflows/mobile.yml)

On every push to main, GitHub Actions:

1. Builds an Android debug APK you can sideload (Artifacts > shortflix-android-debug-apk).
2. Builds the iOS app for the simulator (unsigned) to prove it compiles - no Mac needed on your desk.

## To get on TestFlight (iOS)

Only you can do these, since they sit on your Apple account:

1. Renew the Apple Developer Program membership (~$99/year) at developer.apple.com.
2. Once active, create an App Store Connect API key (Users and Access > Integrations > App Store Connect API).
3. Hand the key to Instinct (vault), and the CI will build a signed IPA and upload it
   to TestFlight automatically on each push. Testers then just need the free TestFlight app.

## To get on Google Play (Android)

1. Create a Play Console developer account (one-time $25 fee).
2. First release goes to the internal testing track. CI can produce the signed AAB
   once a signing keystore exists (Instinct can generate one and keep it in the vault).

## Building locally instead

- iOS: requires a Mac with Xcode (`npx cap open ios`).
- Android: requires Android Studio / SDK (`npx cap open android`).

## Known limitations inside the app shell

- Google sign-in: Google blocks OAuth inside embedded webviews, so "Continue with Google"
  may fail in the app until we add the native Google Sign-In plugin. Email-link sign-in
  works, but the link opens the website in Safari rather than returning to the app
  until universal links are set up.
- Instagram episodes play through the official embed, same as the website, with the
  same sign-up nag and no saved progress.
