# أنا بدي | Ana Bade — v6.9 Complete

This is a complete clean release. Upload every file and folder in this package to the repository root, replacing the old website files. The active homepage scripts are `js/home.js` and `js/i18n.js`; obsolete homepage scripts are not included.

Homepage performance: the 14 main categories and 9 regions are embedded directly in `index.html`, so they appear instantly. Towns, providers, counters, submissions, and administration remain connected to the cloud data service.

Version 6.9 keeps all previous changes and makes the freelancer feature compact and balanced on desktop and mobile, with clearer cropping, tighter spacing, and a smaller centered call-to-action.

## إحصاءات الصفحة الرئيسية

- عدد مقدمي الخدمات يُحسب من سجلات `providers` النشطة.
- إجمالي الزيارات محفوظ في المستند `publicStats/main` ويزداد مع كل فتح أو إعادة تحميل للصفحة الرئيسية.
- يجب نشر محتوى ملف قواعد الأمان المحدّث حتى يعمل عدّاد الزيارات.
- عدّاد الزيارات مناسب للنسخة التجريبية، لكنه تقريبي ويمكن تعزيز حمايته لاحقًا.

Pure HTML, CSS and JavaScript version. No npm installation or build process is required.

## Run locally

Because the website uses JavaScript modules, serve the folder through a local web server instead of double-clicking `index.html`.

With Python installed:

```text
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Cloud data configuration

The public web connection settings are kept in the dedicated configuration file. Never add administration passwords or private service credentials to the repository.

## Current pages

- `index.html` — service and region selection
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

Follow `ADMIN-SETUP.md`, then publish the included security rules in the cloud console. Approval creates an active document in `providers`; rejection never publishes it.

