import type { RewardedHintResult } from "./admob";

export function getRewardedHintMessage(status: RewardedHintResult | "ready" | "loading" | "used"): string | null {
  switch (status) {
    case "consent-unavailable":
      return "موافقة الإعلانات غير متاحة؛ افتح إعدادات الخصوصية وجرّب مرة أخرى.";
    case "offline":
      return "لا يوجد اتصال بالإنترنت؛ اتصل بالإنترنت ثم جرّب الإعلان.";
    case "no-fill":
      return "لا يوجد إعلان متاح الآن من الشبكة؛ جرّب بعد قليل.";
    case "sdk-error":
      return "حدث خطأ مؤقت في خدمة الإعلانات؛ أغلق الجولة وافتحها ثم جرّب.";
    case "not-native":
      return "التلميح بالإعلان يعمل داخل نسخة Android فقط.";
    default:
      return null;
  }
}
