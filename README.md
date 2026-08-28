# أنا بدي | Ana Bade — v6.5 Complete

This is a complete clean release. Upload every file and folder in this package to the repository root, replacing the old website files. The active homepage scripts are `js/home.js` and `js/i18n.js`; obsolete homepage scripts are not included.

Homepage performance: the 14 main categories and 9 regions are embedded directly in `index.html`, so they appear instantly without a Firestore read. Towns, providers, counters, submissions, and administration remain connected to Firebase.

Version 6.5 adds referral codes, paid/free-campaign registration review, a 3-year listing term, and provider Google Maps links. Publish the included `firestore.rules` before testing the updated registration form.

Version 6.5 also calculates first-registration eligibility per town and specialty. The admin request card displays the existing matching-provider count and offers first-free approval only to the oldest eligible pending request.

Version 6.5 removes payment-plan selection from the public form and creates a structured, non-random payment reference plus a human-readable request description after successful submission.

## إحصاءات الصفحة الرئيسية

- عدد مقدمي الخدمات يُحسب من سجلات `providers` النشطة في Firestore.
- إجمالي الزيارات محفوظ في المستند `publicStats/main` ويزداد مع كل فتح أو إعادة تحميل للصفحة الرئيسية.
- يجب نشر محتوى ملف `firestore.rules` المحدّث من Firebase Console حتى يعمل عدّاد الزيارات.
- عدّاد الزيارات مناسب للنسخة التجريبية، لكنه تقريبي. للحماية المتقدمة من الزيارات الآلية استخدم Firebase App Check وCloud Functions لاحقًا.

Pure HTML, CSS and JavaScript version. No npm installation or build process is required.

## Run locally

Because the website uses JavaScript modules, serve the folder through a local web server instead of double-clicking `index.html`.

With Python installed:

```text
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Firebase

The Firebase Web configuration is in `js/firebase-config.js`. Only public web configuration belongs there. Never add Firebase Admin service-account credentials.

## Current pages

- `index.html` — region selection from Firestore
- `towns.html?region=REGION_ID` — towns and instant Arabic/English search
- `categories.html?town=TOWN_ID` — service categories for the selected town
- `specialties.html?town=TOWN_ID&category=CATEGORY_ID` — specialties for the selected category
- `providers.html?...` — alphabetically sorted provider results with direct contact actions
- `provider.html?id=PROVIDER_ID` — focused provider profile
- `add-service.html` — provider application form; submissions remain pending
- `admin.html` — requests, providers, regions and towns management
- `privacy.html`, `terms.html`, `disclaimer.html` — launch-ready legal drafts
- `contact.html` — contact and incorrect-information report form

## Admin setup

Follow `ADMIN-SETUP.md`, then publish `firestore.rules` in Firebase Console. Approval creates an active document in `providers`; rejection never publishes it.

