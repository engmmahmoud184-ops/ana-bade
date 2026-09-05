# إعداد لوحة الإدارة

1. افتح لوحة الخدمة السحابية ثم **Authentication → Sign-in method** وفعّل **Email/Password**.
2. من **Authentication → Users** أنشئ حساب الإدارة وانسخ قيمة `UID` الخاصة به.
3. في قاعدة البيانات أنشئ collection باسم `admins` ثم document يكون اسمه هو الـ `UID` نفسه، وأضف:
   - `isActive` من نوع Boolean وقيمته `true`
   - `email` من نوع String (للتعريف فقط)
4. افتح صفحة قاعدة البيانات ثم **Rules**، والصق محتوى ملف قواعد الأمان ثم اضغط **Publish**.
5. افتح `admin.html` وسجّل الدخول بحساب الإدارة.


لا تضع كلمة مرور الإدارة أو أي ملف صلاحيات خاص داخل GitHub. إعدادات اتصال الويب العامة ليست كلمة مرور.
# Version 6.8 registration workflow

Publish the included security rules before accepting new website registrations. Each request can be approved as **paid** after manually confirming the USD 10 transfer to the Ana Bade account, or granted a private special waiver at admin discretion. Both modes publish for three years. Referral codes and payment status remain private admin data; Google Maps links are public on provider results and profiles.
