import { SUMMARY_LANGUAGES, type SummaryLanguage } from "./plain-summary-i18n";

/**
 * "What happens next": the steps after someone asks for a room, in plain
 * words and in the same languages as the advert summaries. General guidance
 * only; councils and providers differ, so it never promises outcomes.
 */

export type NextStepId = "applied" | "viewing" | "rent" | "move-in" | "first-week" | "problems";
export type NextStep = { id: NextStepId; title: string; points: string[] };
export type NextStepsText = { heading: string; intro: string; youAreHere: string; steps: NextStep[] };

export const NEXT_STEP_IDS: NextStepId[] = ["applied", "viewing", "rent", "move-in", "first-week", "problems"];

/** Which step someone is at, from their request or referral status. */
export function stepForStatus(status: string | null | undefined): NextStepId | null {
  switch (status) {
    case "SUBMITTED":
    case "RECEIVED":
      return "applied";
    case "UNDER_REVIEW":
    case "ASSESSMENT":
      return "viewing";
    case "OFFERED":
    case "ACCEPTED":
      return "rent";
    case "MOVED_IN":
      return "first-week";
    default:
      return null;
  }
}

const steps = (titles: string[], points: string[][]): NextStep[] =>
  NEXT_STEP_IDS.map((id, index) => ({ id, title: titles[index], points: points[index] }));

