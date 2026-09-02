// أسلوب «مسرح الاختيارات» بعد التحويل: مسرح مسابقات عربي، أسئلة كبيرة وبطاقات إجابة سريعة وواضحة.

import React, { useEffect, useMemo, useState, type ComponentType } from "react";
import { Calculator, ChevronLeft, CircleEqual, Clock3, Coins, Divide, Flame, Globe2, Hash, Heart, History, Home, Landmark, Lightbulb, LogIn, Medal, Percent, Play, Ruler, Sigma, Sparkles, Star, Trophy, UserRound, Volume2, Waves, X } from "lucide-react";
import { QUESTION_BANK_SIZE, QUIZ_CATEGORIES, type QuizDifficulty, type QuizQuestion } from "@/game/questionBank";
import { collectCoinsFromRewardedAd, defaultQuizProgress, getDailyCategory, getDailyQuestions, getHintEliminatedOptionIndexes, getUtcDateKey, loadQuizProgress, optionLetter, pickQuestion, purchaseAid, saveQuizProgress, type QuizProgress } from "@/game/quizLogic";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { getLastBannerDiagnostic, getLastRewardedDiagnostic, hideResultBanner, requestRewardedHint, showResultBanner, watchRewardedForCoins, type RewardedHintResult } from "@/mobile/admob";
import { getRewardedHintMessage } from "@/mobile/adMessages";

type Screen = "home" | "categories" | "play" | "answer" | "summary" | "profile";
type RoundMode = "standard" | "daily";
type CategoryVisual = { Icon: ComponentType<{ size?: number; strokeWidth?: number }>; description: string; color: string; short: string };

const logoImage = "/manus-storage/ehreb-mask-retry_8bc71fa9.png";
const backdropImage = "/manus-storage/ehreb-stage-retry_b54f912a.png";
const hostAudio = {
  correct: "/manus-storage/quiz-correct-host_1c8c4f00.wav",
  wrong: "/manus-storage/quiz-wrong-host_294c0e09.wav",
  daily: "/manus-storage/quiz-daily-host_56a08a9a.wav",
};
const SESSION_LENGTH = 10;
const QUESTION_TIME_LIMIT = 25;

const categoryVisuals: Record<string, CategoryVisual> = {
  "جمع سريع": { Icon: Calculator, description: "فكّر بسرعة قبل ما العداد يسبقك", color: "gold", short: "+" },
  "طرح ذكي": { Icon: CircleEqual, description: "فرق بسيط، وإجابة دقيقة", color: "coral", short: "−" },
  "ضرب": { Icon: X, description: "عمليات أقوى ونقاط أعلى", color: "mint", short: "×" },
  "قسمة": { Icon: Divide, description: "اقسمها صح وخد النجمة", color: "violet", short: "÷" },
  "نسب مئوية": { Icon: Percent, description: "خصومات ونسب بلمسة ذكية", color: "gold", short: "%" },
  "كسور": { Icon: Hash, description: "البسط والمقام في صفك", color: "coral", short: "½" },
  "متتاليات": { Icon: Sigma, description: "اكتشف الرقم اللي جاي", color: "mint", short: "…" },
  "مقارنات": { Icon: Trophy, description: "اختار الأكبر في ثواني", color: "violet", short: "؟" },
  "زمن": { Icon: Clock3, description: "حوّل الوقت لنقاط", color: "gold", short: "ث" },
  "قياس": { Icon: Ruler, description: "وحدات بسيطة وإجابات دقيقة", color: "coral", short: "cm" },
  "مدن ودول": { Icon: Landmark, description: "مدن وأعلام ودول من العالم", color: "mint", short: "◉" },
  "جغرافيا وقارات": { Icon: Globe2, description: "اعرف مكانك على الخريطة", color: "gold", short: "◎" },
  "رياضة عالمية": { Icon: Medal, description: "بطولات وأبطال ورياضات", color: "coral", short: "★" },
  "ظواهر ومعالم طبيعية": { Icon: Waves, description: "جبال وأنهار وعجائب طبيعية", color: "violet", short: "≈" },
  "تاريخ وشخصيات": { Icon: History, description: "أشخاص وأحداث من الماضي", color: "mint", short: "⌛" },
};

