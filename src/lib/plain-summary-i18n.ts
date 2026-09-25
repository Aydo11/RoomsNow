import { money as formatMoney } from "./format";
import { plainSummary, type PlainSummaryInput } from "./plain-summary";

/**
 * "In simple words" in the languages most spoken in RoomsNow's first areas
 * after English. Built from the same advert fields as the English version, so
 * every translation says exactly the same facts. Place names, prices and
 * scheme names (Housing Benefit) stay as they are.
 */
export const SUMMARY_LANGUAGES = [
  { code: "en", label: "English", speech: "en-GB", dir: "ltr", heading: "In simple words" },
  { code: "ur", label: "اردو", speech: "ur", dir: "rtl", heading: "آسان الفاظ میں" },
  { code: "pa", label: "ਪੰਜਾਬੀ", speech: "pa", dir: "ltr", heading: "ਸੌਖੇ ਸ਼ਬਦਾਂ ਵਿੱਚ" },
  { code: "pl", label: "Polski", speech: "pl", dir: "ltr", heading: "W prostych słowach" },
  { code: "ar", label: "العربية", speech: "ar", dir: "rtl", heading: "بكلمات بسيطة" },
  { code: "ro", label: "Română", speech: "ro", dir: "ltr", heading: "Pe înțelesul tuturor" },
] as const;

export type SummaryLanguage = (typeof SUMMARY_LANGUAGES)[number]["code"];
type Other = Exclude<SummaryLanguage, "en">;

type Pack = {
  locale: string;
  kinds: Record<string, string>;
  home: string;
  support: Record<string, string>;
  join: (items: string[]) => string;
  kind: (kind: string, place: string) => string;
  moveFrom: (date: string) => string;
  free: (n: number) => string;
  rentOne: (a: string) => string;
  rentRange: (a: string, b: string) => string;
  rentAsk: string;
  billsIn: string;
  billsOut: string;
  hbYes: string;
  hbNo: string;
  supportLine: (list: string) => string;
  women: string;
  men: string;
  mixed: string;
  ageRange: (a: number, b: number) => string;
  ageMin: (a: number) => string;
  ageMax: (a: number) => string;
  applySelf: string;
  needReferral: string;
  stepFree: string;
  pets: string;
};

