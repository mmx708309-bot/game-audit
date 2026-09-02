مراجعة توثيق Unity الرسمي في 29 أغسطس 2026:

المصدر: https://docs.unity.com/en-us/grow/ads/unity-sdk

التوثيق يصف Unity Ads SDK كتكامل لمشاريع Unity المصنوعة باستخدام Unity، مع أدلة C# لإعلانات interstitial و rewarded و banner، وروابط منفصلة لأدلة Android وiOS. لا يقدم هذا المصدر SDK مباشرًا لموقع React/Vite عادي داخل المتصفح. كما يذكر أن التكامل المباشر Advertisement Legacy قد يتراجع أداؤه ابتداءً من 1 أبريل 2026، ويوصي باستخدام LevelPlay mediation.

الاستنتاج العملي: الرقم 800364136 وحده لا يكفي لدمج إعلان داخل موقع الويب. يلزم تحديد نوع الرقم (Game ID أو Placement ID) ومنصة Unity/Android المقصودة. بالنسبة لموقع Manus، لا ينبغي حقن Unity Ads mobile SDK داخل المتصفح لأنه ليس مسارًا موثقًا لهذا النوع من المواقع. يمكن إبقاء تكامل Unity داخل Android، أو استخدام شبكة ويب لديها Web SDK/وسم HTML رسمي، بعد توفير معرف الموقع/الوحدة الخاص بها.
أرسل المستخدم لقطة من لوحة Unity Placements. البيانات الظاهرة:
- التطبيق: Endless Avoider
- Game ID للأندرويد: 800364136
- Banner Placement ID: Banner_Android
- Interstitial Placement ID: Interstitial_Android
- Rewarded Placement ID: Rewarded_Android
- جميع الوحدات حالتها Active.

سيُستخدم Game ID 800364136 والوحدات الثلاث الظاهرة، وهو الرقم المؤكد من لقطة لوحة تطبيق المستخدم.
توثيق Unity الرسمي لتثبيت Android يوصي بإضافة Maven Central والاعتماد `com.unity3d.ads:unity-ads:4.7.0` أو إصدار متوافق، مع Java 8+ وتصريح AD_ID عند استهداف Android 13+. دليل الإعلان المكافأ يوضح أن منح المكافأة يجب أن يحدث فقط عند اكتمال المشاهدة عبر UnityAdsShowCompletionState.COMPLETED، وأن SDK يحتاج Activity الحالية. سنستخدم هذه القواعد عند إنشاء طبقة Capacitor الأصلية، مع عدم اعتبار الإعلان مكتملاً بمجرد فتحه.
المصدران الرسميان:
https://docs.unity.com/en-us/grow/ads/android-sdk/install-sdk
https://docs.unity.com/en-us/grow/ads/android-sdk/rewarded-ads
دليل Unity الرسمي للبانر يؤكد أن BannerView يحتاج UnityBannerSize، وsetListener، وload()، ثم إضافته إلى View hierarchy، بعد تهيئة Unity Ads. هذا يسمح بوضع Banner_Android في شاشة النتيجة فقط، مع إزالة العرض عند مغادرة الشاشة.
المصدر: https://docs.unity.com/en-us/grow/ads/android-sdk/banner-ads
