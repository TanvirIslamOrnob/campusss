# CAMPUSX — শুরু করার নির্দেশনা (Windows)

এই ফোল্ডারটি Claude-এর Phase 7 ZIP থেকে নেওয়া সম্পূর্ণ snapshot। Phase 7 ZIP-এ Phase 1–6-এর সব ফাইলও ছিল, তাই সাতটি ZIP একসাথে merge করা হয়নি।

## আগে যা লাগবে
- Node.js (LTS)
- Java 17 বা তার পরের compatible version
- Maven
- MySQL Server (এবং চাইলে MySQL Workbench)

## 1) Database তৈরি
1. MySQL চালু করুন।
2. MySQL Workbench খুলে `database/schema.sql` সম্পূর্ণ execute করুন।
3. এটি `campusx` database তৈরি করে এবং প্রয়োজনীয় tables, roles, departments, sample courses insert করে।
4. একদম নতুন database হলে phase migration SQL-গুলো আলাদা করে চালাবেন না। এগুলো আগের phase-এর database upgrade করার জন্য।

## 2) Backend চালু
একটি terminal খুলুন:
```powershell
cd CAMPUSX\backend
$env:DB_USER="root"
$env:DB_PASSWORD="আপনার_MySQL_password"
$env:JWT_SECRET="এখানে_কমপক্ষে_৩২_অক্ষরের_একটি_নিজস্ব_random_secret_দিন"
mvn spring-boot:run
```
Backend default-এ `http://localhost:8080`-এ চলে। Health check: `http://localhost:8080/api/health`.

## 3) Frontend চালু
দ্বিতীয় terminal খুলুন:
```powershell
cd CAMPUSX\frontend
npm install
npm run dev
```
Vite সাধারণত `http://localhost:5173`-এ চালু হবে।

## 4) প্রথম Super Admin
1. Frontend থেকে একটি account register করুন।
2. `database/dev_make_admin.sql` খুলুন। সেখানে placeholder email আপনার registered email দিয়ে বদলান।
3. SQL execute করুন।
4. ওই account দিয়ে আবার login করে `/admin` খুলুন।

## গুরুত্বপূর্ণ সীমাবদ্ধতা ও সতর্কতা
- README অনুযায়ী email verification এবং password-reset email বাস্তবে পাঠানো হয় না; development link backend console-এ print হয়।
- `application.yml`-এ development JWT fallback secret আছে। Deployment-এর আগে অবশ্যই environment variable দিয়ে শক্তিশালী secret দিন; fallback secret production-এ ব্যবহার করবেন না।
- Browser token বর্তমানে localStorage-এ রাখা হয়। Production security review-এ XSS protection ও token storage strategy পুনর্বিবেচনা করা উচিত।
- Phase 7 code-এ frontend/backend automated test files পাওয়া যায়নি।
- এই package review environment-এ frontend dependency install timeout করেছে; তাই Vite build execute করা যায়নি। Maven command-ও পাওয়া যায়নি; তাই Spring Boot compile/test verify করা যায়নি। আপনার PC-তে dependency install করে build/test চালাতে হবে।
- SQL schema-তে `verification_token_hash` এবং `verify_token_hash` দুটো column আছে; code review-তে `verification_token_hash` ব্যবহৃত হয়েছে, তাই দ্বিতীয়টি redundant কি না Claude/ডেভেলপার দিয়ে যাচাই করুন।

এই নির্দেশনাগুলো local development/demo-এর জন্য। Production-এ deploy করার আগে security, email delivery, backups, HTTPS, file storage, logging এবং authorization আলাদাভাবে যাচাই করুন।