const joinWith = (separator: string, and: string) => (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(separator)}${and}${items[items.length - 1]}`;

const PACKS: Record<Other, Pack> = {
  ur: {
    locale: "ur-PK",
    kinds: {
      SINGLE_ROOM: "ایک سنگل کمرہ",
      SHARED_ACCOMMODATION: "ایک مشترکہ گھر میں کمرہ",
      SELF_CONTAINED: "اپنے کچن اور باتھ روم والا گھر",
      FLAT: "ایک فلیٹ",
      HOUSE: "ایک مکان",
    },
    home: "ایک گھر",
    support: {
      "mental-health": "ذہنی صحت",
      homelessness: "بے گھری",
      "substance-misuse": "نشے کے مسائل",
      "learning-disability": "سیکھنے کی معذوری",
      "physical-disability": "جسمانی معذوری",
      "young-people": "نوجوان افراد",
      "care-leavers": "کیئر چھوڑنے والے نوجوان",
      "vulnerable-adults": "کمزور بالغ افراد",
      "domestic-abuse": "گھریلو زیادتی",
      "ex-offenders": "جیل سے رہا ہونے والے افراد",
    },
    join: joinWith("، ", " اور "),
    kind: (kind, place) => `یہ ${place} میں ${kind} ہے۔`,
    moveFrom: (date) => `آپ ${date} سے یہاں منتقل ہو سکتے ہیں۔`,
    free: (n) => (n === 1 ? "ابھی 1 کمرہ خالی ہے۔" : `ابھی ${n} کمرے خالی ہیں۔`),
    rentOne: (a) => `کرایہ ${a} فی ہفتہ ہے۔`,
    rentRange: (a, b) => `کرایہ ${a} سے ${b} فی ہفتہ ہے۔`,
    rentAsk: "کرایے کے بارے میں فراہم کنندہ سے پوچھیں۔",
    billsIn: "بل کرایے میں شامل ہیں۔",
    billsOut: "بل شامل نہیں ہیں۔ آپ انہیں الگ سے ادا کریں گے۔",
    hbYes: "آپ ہاؤسنگ بینیفٹ (Housing Benefit) سے ادائیگی کر سکتے ہیں۔",
    hbNo: "یہاں ہاؤسنگ بینیفٹ (Housing Benefit) سے ادائیگی نہیں ہو سکتی۔",
    supportLine: (list) => `عملہ ${list} میں مدد کر سکتا ہے۔`,
    women: "یہ صرف خواتین کے لیے ہے۔",
    men: "یہ صرف مردوں کے لیے ہے۔",
    mixed: "یہاں مرد اور خواتین دونوں رہتے ہیں۔",
    ageRange: (a, b) => `آپ کی عمر ${a} سے ${b} سال کے درمیان ہونی چاہیے۔`,
    ageMin: (a) => `آپ کی عمر کم از کم ${a} سال ہونی چاہیے۔`,
    ageMax: (a) => `آپ کی عمر ${a} سال یا اس سے کم ہونی چاہیے۔`,
    applySelf: "آپ خود درخواست دے سکتے ہیں۔",
    needReferral: "آپ کو کسی سپورٹ ورکر یا کونسل کے ذریعے ریفر کیا جانا ضروری ہے۔",
    stepFree: "یہاں سیڑھیوں کے بغیر رسائی ہے۔",
    pets: "پالتو جانور رکھنے کی اجازت ہے۔",
  },
  pa: {
    locale: "pa-IN",
    kinds: {
      SINGLE_ROOM: "ਇੱਕ ਸਿੰਗਲ ਕਮਰਾ",
      SHARED_ACCOMMODATION: "ਸਾਂਝੇ ਘਰ ਵਿੱਚ ਇੱਕ ਕਮਰਾ",
      SELF_CONTAINED: "ਆਪਣੀ ਰਸੋਈ ਅਤੇ ਬਾਥਰੂਮ ਵਾਲਾ ਘਰ",
      FLAT: "ਇੱਕ ਫਲੈਟ",
      HOUSE: "ਇੱਕ ਮਕਾਨ",
    },
    home: "ਇੱਕ ਘਰ",
    support: {
      "mental-health": "ਮਾਨਸਿਕ ਸਿਹਤ",
      homelessness: "ਬੇਘਰੀ",
      "substance-misuse": "ਨਸ਼ੇ ਦੀ ਸਮੱਸਿਆ",
      "learning-disability": "ਸਿੱਖਣ ਵਿੱਚ ਅਪੰਗਤਾ",
      "physical-disability": "ਸਰੀਰਕ ਅਪੰਗਤਾ",
      "young-people": "ਨੌਜਵਾਨ",
      "care-leavers": "ਕੇਅਰ ਛੱਡਣ ਵਾਲੇ ਨੌਜਵਾਨ",
      "vulnerable-adults": "ਕਮਜ਼ੋਰ ਬਾਲਗ",
      "domestic-abuse": "ਘਰੇਲੂ ਹਿੰਸਾ",
      "ex-offenders": "ਜੇਲ੍ਹ ਤੋਂ ਰਿਹਾ ਹੋਏ ਲੋਕ",
    },
    join: joinWith(", ", " ਅਤੇ "),
    kind: (kind, place) => `ਇਹ ${place} ਵਿੱਚ ${kind} ਹੈ।`,
    moveFrom: (date) => `ਤੁਸੀਂ ${date} ਤੋਂ ਇੱਥੇ ਰਹਿਣ ਆ ਸਕਦੇ ਹੋ।`,
    free: (n) => (n === 1 ? "ਹੁਣ 1 ਕਮਰਾ ਖਾਲੀ ਹੈ।" : `ਹੁਣ ${n} ਕਮਰੇ ਖਾਲੀ ਹਨ।`),
    rentOne: (a) => `ਕਿਰਾਇਆ ${a} ਪ੍ਰਤੀ ਹਫ਼ਤਾ ਹੈ।`,
    rentRange: (a, b) => `ਕਿਰਾਇਆ ${a} ਤੋਂ ${b} ਪ੍ਰਤੀ ਹਫ਼ਤਾ ਹੈ।`,
    rentAsk: "ਕਿਰਾਏ ਬਾਰੇ ਪ੍ਰਦਾਤਾ ਤੋਂ ਪੁੱਛੋ।",
    billsIn: "ਬਿੱਲ ਕਿਰਾਏ ਵਿੱਚ ਸ਼ਾਮਲ ਹਨ।",
    billsOut: "ਬਿੱਲ ਸ਼ਾਮਲ ਨਹੀਂ ਹਨ। ਤੁਸੀਂ ਇਹ ਵੱਖਰੇ ਤੌਰ 'ਤੇ ਭਰੋਗੇ।",
    hbYes: "ਤੁਸੀਂ ਹਾਊਸਿੰਗ ਬੈਨੀਫ਼ਿਟ (Housing Benefit) ਨਾਲ ਭੁਗਤਾਨ ਕਰ ਸਕਦੇ ਹੋ।",
    hbNo: "ਇੱਥੇ ਹਾਊਸਿੰਗ ਬੈਨੀਫ਼ਿਟ (Housing Benefit) ਨਾਲ ਭੁਗਤਾਨ ਨਹੀਂ ਹੋ ਸਕਦਾ।",
    supportLine: (list) => `ਸਟਾਫ਼ ${list} ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹੈ।`,
    women: "ਇਹ ਸਿਰਫ਼ ਔਰਤਾਂ ਲਈ ਹੈ।",
    men: "ਇਹ ਸਿਰਫ਼ ਮਰਦਾਂ ਲਈ ਹੈ।",
    mixed: "ਇੱਥੇ ਮਰਦ ਅਤੇ ਔਰਤਾਂ ਦੋਵੇਂ ਰਹਿੰਦੇ ਹਨ।",
    ageRange: (a, b) => `ਤੁਹਾਡੀ ਉਮਰ ${a} ਤੋਂ ${b} ਸਾਲ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।`,
    ageMin: (a) => `ਤੁਹਾਡੀ ਉਮਰ ਘੱਟੋ-ਘੱਟ ${a} ਸਾਲ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।`,
    ageMax: (a) => `ਤੁਹਾਡੀ ਉਮਰ ${a} ਸਾਲ ਜਾਂ ਘੱਟ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।`,
    applySelf: "ਤੁਸੀਂ ਖ਼ੁਦ ਅਰਜ਼ੀ ਦੇ ਸਕਦੇ ਹੋ।",
    needReferral: "ਤੁਹਾਨੂੰ ਕਿਸੇ ਸਪੋਰਟ ਵਰਕਰ ਜਾਂ ਕੌਂਸਲ ਵੱਲੋਂ ਰੈਫ਼ਰ ਕੀਤਾ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ।",
    stepFree: "ਇੱਥੇ ਪੌੜੀਆਂ ਤੋਂ ਬਿਨਾਂ ਪਹੁੰਚ ਹੈ।",
    pets: "ਪਾਲਤੂ ਜਾਨਵਰ ਰੱਖਣ ਦੀ ਇਜਾਜ਼ਤ ਹੈ।",
  },
  pl: {
    locale: "pl-PL",
    kinds: {
      SINGLE_ROOM: "pojedynczy pokój",
      SHARED_ACCOMMODATION: "pokój we wspólnym domu",
      SELF_CONTAINED: "mieszkanie z własną kuchnią i łazienką",
      FLAT: "mieszkanie",
      HOUSE: "dom",
    },
    home: "lokal mieszkalny",
    support: {
      "mental-health": "zdrowie psychiczne",
      homelessness: "bezdomność",
      "substance-misuse": "uzależnienia",
      "learning-disability": "niepełnosprawność intelektualna",
      "physical-disability": "niepełnosprawność fizyczna",
      "young-people": "młodzi ludzie",
      "care-leavers": "osoby opuszczające pieczę zastępczą",
      "vulnerable-adults": "osoby dorosłe w trudnej sytuacji",
      "domestic-abuse": "przemoc domowa",
      "ex-offenders": "osoby po wyjściu z więzienia",
    },
    join: joinWith(", ", " i "),
    kind: (kind, place) => `To jest ${kind}. Lokalizacja: ${place}.`,
    moveFrom: (date) => `Można się wprowadzić od ${date}.`,
    free: (n) => {
      if (n === 1) return "Teraz wolny jest 1 pokój.";
      const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
      return few ? `Teraz wolne są ${n} pokoje.` : `Teraz wolnych jest ${n} pokoi.`;
    },
    rentOne: (a) => `Czynsz wynosi ${a} tygodniowo.`,
    rentRange: (a, b) => `Czynsz wynosi od ${a} do ${b} tygodniowo.`,
    rentAsk: "Zapytaj dostawcę o wysokość czynszu.",
    billsIn: "Rachunki są wliczone w czynsz.",
    billsOut: "Rachunki nie są wliczone. Płacisz je osobno.",
    hbYes: "Możesz płacić z zasiłku mieszkaniowego (Housing Benefit).",
    hbNo: "Tutaj nie można płacić z zasiłku mieszkaniowego (Housing Benefit).",
    supportLine: (list) => `Personel może pomóc w sprawach: ${list}.`,
    women: "Tylko dla kobiet.",
    men: "Tylko dla mężczyzn.",
    mixed: "Mieszkają tu kobiety i mężczyźni.",
    ageRange: (a, b) => `Wiek: od ${a} do ${b} lat.`,
    ageMin: (a) => `Minimalny wiek: ${a}.`,
    ageMax: (a) => `Maksymalny wiek: ${a}.`,
    applySelf: "Możesz złożyć wniosek samodzielnie.",
    needReferral: "Potrzebne jest skierowanie od pracownika wsparcia lub urzędu (council).",
    stepFree: "Dostęp bez schodów.",
    pets: "Zwierzęta są dozwolone.",
  },
  ar: {
    locale: "ar",
    kinds: {
      SINGLE_ROOM: "غرفة فردية",
      SHARED_ACCOMMODATION: "غرفة في منزل مشترك",
      SELF_CONTAINED: "مسكن بمطبخ وحمّام خاصّين",
      FLAT: "شقة",
      HOUSE: "منزل",
    },
    home: "مسكن",
    support: {
      "mental-health": "الصحة النفسية",
      homelessness: "التشرد",
      "substance-misuse": "الإدمان",
      "learning-disability": "صعوبات التعلّم",
      "physical-disability": "الإعاقة الجسدية",
      "young-people": "الشباب",
      "care-leavers": "الشباب الخارجون من الرعاية",
      "vulnerable-adults": "البالغون المستضعفون",
      "domestic-abuse": "العنف الأسري",
      "ex-offenders": "الخارجون من السجن",
    },
    join: joinWith("، ", " و"),
    kind: (kind, place) => `هذا ${kind} في ${place}.`,
    moveFrom: (date) => `يمكنك الانتقال إليه ابتداءً من ${date}.`,
    free: (n) => {
      if (n === 1) return "توجد غرفة واحدة متاحة الآن.";
      if (n === 2) return "توجد غرفتان متاحتان الآن.";
      if (n <= 10) return `توجد ${n} غرف متاحة الآن.`;
      return `توجد ${n} غرفة متاحة الآن.`;
    },
    rentOne: (a) => `الإيجار ${a} في الأسبوع.`,
    rentRange: (a, b) => `الإيجار من ${a} إلى ${b} في الأسبوع.`,
    rentAsk: "اسأل مقدّم السكن عن قيمة الإيجار.",
    billsIn: "الفواتير مشمولة في الإيجار.",
    billsOut: "الفواتير غير مشمولة. ستدفعها بشكل منفصل.",
    hbYes: "يمكنك الدفع من خلال إعانة السكن (Housing Benefit).",
    hbNo: "لا يمكن الدفع هنا من خلال إعانة السكن (Housing Benefit).",
    supportLine: (list) => `يمكن للموظفين المساعدة في: ${list}.`,
    women: "هذا السكن للنساء فقط.",
    men: "هذا السكن للرجال فقط.",
    mixed: "يعيش هنا رجال ونساء.",
    ageRange: (a, b) => `يجب أن يكون عمرك بين ${a} و${b} سنة.`,
    ageMin: (a) => `يجب أن يكون عمرك ${a} سنة أو أكثر.`,
    ageMax: (a) => `يجب أن يكون عمرك ${a} سنة أو أقل.`,
    applySelf: "يمكنك التقديم بنفسك.",
    needReferral: "يجب أن تتم إحالتك من قِبل عامل دعم أو من المجلس المحلي.",
    stepFree: "يمكن الوصول إليه بدون درج.",
    pets: "يُسمح بالحيوانات الأليفة.",
  },
  ro: {
    locale: "ro-RO",
    kinds: {
      SINGLE_ROOM: "o cameră single",
      SHARED_ACCOMMODATION: "o cameră într-o casă comună",
      SELF_CONTAINED: "o locuință cu bucătărie și baie proprii",
      FLAT: "un apartament",
      HOUSE: "o casă",
    },
    home: "o locuință",
    support: {
      "mental-health": "sănătate mintală",
      homelessness: "lipsa unei locuințe",
      "substance-misuse": "dependențe",
      "learning-disability": "dizabilități de învățare",
      "physical-disability": "dizabilități fizice",
      "young-people": "tineri",
      "care-leavers": "tineri care părăsesc sistemul de protecție",
      "vulnerable-adults": "adulți vulnerabili",
      "domestic-abuse": "violență domestică",
      "ex-offenders": "persoane eliberate din închisoare",
    },
    join: joinWith(", ", " și "),
    kind: (kind, place) => `Este ${kind} în ${place}.`,
    moveFrom: (date) => `Vă puteți muta începând cu ${date}.`,
    free: (n) => (n === 1 ? "Acum este liberă 1 cameră." : `Acum sunt libere ${n}${n >= 20 ? " de" : ""} camere.`),
    rentOne: (a) => `Chiria este ${a} pe săptămână.`,
    rentRange: (a, b) => `Chiria este între ${a} și ${b} pe săptămână.`,
    rentAsk: "Întrebați furnizorul cât este chiria.",
    billsIn: "Facturile sunt incluse în chirie.",
    billsOut: "Facturile nu sunt incluse. Le plătiți separat.",
    hbYes: "Puteți plăti cu Housing Benefit (ajutorul pentru locuință).",
    hbNo: "Aici nu se poate plăti cu Housing Benefit (ajutorul pentru locuință).",
    supportLine: (list) => `Personalul poate ajuta cu: ${list}.`,
    women: "Este doar pentru femei.",
    men: "Este doar pentru bărbați.",
    mixed: "Aici locuiesc atât bărbați, cât și femei.",
    ageRange: (a, b) => `Trebuie să aveți între ${a} și ${b}${b >= 20 ? " de" : ""} ani.`,
    ageMin: (a) => `Trebuie să aveți cel puțin ${a}${a >= 20 ? " de" : ""} ani.`,
    ageMax: (a) => `Trebuie să aveți cel mult ${a}${a >= 20 ? " de" : ""} ani.`,
    applySelf: "Puteți aplica singur(ă).",
    needReferral: "Trebuie să fiți recomandat(ă) de un asistent social sau de consiliul local.",
    stepFree: "Are acces fără trepte.",
    pets: "Animalele de companie sunt permise.",
  },
};

function translated(input: PlainSummaryInput, lang: Other, now: Date): string[] {
  const t = PACKS[lang];
  // Keep prices and place names left-to-right inside Urdu and Arabic sentences ("£150", not "150£").
  const ltr = (text: string) => (lang === "ur" || lang === "ar" ? `\u2066${text}\u2069` : text);
  const money = (pence: number | null) => ltr(formatMoney(pence));
  const lines: string[] = [];
  const place = ltr([input.area, input.city].filter(Boolean).join(", "));
  lines.push(t.kind(t.kinds[input.accommodationType] ?? t.home, place));

  const from = input.availableFrom ? new Date(input.availableFrom) : null;
  if (from && from.getTime() > now.getTime()) {
    lines.push(t.moveFrom(from.toLocaleDateString(t.locale, { day: "numeric", month: "long", numberingSystem: "latn" })));
  } else if (input.availableRooms > 0) {
    lines.push(t.free(input.availableRooms));
  }

  if (input.weeklyRentFrom || input.weeklyRentTo) {
    const low = input.weeklyRentFrom ?? input.weeklyRentTo;
    const high = input.weeklyRentTo ?? input.weeklyRentFrom;
    lines.push(low !== high ? t.rentRange(money(low), money(high)) : t.rentOne(money(low)));
  } else {
    lines.push(t.rentAsk);
  }
  lines.push(input.billsIncluded ? t.billsIn : t.billsOut);
  lines.push(input.housingBenefit ? t.hbYes : t.hbNo);

  const support = input.supportTypes.map((slug) => t.support[slug]).filter(Boolean);
  if (support.length) lines.push(t.supportLine(t.join(support)));

  if (input.genderArrangement === "FEMALE_ONLY") lines.push(t.women);
  else if (input.genderArrangement === "MALE_ONLY") lines.push(t.men);
  else if (input.genderArrangement === "MIXED") lines.push(t.mixed);

  if (input.minAge && input.maxAge) lines.push(t.ageRange(input.minAge, input.maxAge));
  else if (input.minAge) lines.push(t.ageMin(input.minAge));
  else if (input.maxAge) lines.push(t.ageMax(input.maxAge));

  const routes = input.referralRoutes;
  if (routes.includes("SELF_REFERRAL") || routes.includes("ANY")) lines.push(t.applySelf);
  else if (routes.length) lines.push(t.needReferral);

  if (input.wheelchairAccess) lines.push(t.stepFree);
  if (input.petsAllowed) lines.push(t.pets);
  return lines;
}

/** The simple summary in every supported language, keyed by language code. */
export function plainSummaries(input: PlainSummaryInput, now = new Date()): Record<SummaryLanguage, string[]> {
  return {
    en: plainSummary(input, now),
    ur: translated(input, "ur", now),
    pa: translated(input, "pa", now),
    pl: translated(input, "pl", now),
    ar: translated(input, "ar", now),
    ro: translated(input, "ro", now),
  };
}