export const NEXT_STEPS: Record<SummaryLanguage, NextStepsText> = {
  en: {
    heading: "What happens next",
    intro: "What to expect after you ask for a room, step by step.",
    youAreHere: "You are here",
    steps: steps(
      ["After you apply", "Viewing and a chat about support", "Paying the rent: Housing Benefit", "Move-in day: what to bring", "Your first week", "If something goes wrong"],
      [
        [
          "The provider reads your request. Most reply within a few days.",
          "Keep your phone on and check your RoomsNow messages.",
          "If you have a support worker, tell them you have applied.",
          "If you don't hear back within a week, send the provider a message.",
        ],
        [
          "The provider may invite you to see the room.",
          "They will ask about the support you need. This is normal and helps them keep everyone safe.",
          "You can bring a friend, a family member or your support worker.",
          "Ask about the rent, bills, house rules and the support you will get each week.",
        ],
        [
          "In supported housing, the rent is usually paid by Housing Benefit from your local council, even if you get Universal Credit.",
          "The provider can usually help you fill in the claim. Claim straight away, because it can only be backdated for a short time.",
          "You may need to pay a small weekly amount yourself, for things like bills or food. Ask how much it is before you move in.",
          "Universal Credit still pays your living costs. Tell them your new address.",
        ],
        [
          "Photo ID, like a passport, driving licence or other ID.",
          "Your National Insurance number and your bank details.",
          "Proof of your income or benefits, like a Universal Credit statement.",
          "Any medication, prescriptions and your GP's details.",
          "Your phone and charger, clothes and toiletries. Ask if bedding and kitchen things are provided.",
        ],
        [
          "You will sign a licence or tenancy agreement. Read it, and ask about anything you don't understand.",
          "Meet your support worker and agree your support plan together.",
          "If you have moved area, register with a GP near you.",
          "Give your new address to Universal Credit, your bank and your GP.",
          "Find out how to report repairs and who to call in an emergency.",
        ],
        [
          "Talk to your support worker or the provider first.",
          "Every provider should have a complaints process. Ask for a copy.",
          "You can also contact your local council's housing team.",
          "If you are in danger, call 999.",
        ],
      ],
    ),
  },
  ur: {
    heading: "آگے کیا ہوگا",
    intro: "کمرے کی درخواست کے بعد کیا ہوتا ہے، قدم بہ قدم۔",
    youAreHere: "آپ یہاں ہیں",
    steps: steps(
      ["درخواست دینے کے بعد", "کمرہ دیکھنا اور مدد کے بارے میں بات چیت", "کرایہ کی ادائیگی: ہاؤسنگ بینیفٹ (Housing Benefit)", "منتقلی کا دن: کیا ساتھ لائیں", "آپ کا پہلا ہفتہ", "اگر کچھ غلط ہو جائے"],
      [
        [
          "فراہم کنندہ آپ کی درخواست پڑھے گا۔ زیادہ تر چند دنوں میں جواب دیتے ہیں۔",
          "اپنا فون آن رکھیں اور RoomsNow پر اپنے پیغامات دیکھتے رہیں۔",
          "اگر آپ کا کوئی سپورٹ ورکر ہے تو انہیں بتائیں کہ آپ نے درخواست دی ہے۔",
          "اگر ایک ہفتے میں جواب نہ آئے تو فراہم کنندہ کو پیغام بھیجیں۔",
        ],
        [
          "فراہم کنندہ آپ کو کمرہ دیکھنے کے لیے بلا سکتا ہے۔",
          "وہ آپ سے پوچھیں گے کہ آپ کو کس مدد کی ضرورت ہے۔ یہ عام بات ہے اور اس سے سب کو محفوظ رکھنے میں مدد ملتی ہے۔",
          "آپ کسی دوست، گھر والے یا اپنے سپورٹ ورکر کو ساتھ لا سکتے ہیں۔",
          "کرایہ، بلوں، گھر کے اصولوں اور ہر ہفتے ملنے والی مدد کے بارے میں پوچھیں۔",
        ],
        [
          "سپورٹڈ ہاؤسنگ میں کرایہ عام طور پر آپ کی مقامی کونسل ہاؤسنگ بینیفٹ کے ذریعے ادا کرتی ہے، چاہے آپ کو یونیورسل کریڈٹ (Universal Credit) ملتا ہو۔",
          "فراہم کنندہ عام طور پر درخواست بھرنے میں مدد کر سکتا ہے۔ فوراً درخواست دیں، کیونکہ یہ صرف تھوڑے عرصے کے لیے پچھلی تاریخ سے لاگو ہو سکتی ہے۔",
          "ہو سکتا ہے آپ کو بلوں یا کھانے جیسی چیزوں کے لیے ہر ہفتے تھوڑی رقم خود ادا کرنی پڑے۔ منتقل ہونے سے پہلے پوچھ لیں کہ یہ کتنی ہے۔",
          "یونیورسل کریڈٹ آپ کے روزمرہ کے اخراجات ادا کرتا رہے گا۔ انہیں اپنا نیا پتہ بتائیں۔",
        ],
        [
          "تصویر والی شناخت، جیسے پاسپورٹ، ڈرائیونگ لائسنس یا کوئی اور شناختی دستاویز۔",
          "اپنا نیشنل انشورنس نمبر اور بینک کی تفصیلات۔",
          "اپنی آمدنی یا بینیفٹس کا ثبوت، جیسے یونیورسل کریڈٹ کا اسٹیٹمنٹ۔",
          "کوئی بھی دوائیں، نسخے اور اپنے جی پی (GP) کی تفصیلات۔",
          "اپنا فون اور چارجر، کپڑے اور ذاتی استعمال کی چیزیں۔ پوچھ لیں کہ بستر اور باورچی خانے کا سامان دیا جاتا ہے یا نہیں۔",
        ],
        [
          "آپ ایک لائسنس یا کرایہ داری کے معاہدے پر دستخط کریں گے۔ اسے پڑھیں اور جو بات سمجھ نہ آئے وہ پوچھیں۔",
          "اپنے سپورٹ ورکر سے ملیں اور مل کر اپنا سپورٹ پلان طے کریں۔",
          "اگر آپ نئے علاقے میں آئے ہیں تو قریبی جی پی کے پاس رجسٹر ہوں۔",
          "یونیورسل کریڈٹ، اپنے بینک اور جی پی کو اپنا نیا پتہ دیں۔",
          "معلوم کریں کہ مرمت کی اطلاع کیسے دینی ہے اور ہنگامی صورت میں کس کو فون کرنا ہے۔",
        ],
        [
          "پہلے اپنے سپورٹ ورکر یا فراہم کنندہ سے بات کریں۔",
          "ہر فراہم کنندہ کے پاس شکایت کا طریقہ ہونا چاہیے۔ اس کی ایک کاپی مانگیں۔",
          "آپ اپنی مقامی کونسل کی ہاؤسنگ ٹیم سے بھی رابطہ کر سکتے ہیں۔",
          "اگر آپ خطرے میں ہیں تو 999 پر کال کریں۔",
        ],
      ],
    ),
  },
  pa: {
    heading: "ਅੱਗੇ ਕੀ ਹੋਵੇਗਾ",
    intro: "ਕਮਰੇ ਲਈ ਬੇਨਤੀ ਕਰਨ ਤੋਂ ਬਾਅਦ ਕੀ ਹੁੰਦਾ ਹੈ, ਕਦਮ-ਦਰ-ਕਦਮ।",
    youAreHere: "ਤੁਸੀਂ ਇੱਥੇ ਹੋ",
    steps: steps(
      ["ਅਰਜ਼ੀ ਦੇਣ ਤੋਂ ਬਾਅਦ", "ਕਮਰਾ ਦੇਖਣਾ ਅਤੇ ਸਹਾਇਤਾ ਬਾਰੇ ਗੱਲਬਾਤ", "ਕਿਰਾਇਆ ਭਰਨਾ: ਹਾਊਸਿੰਗ ਬੈਨੀਫ਼ਿਟ (Housing Benefit)", "ਰਹਿਣ ਆਉਣ ਦਾ ਦਿਨ: ਕੀ ਨਾਲ ਲਿਆਉਣਾ ਹੈ", "ਤੁਹਾਡਾ ਪਹਿਲਾ ਹਫ਼ਤਾ", "ਜੇ ਕੁਝ ਗ਼ਲਤ ਹੋ ਜਾਵੇ"],
      [
        [
          "ਪ੍ਰਦਾਤਾ ਤੁਹਾਡੀ ਬੇਨਤੀ ਪੜ੍ਹੇਗਾ। ਬਹੁਤੇ ਕੁਝ ਦਿਨਾਂ ਵਿੱਚ ਜਵਾਬ ਦਿੰਦੇ ਹਨ।",
          "ਆਪਣਾ ਫ਼ੋਨ ਚਾਲੂ ਰੱਖੋ ਅਤੇ RoomsNow 'ਤੇ ਆਪਣੇ ਸੁਨੇਹੇ ਦੇਖਦੇ ਰਹੋ।",
          "ਜੇ ਤੁਹਾਡਾ ਕੋਈ ਸਪੋਰਟ ਵਰਕਰ ਹੈ, ਤਾਂ ਉਨ੍ਹਾਂ ਨੂੰ ਦੱਸੋ ਕਿ ਤੁਸੀਂ ਅਰਜ਼ੀ ਦਿੱਤੀ ਹੈ।",
          "ਜੇ ਇੱਕ ਹਫ਼ਤੇ ਵਿੱਚ ਜਵਾਬ ਨਾ ਆਵੇ, ਤਾਂ ਪ੍ਰਦਾਤਾ ਨੂੰ ਸੁਨੇਹਾ ਭੇਜੋ।",
        ],
        [
          "ਪ੍ਰਦਾਤਾ ਤੁਹਾਨੂੰ ਕਮਰਾ ਦੇਖਣ ਲਈ ਬੁਲਾ ਸਕਦਾ ਹੈ।",
          "ਉਹ ਪੁੱਛਣਗੇ ਕਿ ਤੁਹਾਨੂੰ ਕਿਹੜੀ ਸਹਾਇਤਾ ਚਾਹੀਦੀ ਹੈ। ਇਹ ਆਮ ਗੱਲ ਹੈ ਅਤੇ ਇਸ ਨਾਲ ਸਾਰਿਆਂ ਨੂੰ ਸੁਰੱਖਿਅਤ ਰੱਖਣ ਵਿੱਚ ਮਦਦ ਮਿਲਦੀ ਹੈ।",
          "ਤੁਸੀਂ ਕਿਸੇ ਦੋਸਤ, ਪਰਿਵਾਰ ਦੇ ਮੈਂਬਰ ਜਾਂ ਆਪਣੇ ਸਪੋਰਟ ਵਰਕਰ ਨੂੰ ਨਾਲ ਲਿਆ ਸਕਦੇ ਹੋ।",
          "ਕਿਰਾਏ, ਬਿੱਲਾਂ, ਘਰ ਦੇ ਨਿਯਮਾਂ ਅਤੇ ਹਰ ਹਫ਼ਤੇ ਮਿਲਣ ਵਾਲੀ ਸਹਾਇਤਾ ਬਾਰੇ ਪੁੱਛੋ।",
        ],
        [
          "ਸਪੋਰਟਿਡ ਹਾਊਸਿੰਗ ਵਿੱਚ ਕਿਰਾਇਆ ਆਮ ਤੌਰ 'ਤੇ ਤੁਹਾਡੀ ਸਥਾਨਕ ਕੌਂਸਲ ਹਾਊਸਿੰਗ ਬੈਨੀਫ਼ਿਟ ਰਾਹੀਂ ਭਰਦੀ ਹੈ, ਭਾਵੇਂ ਤੁਹਾਨੂੰ ਯੂਨੀਵਰਸਲ ਕ੍ਰੈਡਿਟ (Universal Credit) ਮਿਲਦਾ ਹੋਵੇ।",
          "ਪ੍ਰਦਾਤਾ ਆਮ ਤੌਰ 'ਤੇ ਦਾਅਵਾ ਭਰਨ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹੈ। ਤੁਰੰਤ ਦਾਅਵਾ ਕਰੋ, ਕਿਉਂਕਿ ਇਹ ਸਿਰਫ਼ ਥੋੜ੍ਹੇ ਸਮੇਂ ਲਈ ਪਿਛਲੀ ਤਾਰੀਖ਼ ਤੋਂ ਲਾਗੂ ਹੋ ਸਕਦਾ ਹੈ।",
          "ਹੋ ਸਕਦਾ ਹੈ ਤੁਹਾਨੂੰ ਬਿੱਲਾਂ ਜਾਂ ਖਾਣੇ ਵਰਗੀਆਂ ਚੀਜ਼ਾਂ ਲਈ ਹਰ ਹਫ਼ਤੇ ਥੋੜ੍ਹੀ ਰਕਮ ਆਪ ਦੇਣੀ ਪਵੇ। ਰਹਿਣ ਆਉਣ ਤੋਂ ਪਹਿਲਾਂ ਪੁੱਛ ਲਓ ਕਿ ਇਹ ਕਿੰਨੀ ਹੈ।",
          "ਯੂਨੀਵਰਸਲ ਕ੍ਰੈਡਿਟ ਤੁਹਾਡੇ ਰੋਜ਼ਾਨਾ ਖ਼ਰਚੇ ਦਿੰਦਾ ਰਹੇਗਾ। ਉਨ੍ਹਾਂ ਨੂੰ ਆਪਣਾ ਨਵਾਂ ਪਤਾ ਦੱਸੋ।",
        ],
        [
          "ਫ਼ੋਟੋ ਵਾਲੀ ਪਛਾਣ, ਜਿਵੇਂ ਪਾਸਪੋਰਟ, ਡਰਾਈਵਿੰਗ ਲਾਇਸੈਂਸ ਜਾਂ ਕੋਈ ਹੋਰ ਪਛਾਣ ਪੱਤਰ।",
          "ਤੁਹਾਡਾ ਨੈਸ਼ਨਲ ਇੰਸ਼ੋਰੈਂਸ ਨੰਬਰ ਅਤੇ ਬੈਂਕ ਦੇ ਵੇਰਵੇ।",
          "ਤੁਹਾਡੀ ਆਮਦਨ ਜਾਂ ਬੈਨੀਫ਼ਿਟਾਂ ਦਾ ਸਬੂਤ, ਜਿਵੇਂ ਯੂਨੀਵਰਸਲ ਕ੍ਰੈਡਿਟ ਦੀ ਸਟੇਟਮੈਂਟ।",
          "ਕੋਈ ਵੀ ਦਵਾਈਆਂ, ਨੁਸਖ਼ੇ ਅਤੇ ਤੁਹਾਡੇ ਜੀਪੀ (GP) ਦੇ ਵੇਰਵੇ।",
          "ਤੁਹਾਡਾ ਫ਼ੋਨ ਅਤੇ ਚਾਰਜਰ, ਕੱਪੜੇ ਅਤੇ ਨਿੱਜੀ ਵਰਤੋਂ ਦੀਆਂ ਚੀਜ਼ਾਂ। ਪੁੱਛ ਲਓ ਕਿ ਬਿਸਤਰਾ ਅਤੇ ਰਸੋਈ ਦਾ ਸਮਾਨ ਮਿਲਦਾ ਹੈ ਜਾਂ ਨਹੀਂ।",
        ],
        [
          "ਤੁਸੀਂ ਲਾਇਸੈਂਸ ਜਾਂ ਕਿਰਾਏਦਾਰੀ ਦੇ ਸਮਝੌਤੇ 'ਤੇ ਦਸਤਖ਼ਤ ਕਰੋਗੇ। ਇਸ ਨੂੰ ਪੜ੍ਹੋ ਅਤੇ ਜੋ ਸਮਝ ਨਾ ਆਵੇ ਉਹ ਪੁੱਛੋ।",
          "ਆਪਣੇ ਸਪੋਰਟ ਵਰਕਰ ਨੂੰ ਮਿਲੋ ਅਤੇ ਮਿਲ ਕੇ ਆਪਣੀ ਸਹਾਇਤਾ ਯੋਜਨਾ ਤੈਅ ਕਰੋ।",
          "ਜੇ ਤੁਸੀਂ ਨਵੇਂ ਇਲਾਕੇ ਵਿੱਚ ਆਏ ਹੋ, ਤਾਂ ਨੇੜਲੇ ਜੀਪੀ ਕੋਲ ਰਜਿਸਟਰ ਕਰੋ।",
          "ਯੂਨੀਵਰਸਲ ਕ੍ਰੈਡਿਟ, ਆਪਣੇ ਬੈਂਕ ਅਤੇ ਜੀਪੀ ਨੂੰ ਆਪਣਾ ਨਵਾਂ ਪਤਾ ਦਿਓ।",
          "ਪਤਾ ਕਰੋ ਕਿ ਮੁਰੰਮਤ ਦੀ ਸੂਚਨਾ ਕਿਵੇਂ ਦੇਣੀ ਹੈ ਅਤੇ ਐਮਰਜੈਂਸੀ ਵਿੱਚ ਕਿਸ ਨੂੰ ਫ਼ੋਨ ਕਰਨਾ ਹੈ।",
        ],
        [
          "ਪਹਿਲਾਂ ਆਪਣੇ ਸਪੋਰਟ ਵਰਕਰ ਜਾਂ ਪ੍ਰਦਾਤਾ ਨਾਲ ਗੱਲ ਕਰੋ।",
          "ਹਰ ਪ੍ਰਦਾਤਾ ਕੋਲ ਸ਼ਿਕਾਇਤ ਕਰਨ ਦਾ ਤਰੀਕਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ। ਇਸ ਦੀ ਇੱਕ ਕਾਪੀ ਮੰਗੋ।",
          "ਤੁਸੀਂ ਆਪਣੀ ਸਥਾਨਕ ਕੌਂਸਲ ਦੀ ਹਾਊਸਿੰਗ ਟੀਮ ਨਾਲ ਵੀ ਸੰਪਰਕ ਕਰ ਸਕਦੇ ਹੋ।",
          "ਜੇ ਤੁਸੀਂ ਖ਼ਤਰੇ ਵਿੱਚ ਹੋ, ਤਾਂ 999 'ਤੇ ਕਾਲ ਕਰੋ।",
        ],
      ],
    ),
  },
  pl: {
    heading: "Co dalej",
    intro: "Czego się spodziewać po wysłaniu prośby o pokój, krok po kroku.",
    youAreHere: "Jesteś tutaj",
    steps: steps(
      ["Po wysłaniu zgłoszenia", "Oglądanie pokoju i rozmowa o wsparciu", "Płacenie czynszu: Housing Benefit", "Dzień przeprowadzki: co zabrać", "Pierwszy tydzień", "Jeśli coś pójdzie nie tak"],
      [
        [
          "Dostawca przeczyta Twoje zgłoszenie. Większość odpowiada w ciągu kilku dni.",
          "Miej włączony telefon i sprawdzaj wiadomości w RoomsNow.",
          "Jeśli masz pracownika wsparcia, powiedz mu, że wysłałeś zgłoszenie.",
          "Jeśli nie dostaniesz odpowiedzi w ciągu tygodnia, napisz do dostawcy.",
        ],
        [
          "Dostawca może zaprosić Cię na obejrzenie pokoju.",
          "Zapyta, jakiego wsparcia potrzebujesz. To normalne i pomaga zadbać o bezpieczeństwo wszystkich.",
          "Możesz przyjść z przyjacielem, kimś z rodziny lub pracownikiem wsparcia.",
          "Zapytaj o czynsz, rachunki, zasady domu i wsparcie, które dostaniesz każdego tygodnia.",
        ],
        [
          "W mieszkaniach ze wsparciem czynsz zwykle pokrywa zasiłek mieszkaniowy (Housing Benefit) z lokalnego urzędu (council), nawet jeśli dostajesz Universal Credit.",
          "Dostawca zwykle pomoże wypełnić wniosek. Złóż go od razu, bo można go wyrównać wstecz tylko za krótki czas.",
          "Być może będziesz sam płacić niewielką kwotę tygodniowo, np. za rachunki lub jedzenie. Zapytaj, ile to jest, zanim się wprowadzisz.",
          "Universal Credit nadal pokrywa Twoje koszty życia. Podaj im swój nowy adres.",
        ],
        [
          "Dokument ze zdjęciem, np. paszport, prawo jazdy lub inny dowód tożsamości.",
          "Numer National Insurance i dane konta bankowego.",
          "Dowód dochodu lub zasiłków, np. wyciąg z Universal Credit.",
          "Leki, recepty i dane Twojego lekarza rodzinnego (GP).",
          "Telefon i ładowarkę, ubrania i kosmetyki. Zapytaj, czy pościel i rzeczy do kuchni są zapewnione.",
        ],
        [
          "Podpiszesz umowę licencji lub najmu. Przeczytaj ją i zapytaj o wszystko, czego nie rozumiesz.",
          "Poznaj swojego pracownika wsparcia i ustalcie razem plan wsparcia.",
          "Jeśli zmieniłeś okolicę, zapisz się do lekarza rodzinnego (GP) w pobliżu.",
          "Podaj nowy adres w Universal Credit, w banku i u lekarza.",
          "Dowiedz się, jak zgłaszać naprawy i do kogo dzwonić w nagłej sytuacji.",
        ],
        [
          "Najpierw porozmawiaj z pracownikiem wsparcia lub dostawcą.",
          "Każdy dostawca powinien mieć procedurę skarg. Poproś o kopię.",
          "Możesz też skontaktować się z działem mieszkaniowym lokalnego urzędu (council).",
          "Jeśli jesteś w niebezpieczeństwie, dzwoń pod 999.",
        ],
      ],
    ),
  },
  ar: {
    heading: "ماذا يحدث بعد ذلك",
    intro: "ما الذي تتوقعه بعد طلب غرفة، خطوة بخطوة.",
    youAreHere: "أنت هنا",
    steps: steps(
      ["بعد تقديم الطلب", "معاينة الغرفة والحديث عن الدعم", "دفع الإيجار: إعانة السكن (Housing Benefit)", "يوم الانتقال: ماذا تُحضر", "أسبوعك الأول", "إذا حدثت مشكلة"],
      [
        [
          "سيقرأ مقدّم السكن طلبك. يردّ معظمهم خلال أيام قليلة.",
          "أبقِ هاتفك مفتوحًا وتابع رسائلك على RoomsNow.",
          "إذا كان لديك عامل دعم، أخبره أنك قدّمت طلبًا.",
          "إذا لم يصلك رد خلال أسبوع، أرسل رسالة إلى مقدّم السكن.",
        ],
        [
          "قد يدعوك مقدّم السكن لرؤية الغرفة.",
          "سيسألك عن الدعم الذي تحتاجه. هذا أمر عادي ويساعد على الحفاظ على سلامة الجميع.",
          "يمكنك إحضار صديق أو أحد أفراد عائلتك أو عامل الدعم.",
          "اسأل عن الإيجار والفواتير وقواعد المنزل والدعم الذي ستحصل عليه كل أسبوع.",
        ],
        [
          "في السكن المدعوم، يُدفع الإيجار عادةً من إعانة السكن التي يقدّمها المجلس المحلي، حتى لو كنت تحصل على الائتمان الشامل (Universal Credit).",
          "يستطيع مقدّم السكن عادةً مساعدتك في تعبئة الطلب. قدّم الطلب فورًا، لأنه لا يمكن احتسابه بأثر رجعي إلا لمدة قصيرة.",
          "قد تحتاج إلى دفع مبلغ صغير كل أسبوع بنفسك مقابل أشياء مثل الفواتير أو الطعام. اسأل عن قيمته قبل الانتقال.",
          "يستمر الائتمان الشامل في دفع تكاليف معيشتك. أخبرهم بعنوانك الجديد.",
        ],
        [
          "هوية تحمل صورتك، مثل جواز السفر أو رخصة القيادة أو أي وثيقة هوية أخرى.",
          "رقم التأمين الوطني (National Insurance) وتفاصيل حسابك المصرفي.",
          "إثبات دخلك أو إعاناتك، مثل كشف حساب الائتمان الشامل.",
          "أي أدوية ووصفات طبية وبيانات طبيبك العام (GP).",
          "هاتفك وشاحنه، وملابسك وأغراضك الشخصية. اسأل إن كانت أغطية السرير وأدوات المطبخ متوفرة.",
        ],
        [
          "ستوقّع عقد ترخيص أو عقد إيجار. اقرأه واسأل عن أي شيء لا تفهمه.",
          "قابل عامل الدعم واتفقا معًا على خطة الدعم الخاصة بك.",
          "إذا انتقلت إلى منطقة جديدة، سجّل لدى طبيب عام (GP) قريب منك.",
          "أعطِ عنوانك الجديد للائتمان الشامل ولمصرفك ولطبيبك.",
          "اعرف كيف تبلّغ عن الأعطال ومن تتصل به في حالات الطوارئ.",
        ],
        [
          "تحدّث أولًا مع عامل الدعم أو مقدّم السكن.",
          "يجب أن يكون لدى كل مقدّم سكن إجراء للشكاوى. اطلب نسخة منه.",
          "يمكنك أيضًا التواصل مع فريق الإسكان في مجلسك المحلي.",
          "إذا كنت في خطر، اتصل بالرقم 999.",
        ],
      ],
    ),
  },
  ro: {
    heading: "Ce urmează",
    intro: "Ce să vă așteptați după ce cereți o cameră, pas cu pas.",
    youAreHere: "Sunteți aici",
    steps: steps(
      ["După ce aplicați", "Vizionarea și o discuție despre sprijin", "Plata chiriei: Housing Benefit", "Ziua mutării: ce să aduceți", "Prima săptămână", "Dacă ceva nu merge bine"],
      [
        [
          "Furnizorul vă citește cererea. Majoritatea răspund în câteva zile.",
          "Țineți telefonul pornit și verificați mesajele de pe RoomsNow.",
          "Dacă aveți un asistent social, spuneți-i că ați aplicat.",
          "Dacă nu primiți răspuns într-o săptămână, trimiteți un mesaj furnizorului.",
        ],
        [
          "Furnizorul vă poate invita să vedeți camera.",
          "Vă va întreba de ce sprijin aveți nevoie. Este normal și îl ajută să îi țină pe toți în siguranță.",
          "Puteți veni cu un prieten, cu cineva din familie sau cu asistentul social.",
          "Întrebați despre chirie, facturi, regulile casei și sprijinul pe care îl veți primi în fiecare săptămână.",
        ],
        [
          "În locuințele cu sprijin, chiria este de obicei plătită din Housing Benefit (ajutorul pentru locuință) de la consiliul local, chiar dacă primiți Universal Credit.",
          "De obicei, furnizorul vă poate ajuta să completați cererea. Depuneți-o imediat, pentru că poate fi acordată retroactiv doar pentru o perioadă scurtă.",
          "Este posibil să plătiți singur(ă) o sumă mică pe săptămână, pentru lucruri precum facturile sau mâncarea. Întrebați cât este înainte să vă mutați.",
          "Universal Credit vă plătește în continuare costurile de trai. Anunțați-i noua adresă.",
        ],
        [
          "Un act de identitate cu fotografie, cum ar fi pașaportul, permisul de conducere sau alt act.",
          "Numărul de National Insurance și datele contului bancar.",
          "Dovada veniturilor sau a ajutoarelor, cum ar fi un extras Universal Credit.",
          "Medicamentele, rețetele și datele medicului de familie (GP).",
          "Telefonul și încărcătorul, haine și articole de toaletă. Întrebați dacă se oferă lenjerie de pat și ustensile de bucătărie.",
        ],
        [
          "Veți semna un contract de licență sau de închiriere. Citiți-l și întrebați despre orice nu înțelegeți.",
          "Cunoașteți-vă asistentul social și stabiliți împreună planul de sprijin.",
          "Dacă v-ați mutat în altă zonă, înscrieți-vă la un medic de familie (GP) din apropiere.",
          "Comunicați noua adresă la Universal Credit, la bancă și la medic.",
          "Aflați cum să raportați reparațiile și pe cine să sunați în caz de urgență.",
        ],
        [
          "Vorbiți mai întâi cu asistentul social sau cu furnizorul.",
          "Fiecare furnizor ar trebui să aibă o procedură de reclamații. Cereți o copie.",
          "Puteți contacta și echipa de locuințe a consiliului local.",
          "Dacă sunteți în pericol, sunați la 999.",
        ],
      ],
    ),
  },
};

export { SUMMARY_LANGUAGES };