const levelCopy: Record<QuizDifficulty, { label: string; helper: string; accent: string }> = {
  "سهل": { label: "سهل", helper: "بداية سريعة ومضمونة", accent: "mint" },
  "متوسط": { label: "متوسط", helper: "محتاج تركيز خفيف", accent: "gold" },
  "صعب": { label: "صعب", helper: "نقاط أكثر وتحدي أعلى", accent: "coral" },
};

export default function GameShell() {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  const [screen, setScreen] = useState<Screen>(requestedView === "categories" || requestedView === "profile" || requestedView === "play" ? requestedView : "home");
  const [progress, setProgress] = useState<QuizProgress>(() => loadQuizProgress());
  const [category, setCategory] = useState(QUIZ_CATEGORIES[0]);
  const [level, setLevel] = useState<QuizDifficulty>("متوسط");
  const [question, setQuestion] = useState<QuizQuestion | null>(() => requestedView === "play" ? pickQuestion(QUIZ_CATEGORIES[0], "متوسط", []) : null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
  const [hintStatus, setHintStatus] = useState<"ready" | "loading" | "used" | "not-native" | RewardedHintResult>("ready");
  const [coinMessage, setCoinMessage] = useState<string | null>(null);
  const [coinAdStatus, setCoinAdStatus] = useState<"ready" | "loading" | RewardedHintResult>("ready");
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [roundMode, setRoundMode] = useState<RoundMode>("standard");
  const [dailyQuestions, setDailyQuestions] = useState<QuizQuestion[]>([]);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [today] = useState(() => getUtcDateKey());
  const leaderboard = trpc.quiz.leaderboard.useQuery({ dateKey: today }, { staleTime: 30_000 });
  const saveRound = trpc.quiz.saveRound.useMutation();
  const saveDaily = trpc.quiz.saveDaily.useMutation();

  const visual = categoryVisuals[category] ?? categoryVisuals[QUIZ_CATEGORIES[0]];
  const remaining = useMemo(() => Math.max(0, QUESTION_BANK_SIZE - progress.seenIds.length), [progress.seenIds.length]);

  useEffect(() => saveQuizProgress(progress), [progress]);

  useEffect(() => {
    if (screen === "summary") {
      void showResultBanner().then((result) => {
        const diagnostic = getLastBannerDiagnostic();
        setBannerMessage(result === "ready" ? null : diagnostic ? `مصدر فشل البانر: ${diagnostic.provider} (${diagnostic.code})` : `تعذر عرض البانر: ${result}`);
      });
      return;
    }
    void hideResultBanner();
  }, [screen]);

  useEffect(() => {
    if (screen !== "play" || answeredIndex !== null) return;
    if (timeLeft <= 0) {
      answerQuestion(-1);
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [screen, timeLeft, answeredIndex, question]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (screen !== "play" || answeredIndex !== null || !question) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 4) answerQuestion(index);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, answeredIndex, question, timeLeft]);

  function playSound(kind: keyof typeof hostAudio) {
    if (!soundOn) return;
    const clip = new Audio(hostAudio[kind]);
    clip.volume = kind === "daily" ? 0.45 : 0.55;
    clip.play().catch(() => undefined);
    try {
      const AudioContextClass = window.AudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = kind === "correct" ? "triangle" : "sine";
      oscillator.frequency.value = kind === "correct" ? 740 : kind === "wrong" ? 185 : 523;
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch {
      // يظل صوت المذيع متاحًا حتى إن لم يدعم المتصفح المؤثر القصير.
    }
  }

  function startRound(nextCategory = category, nextLevel = level) {
    const initialQuestion = pickQuestion(nextCategory, nextLevel, progress.seenIds);
    setCategory(nextCategory);
    setLevel(nextLevel);
    setQuestion(initialQuestion);
    setQuestionNumber(1);
    setScore(0);
    setCorrectAnswers(0);
    setSyncMessage(null);
    setStreak(0);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setAnsweredIndex(null);
    setRoundMode("standard");
    setDailyQuestions([]);
    setHintStatus("ready");
    setCoinMessage(null);
    setEliminatedOptions([]);
    setScreen("play");
  }

  function startDailyRound() {
    const nextCategory = getDailyCategory(today);
    const questions = getDailyQuestions(today, nextCategory, "متوسط");
    if (!questions.length) return;
    setCategory(nextCategory);
    setLevel("متوسط");
    setQuestion(questions[0]);
    setDailyQuestions(questions);
    setQuestionNumber(1);
    setScore(0);
    setCorrectAnswers(0);
    setSyncMessage(null);
    setStreak(0);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setAnsweredIndex(null);
    setRoundMode("daily");
    setHintStatus("ready");
    setCoinMessage(null);
    setEliminatedOptions([]);
    setScreen("play");
    playSound("daily");
  }

  function answerQuestion(index: number) {
    if (!question || answeredIndex !== null || eliminatedOptions.includes(index)) return;
    const isCorrect = index === question.correctIndex;
    const earned = isCorrect ? 100 + timeLeft * 10 + Math.min(streak * 10, 100) : 0;
    const nextStreak = isCorrect ? streak + 1 : 0;
    playSound(isCorrect ? "correct" : "wrong");
    setAnsweredIndex(index);
    setScore((current) => current + earned);
    if (isCorrect) setCorrectAnswers((current) => current + 1);
    setStreak(nextStreak);
    setProgress((current) => ({
      ...current,
      coins: current.coins + (index === -1 ? 0 : 1),
      totalPoints: current.totalPoints + earned,
      totalCorrect: current.totalCorrect + (isCorrect ? 1 : 0),
      bestStreak: Math.max(current.bestStreak, nextStreak),
      seenIds: current.seenIds.includes(question.id) ? current.seenIds : [...current.seenIds, question.id],
    }));
    setScreen("answer");
  }

  async function useRewardedHint() {
    if (!question || answeredIndex !== null || hintStatus === "loading" || eliminatedOptions.length) return;
    setHintStatus("loading");
    const result = await requestRewardedHint();
    if (result === "rewarded") {
      setEliminatedOptions(getHintEliminatedOptionIndexes(question));
      setHintStatus("used");
      return;
    }
    setHintStatus(result);
  }

  async function watchCoinsAd() {
    if (coinAdStatus === "loading") return;
    setCoinAdStatus("loading");
    const result = await watchRewardedForCoins();
    if (result === "rewarded") {
      const outcome = await collectCoinsFromRewardedAd(progress.coins, async () => result);
      setProgress((current) => ({ ...current, coins: outcome.coins }));
      setCoinMessage("اتضافت 25 عملة بعد اكتمال الفيديو. تقدر تشاهد فيديو تاني لجمع المزيد.");
      setCoinAdStatus("ready");
      return;
    }
    setCoinAdStatus(result);
    setCoinMessage(getRewardedHintMessage(result));
  }

  function useCoinElimination() {
    if (!question || answeredIndex !== null || eliminatedOptions.length) return;
    const remainingCoins = purchaseAid(progress.coins, 60);
    if (remainingCoins === null) {
      setCoinMessage("رصيدك مش كفاية؛ شاهد فيديوهات الإعلانات عشان تجمع عملات.");
      return;
    }
    setProgress((current) => ({ ...current, coins: purchaseAid(current.coins, 60) ?? current.coins }));
    setEliminatedOptions(getHintEliminatedOptionIndexes(question));
    setHintStatus("used");
    setCoinMessage("اتخصم 60 عملة واتشالت إجابتين غلط.");
  }

  function buyExtraTime() {
    if (!question || answeredIndex !== null) return;
    const remainingCoins = purchaseAid(progress.coins, 40);
    if (remainingCoins === null) {
      setCoinMessage("رصيدك مش كفاية؛ شاهد فيديوهات الإعلانات عشان تجمع عملات.");
      return;
    }
    setProgress((current) => ({ ...current, coins: purchaseAid(current.coins, 40) ?? current.coins }));
    setTimeLeft((current) => Math.min(45, current + 10));
    setCoinMessage("اتخصم 40 عملة واتضافت 10 ثواني.");
  }

  function nextQuestion() {
    if (questionNumber >= SESSION_LENGTH) {
      const awardDailyBonus = roundMode === "daily" && progress.lastDailyReward !== today;
      const bonus = awardDailyBonus ? 250 : 0;
      setProgress((current) => ({ ...current, completedRounds: current.completedRounds + 1, totalPoints: current.totalPoints + bonus, lastDailyReward: awardDailyBonus ? today : current.lastDailyReward }));
      const payload = { points: score, correctCount: correctAnswers, questionCount: 10 as const, category };
      if (isAuthenticated) {
        const onSuccess = () => { setSyncMessage(`${awardDailyBonus ? "مكافأة اليوم +250 نقطة. " : ""}اتحفظت نتيجتك في ترتيب اللاعبين.`); leaderboard.refetch(); };
        const onError = () => setSyncMessage("تعذر حفظ النتيجة الآن؛ جرّب مرة أخرى بعد تسجيل الدخول.");
        if (roundMode === "daily") saveDaily.mutate({ ...payload, dateKey: today }, { onSuccess, onError });
        else saveRound.mutate(payload, { onSuccess, onError });
      } else {
        setSyncMessage(`${awardDailyBonus ? "مكافأة أول تحدي اليوم +250 نقطة. " : ""}سجّل دخولك حتى تظهر نتيجتك في ترتيب اللاعبين.`);
      }
      setScreen("summary");
      return;
    }
    const next = roundMode === "daily" ? dailyQuestions[questionNumber] : pickQuestion(category, level, progress.seenIds);
    setQuestion(next);
    setQuestionNumber((current) => current + 1);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setAnsweredIndex(null);
    setHintStatus("ready");
    setCoinMessage(null);
    setEliminatedOptions([]);
    setScreen("play");
  }

  return (
    <main className={`game-ui quiz-ui quiz-${screen}`} dir="rtl">
      <header className="game-header quiz-header">
        <button className="brand-mark" type="button" onClick={() => setScreen("home")} aria-label="العودة للرئيسية">
          <img src={logoImage} alt="قناع لعبة تحدي الأسئلة" />
          <span><b>فكّر</b><em>بسرعة</em></span>
        </button>
        <div className="header-actions">
          <div className="stat-chip points"><Star size={16} fill="currentColor" /><strong>{progress.totalPoints.toLocaleString("ar-EG")}</strong><span>نقطة</span></div>
          <div className="stat-chip coins"><Coins size={16} /><strong>{progress.coins.toLocaleString("ar-EG")}</strong><span>عملة</span></div>
          <div className="stat-chip hearts"><Heart size={16} fill="currentColor" /><strong>{progress.bestStreak}</strong></div>
          {!authLoading && !isAuthenticated && <button className="login-chip" type="button" onClick={startLogin}><LogIn size={15} /> ادخل للترتيب</button>}
          {isAuthenticated && <span className="login-chip signed"><UserRound size={15} /> {user?.name ?? "لاعب"}</span>}
          <button type="button" className={`icon-button ${soundOn ? "is-on" : ""}`} onClick={() => setSoundOn((value) => !value)} aria-label="تبديل الصوت"><Volume2 size={18} /></button>
        </div>
      </header>
      {screen === "summary" && syncMessage && <p className="sync-banner">{syncMessage}</p>}
      {screen === "summary" && bannerMessage && <p className="sync-banner banner-diagnostic">{bannerMessage}</p>}

      {screen === "home" && <QuizHome onStart={() => setScreen("categories")} onDaily={startDailyRound} onProfile={() => setScreen("profile")} progress={progress} remaining={remaining} dailyCategory={getDailyCategory(today)} leaderboard={leaderboard.data ?? []} />}
      {screen === "categories" && <CategoryScreen category={category} level={level} onPickCategory={setCategory} onPickLevel={setLevel} onStart={() => startRound()} onBack={() => setScreen("home")} />}
      {(screen === "play" || screen === "answer") && question && <QuestionScreen question={question} questionNumber={questionNumber} level={level} timeLeft={timeLeft} streak={streak} answeredIndex={answeredIndex} eliminatedOptions={eliminatedOptions} hintStatus={hintStatus} coins={progress.coins} coinMessage={coinMessage} coinAdStatus={coinAdStatus} onWatchCoins={watchCoinsAd} onAnswer={answerQuestion} onHint={useRewardedHint} onCoinEliminate={useCoinElimination} onBuyTime={buyExtraTime} onNext={nextQuestion} mode={roundMode} />}
      {screen === "summary" && <SummaryScreen score={score} progress={progress} category={category} onReplay={() => startRound()} onCategories={() => setScreen("categories")} />}
      {screen === "profile" && <ProfileScreen progress={progress} remaining={remaining} onBack={() => setScreen("home")} />}
    </main>
  );
}

function QuizHome({ onStart, onDaily, onProfile, progress, remaining, dailyCategory, leaderboard }: { onStart: () => void; onDaily: () => void; onProfile: () => void; progress: QuizProgress; remaining: number; dailyCategory: string; leaderboard: { name: string | null; points: number; correctCount: number }[] }) {
  return <section className="quiz-home">
    <div className="quiz-home-art" style={{ backgroundImage: `url('${backdropImage}')` }} />
    <div className="quiz-home-curtain" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <div className="quiz-home-copy">
      <div className="quiz-eyebrow"><Sparkles size={14} /> بنك أسئلة لا يخلص</div>
      <h1>سؤال واحد<br /><span>يفرق معاك.</span></h1>
      <p>مسابقة عربية فيها <b>50,000 سؤال</b> عن الحساب والدول والجغرافيا والتاريخ والرياضة والطبيعة. اختار فئتك، واضرب الإجابة قبل ما الوقت يخلص.</p>
      <div className="quiz-cta-row"><button className="primary-button" type="button" onClick={onStart}>ابدأ الجولة <Play size={18} fill="currentColor" /></button><button className="ghost-button" type="button" onClick={onDaily}><Sparkles size={18} /> تحدّي اليوم</button><button className="ghost-button" type="button" onClick={onProfile}><Trophy size={18} /> كواليسك</button></div>
      <div className="quiz-home-stats"><span><b>{QUESTION_BANK_SIZE.toLocaleString("ar-EG")}</b> سؤال موثق</span><i /><span><b>{QUIZ_CATEGORIES.length}</b> فئات للعب</span><i /><span><b>{remaining.toLocaleString("ar-EG")}</b> سؤال لسه</span></div>
    </div>
    <aside className="quiz-scoreboard"><span>تحدّي اليوم</span><b>{dailyCategory}</b><small>نفس 10 أسئلة لكل اللاعبين</small><button type="button" onClick={onDaily}>ادخل التحدي <ChevronLeft size={14} /></button></aside>
    <aside className="leaderboard-card"><div><span>ترتيب اليوم</span><Trophy size={16} /></div>{leaderboard.length ? leaderboard.slice(0, 3).map((player, index) => <p key={`${player.name}-${index}`}><b>{index + 1}</b><span>{player.name ?? "لاعب"}</span><em>{player.points}</em></p>) : <small>كن أول لاعب يسجل نتيجة اليوم.</small>}</aside>
  </section>;
}

function CategoryScreen({ category, level, onPickCategory, onPickLevel, onStart, onBack }: { category: string; level: QuizDifficulty; onPickCategory: (category: string) => void; onPickLevel: (difficulty: QuizDifficulty) => void; onStart: () => void; onBack: () => void }) {
  return <section className="categories-screen">
    <div className="category-spotlights" aria-hidden="true"><i /><i /></div>
    <div className="categories-heading"><button className="back-text" type="button" onClick={onBack}><ChevronLeft size={18} /> الستارة الرئيسية</button><div><span>اختيار الجولة</span><h2>إيه النوع اللي دماغك جاهزة له؟</h2></div><div className="question-count-badge"><b>50K</b><span>سؤال جاهز</span></div></div>
    <div className="category-grid">{QUIZ_CATEGORIES.map((item) => { const meta = categoryVisuals[item]; return <button key={item} type="button" onClick={() => onPickCategory(item)} className={`category-card color-${meta.color} ${category === item ? "selected" : ""}`}><span className="category-ticket">فقرة اليوم</span><span className="category-icon"><meta.Icon size={25} strokeWidth={2.2} /></span><span className="category-text"><b>{item}</b><small>{meta.description}</small></span><span className="category-symbol">{meta.short}</span><i className="category-rivet" /></button>; })}</div>
    <div className="level-selector"><div><span>مستوى الصعوبة</span><b>كل إجابة صح بتزود فرصتك في النجوم</b></div><div className="level-tabs">{(Object.keys(levelCopy) as QuizDifficulty[]).map((item) => <button key={item} type="button" onClick={() => onPickLevel(item)} className={`level-tab ${level === item ? `active-${levelCopy[item].accent}` : ""}`}><b>{levelCopy[item].label}</b><small>{levelCopy[item].helper}</small></button>)}</div><button className="primary-button quiz-start" type="button" onClick={onStart}>افتح الجولة <Play size={18} fill="currentColor" /></button></div>
  </section>;
}

export function QuestionScreen({ question, questionNumber, level, timeLeft, streak, answeredIndex, eliminatedOptions, hintStatus, coins, coinMessage, coinAdStatus, onWatchCoins, onAnswer, onHint, onCoinEliminate, onBuyTime, onNext, mode }: { question: QuizQuestion; questionNumber: number; level: QuizDifficulty; timeLeft: number; streak: number; answeredIndex: number | null; eliminatedOptions: number[]; hintStatus: "ready" | "loading" | "used" | "not-native" | RewardedHintResult; coins: number; coinMessage: string | null; coinAdStatus: "ready" | "loading" | RewardedHintResult; onWatchCoins: () => void; onAnswer: (index: number) => void; onHint: () => void; onCoinEliminate: () => void; onBuyTime: () => void; onNext: () => void; mode: RoundMode }) {
  const isAnswered = answeredIndex !== null;
  const correct = answeredIndex === question.correctIndex;
  const visual = categoryVisuals[question.category];
  const hintMessage = getRewardedHintMessage(hintStatus);
  const rewardedDiagnostic = getLastRewardedDiagnostic();
  const diagnosticMessage = rewardedDiagnostic ? `المصدر: ${rewardedDiagnostic.provider} (${rewardedDiagnostic.code})` : null;
  return <section className="question-screen">
    <div className="round-progress"><span>الجولة {questionNumber} من {SESSION_LENGTH}</span><i><em style={{ width: `${(questionNumber / SESSION_LENGTH) * 100}%` }} /></i><span className="streak-count"><Flame size={15} fill="currentColor" /> {streak}</span></div>
    <div className="question-stage">
      <div className="question-ribbon"><span>{mode === "daily" ? "تحدّي اليوم" : question.category}</span><b>{level}</b></div>
      <div className={`time-wheel ${timeLeft <= 5 ? "urgent" : ""}`}><Clock3 size={18} /><b>{String(timeLeft).padStart(2, "0")}</b><small>ثانية</small></div>
      <div className={`question-symbol color-${visual.color}`}><visual.Icon size={42} strokeWidth={1.8} /></div>
      <div className="host-note"><img src={logoImage} alt="" /><span>المذيع بيقول</span><b>{timeLeft > 8 ? "الجواب الأول غالبًا صح… بس فكّر!" : "خمس ثواني وهنقفل الستارة!"}</b></div>
      <span className="question-kicker">خلّي تفكيرك أسرع من العداد</span>
      <h2>{question.question}</h2>
      <div className="answer-grid">{question.options.map((option, index) => { const hidden = eliminatedOptions.includes(index); const state = isAnswered ? (index === question.correctIndex ? "correct" : index === answeredIndex ? "wrong" : "muted") : hidden ? "hint-hidden" : ""; return <button className={`answer-card ${state}`} disabled={isAnswered || hidden} type="button" key={`${question.id}-${index}`} onClick={() => onAnswer(index)}><span>{optionLetter(index)}</span><b>{hidden ? "تم استبعادها" : option}</b>{isAnswered && index === question.correctIndex && <Star size={18} fill="currentColor" />}</button>; })}</div>
      {!isAnswered && <div className="rewarded-hint"><div className="coin-balance"><Coins size={15} /> رصيدك: <b>{coins}</b> عملة</div><button className="watch-coins-button" type="button" onClick={onWatchCoins} disabled={coinAdStatus === "loading"}><Play size={15} /> {coinAdStatus === "loading" ? "بيجهّز الفيديو..." : "شاهد فيديو واكسب 25 عملة"}</button><div className="hint-actions"><button className="reward-hint-button" type="button" onClick={onHint} disabled={hintStatus === "loading" || hintStatus === "used"}><Lightbulb size={17} /> {hintStatus === "loading" ? "بيجهّز الإعلان..." : hintStatus === "used" ? "اتشال اختيارين غلط" : "شاهد إعلان وخد تلميح"}</button><button className="coin-hint-button" type="button" onClick={onCoinEliminate} disabled={hintStatus === "used"}><Coins size={16} /> حذف إجابتين <b>60</b></button><button className="coin-hint-button" type="button" onClick={onBuyTime} disabled={timeLeft >= 45}><Clock3 size={16} /> +10 ثواني <b>40</b></button></div>{hintMessage && <small>{hintMessage}</small>}{diagnosticMessage && hintStatus !== "ready" && <small className="coin-message">{diagnosticMessage}</small>}{coinMessage && <small className="coin-message">{coinMessage}</small>}</div>}
      {isAnswered && <div className={`answer-feedback ${correct ? "good" : "bad"}`}><div>{correct ? <Sparkles size={24} /> : <Lightbulb size={24} />}</div><p><b>{correct ? "إجابة صح!" : answeredIndex === -1 ? "الوقت خلص!" : "الإجابة دي مش صح."}</b><span>{correct ? `+${100 + timeLeft * 10 + Math.min(streak * 10, 100)} نقطة للجولة` : `الإجابة الصحيحة: ${question.options[question.correctIndex]}`}</span></p><button className="primary-button" type="button" onClick={onNext}>{questionNumber === SESSION_LENGTH ? "شوف النتيجة" : "السؤال اللي بعده"} <ChevronLeft size={18} /></button></div>}
    </div>
    <div className="quiz-tip"><span>نصيحة المسرح</span><b>تقدر تختار من الكيبورد: 1، 2، 3، 4</b></div>
  </section>;
}

function SummaryScreen({ score, progress, category, onReplay, onCategories }: { score: number; progress: QuizProgress; category: string; onReplay: () => void; onCategories: () => void }) {
  const title = score >= 1800 ? "مخك حاضر بقوة" : score >= 900 ? "جولة محترمة" : "الجولة الجاية أحسن";
  return <section className="quiz-summary"><div className="summary-card"><div className="summary-ticket"><span>تذكرة النتيجة</span><span>{category}</span></div><div className="summary-star"><Star size={38} fill="currentColor" /></div><span className="summary-kicker">خلصت عشر أسئلة</span><h2>{title}</h2><p>جمعت في الجولة دي</p><strong>{score.toLocaleString("ar-EG")}</strong><small>نقطة</small><div className="summary-details"><div><b>{progress.totalCorrect.toLocaleString("ar-EG")}</b><span>إجابة صحيحة</span></div><div><b>{progress.bestStreak}</b><span>أفضل سلسلة</span></div><div><b>{progress.completedRounds.toLocaleString("ar-EG")}</b><span>جولات مكتملة</span></div></div><div className="summary-actions"><button className="ghost-button" type="button" onClick={onCategories}>اختار فئة تانية</button><button className="primary-button" type="button" onClick={onReplay}>جولة تانية <Play size={18} fill="currentColor" /></button></div></div></section>;
}

function ProfileScreen({ progress, remaining, onBack }: { progress: QuizProgress; remaining: number; onBack: () => void }) {
  const playedPercent = Math.min(100, (progress.seenIds.length / QUESTION_BANK_SIZE) * 100);
  return <section className="quiz-profile"><div className="profile-paper"><button className="back-text" type="button" onClick={onBack}><ChevronLeft size={18} /> رجوع للمسرح</button><div className="profile-title"><img src={logoImage} alt="" /><div><span>دفتر لاعب الأسئلة</span><h2>أنت قدام بنك ضخم</h2></div></div><div className="profile-grid"><div><b>{progress.seenIds.length.toLocaleString("ar-EG")}</b><span>سؤال قابلته</span></div><div><b>{progress.totalCorrect.toLocaleString("ar-EG")}</b><span>إجابة صح</span></div><div><b>{progress.bestStreak}</b><span>سلسلة قياسية</span></div><div><b>{progress.completedRounds.toLocaleString("ar-EG")}</b><span>جولاتك</span></div></div><div className="bank-meter"><div><span>استكشاف بنك الأسئلة</span><b>{remaining.toLocaleString("ar-EG")} باقي</b></div><i><em style={{ width: `${playedPercent}%` }} /></i><small>الأسئلة لا تتكرر معاك قبل ما تستنفد فئة الصعوبة المختارة.</small></div><button className="primary-button wide" type="button" onClick={onBack}><Home size={18} /> ارجع اختار جولة</button></div></section>;
}
