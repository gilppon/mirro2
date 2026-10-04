// ─────────────────────────────────────────────────────────────
//  i18n — 한국어 / English / 日本語
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'ko' | 'en' | 'ja';

export const LANGS: { id: Lang; label: string; native: string; flag: string }[] = [
  { id: 'ko', label: 'KOREAN', native: '한국어', flag: '🇰🇷' },
  { id: 'en', label: 'ENGLISH', native: 'English', flag: '🇺🇸' },
  { id: 'ja', label: '日本語', native: '日本語', flag: '🇯🇵' },
];

type Dict = Record<string, string>;

const KO: Dict = {
  // ── 공통
  'app.sub': 'AI 습관 분석 격투 · SELF-MIRROR FIGHTING',
  'app.pressAnyKey': '아무 키나 누르세요',
  'app.insertCoin': 'INSERT COIN · 1 CREDIT',
  'app.ver': 'VER 1.0 · MIRROR NEURAL BRAWLER',
  'app.copyright': '© 2026 SELF-MIRROR FIGHTING SYSTEM',
  'app.select': '선택',
  'app.decide': '결정',
  'app.close': '닫기',
  'app.locked': 'LOCKED',
  'app.pressEnter': 'PRESS ENTER',
  'app.start': '시작',
  'app.quit': '종료',
  'app.sound': '소리',

  // ── 메뉴
  'menu.training': '자유 훈련',
  'menu.dungeon': '습관 봉인 5층',
  'menu.mirror': '나 vs 내 AI',
  'menu.league': 'AI vs AI 리그',
  'menu.lab': 'DNA 분석 · 리플레이',
  'menu.store': '코스메틱 · 확장',
  'menu.training.d': '당신의 모든 입력이 기록됩니다. 싸울수록 SIMULA가 당신을 닮아갑니다.',
  'menu.dungeon.d': '층마다 하나의 습관을 봉인합니다. 5층에서는 SIMULA가 당신의 최악의 습관만으로 싸웁니다.',
  'menu.mirror.d': '내 전투 DNA를 복제한 AI와 직접 겨룹니다. 이기지 못한다면 그 약점은 이미 당신 안에 있습니다.',
  'menu.league.d': '내 AI를 리그에 출전시킵니다. 접속하지 않아도 다른 유저의 AI와 싸웁니다.',
  'menu.lab.d': 'Combat DNA 프로필, SIMULA의 분석, 습관 교정 훈련, 리플레이 비교를 확인합니다.',
  'menu.store.d': 'AI 스킨, HUD 테마, 시즌 패스, 분석 도구. 전투 성능에 영향을 주는 상품은 없습니다.',
  'menu.locked.ai': 'LOCKED — AI 파이터를 먼저 생성해야 합니다 (TRAINING 에서 데이터 수집)',

  // ── HUD
  'hud.you': '당신',
  'hud.round': '라운드',
  'hud.noise': '노이즈',
  'hud.absorb': '흡수율',
  'hud.async': '관전 중 — 당신의 AI가 스스로 싸웁니다',
  'hud.burst.ready': '노이즈 버스트 READY',
  'hud.super.ready': '초필살기 READY',
  'hud.desync': 'SIMULA DESYNC — 반격 기회',
  'hud.mirroring': 'MIRRORING −0.01s',
  'hud.read': '읽힘',
  'hud.escape': '벗어남',
  'hud.combo': '콤보',
  'hud.simula.combo': '시뮬라 콤보',
  'hud.best': '최고',
  'hud.dungeon': '던전',
  'hud.habit': '습관 교정',
  'hud.training': '훈련',
  'hud.readStreak': '연속 {n}회 읽힘 — 패턴을 바꾸세요',
  'hud.habitWarn': '습관 감지 — {a} {p}%',
  'hud.predict': '예측',
  'hud.next': '다음',

  // ── READ 연출
  'read.read': '예측됨.',
  'read.again': '이번에도 {a}.',
  'read.youAgain': '당신은 또 {a}했습니다.',
  'read.againN': '또 {a}입니다. {n}번째.',
  'read.punished': '{a}은(는) 이미 읽혔습니다.',
  'read.unreadable': '예측을 벗어났습니다.',
  'read.predictFail': 'SIMULA의 {a} 예측이 빗나갔습니다',
  'read.confPrefix': '예측 신뢰도 {p}% — 발생 전에 대응됨',
  'read.habitReturn': '습관이 그대로 반격으로 돌아왔습니다',

  // ── 진화 단계
  'stage.observer': '관찰자',
  'stage.mimic': '모방자',
  'stage.predictor': '예측자',
  'stage.punisher': '처벌자',
  'stage.replica': '복제자',
  'stage.betrayer': '배신자',
  'stage.observer.q': '기록을 시작합니다.',
  'stage.mimic.q': '당신의 손버릇을 따라 해 보겠습니다.',
  'stage.predictor.q': '다음에 무엇을 누를지 보입니다.',
  'stage.punisher.q': '같은 길로 두 번 오지 마십시오.',
  'stage.replica.q': '이제 우리는 같은 방식으로 싸웁니다.',
  'stage.betrayer.q': 'SIMULA는 이제 당신을 모방하지 않습니다. 당신을 공략합니다.',
  'stage.observer.s': '플레이어 입력을 기록만 함',
  'stage.mimic.s': '자주 쓰는 공격을 따라 함',
  'stage.predictor.s': '다음 입력을 예측하기 시작함',
  'stage.punisher.s': '반복 습관을 카운터함',
  'stage.replica.s': '플레이어와 거의 같은 스타일로 싸움',
  'stage.betrayer.s': '플레이어 습관을 역이용해 압도함',
  'stage.evolved': 'SIMULA EVOLVED',
  'stage.next': '다음',
  'stage.max': '최종 단계',

  // ── 아키타입
  'arch.rusher': '러셔', 'arch.counter_hunter': '카운터 헌터',
  'arch.throw_addict': '잡기 중독', 'arch.turtle_guard': '터틀 가드',
  'arch.panic_jumper': '패닉 점퍼', 'arch.combo_repeater': '콤보 리피터',
  'arch.frame_trap_lover': '프레임 트랩', 'arch.random_trickster': '랜덤 트릭스터',
  'arch.rusher.t': '쉬지 않고 파고든다',
  'arch.counter_hunter.t': '상대의 발생을 사냥한다',
  'arch.throw_addict.t': '결국 손이 잡기로 간다',
  'arch.turtle_guard.t': '막고 기다린다',
  'arch.panic_jumper.t': '몰리면 위로 도망친다',
  'arch.combo_repeater.t': '같은 길만 걷는다',
  'arch.frame_trap_lover.t': '틈을 만들어 낚는다',
  'arch.random_trickster.t': '읽을 수 없다',

  // ── DNA 지표
  'dna.aggression': '공격성', 'dna.defense': '방어성', 'dna.repetition': '반복성',
  'dna.risk': '위험 감수', 'dna.grab': '잡기 의존도', 'dna.aerial': '점프 의존도',
  'dna.pressure': '압박 지속력', 'dna.counter': '카운터 성향', 'dna.zoning': '거리 유지',
  'dna.panic': '패닉 지수', 'dna.frameTrap': '프레임 트랩', 'dna.clutch': '역전 본능',
  'dna.okizemeLow': '다운 후 하단', 'dna.cornerEscape': '코너 탈출', 'dna.superTiming': '궁극기 마무리',

  // ── 판정 연출
  'verdict.defeat': '당신의 습관에게 패배',
  'verdict.victory': '습관 탈출 성공',
  'verdict.simulaPredicted': 'SIMULA가 당신의 다음 입력을 예측했습니다.',
  'verdict.predicted': '예측된 입력',
  'verdict.actual': '실제 입력',
  'verdict.accuracy': '예측 성공률',
  'verdict.conclusion': '결론',
  'verdict.correction': '습관 교정 성공',
  'verdict.before': '이전 {l}',
  'verdict.after': '현재 {l}',
  'verdict.failCount': 'SIMULA의 예측 실패',
  'verdict.unreadable': '당신은 더 이상 읽히지 않습니다.',
  'verdict.lostToSelf': 'SIMULA Lv.{lv} {s} — 당신이 진 상대는 당신입니다.',
  'verdict.defeatCause': '패배 원인',
  'verdict.readCount': '읽힌 횟수',
  'verdict.breakCount': '벗어난 횟수',
  'verdict.worstStreak': '최다 연속 피독',
  'verdict.viewAnalysis': '습관 분석 보기',
  'verdict.continue': '계속',

  // ── 미션
  'mission.habitBreak': 'HABIT BREAK MISSION',
  'mission.goal': '이기는 게 아니라, 습관을 쓰지 않고 이기는 것',
  'mission.clear': 'MISSION CLEAR',
  'mission.fail': 'MISSION FAILED',
  'mission.active': 'ACTIVE',
  'mission.failed': 'FAILED',
  'mission.cleared': 'CLEARED',
  'mission.progress': '진행',
  'mission.habit': '습관 발동',
  'mission.seal': '봉인',
  'mission.require': '요구',
  'mission.done': '교정 완료 — 습관이 갱신되었습니다',
  'mission.retry': '재도전',
  'mission.free': '자유 훈련',
  'mission.quit': '포기',
  'mission.correction': '교정',
  'mission.habitFired': '습관 발동 — 미션 실패',

  // ── 콘텐츠 라벨
  'lab.title': 'AI FIGHTER LAB',
  'lab.tagline': '당신의 플레이가 곧 파이터가 됩니다',
  'lab.coreLoop': '플레이 → 학습 → AI 복제 → AI 대전 → 약점 발견 → 재훈련 → 진화',
  'lab.train': '훈련 (직접 플레이)',
  'lab.reset': '데이터 초기화',
  'lab.generate': 'AI 파이터 생성',
  'lab.collecting': '습관 수집 중',
  'lab.trainingData': 'TRAINING DATA',
  'lab.combatDna': 'COMBAT DNA',
  'lab.yourType': '당신의 전투 타입',
  'lab.traits': '특징',
  'lab.strength': 'STRENGTH',
  'lab.weakness': 'AI가 노리는 약점',
  'lab.diagnosis': 'SIMULA의 분석 · 손버릇',
  'lab.habitIndex': '습관 지수',
  'lab.evolution': 'SIMULA EVOLUTION',
  'lab.dnaDiagnosis': 'DNA 기반 진단 · 재훈련 가이드',
  'lab.drills': '습관 교정 훈련',
  'lab.missions': 'HABIT BREAK MISSION',
  'lab.replay': 'REPLAY ANALYSIS',
  'lab.share': '전투 프로필 카드 만들기 · SNS 공유',
  'lab.generation': '세대',
  'lab.samples': '샘플',

  // ── 모드 허브
  'mode.01': 'MODE 01', 'mode.02': 'MODE 02', 'mode.03': 'MODE 03', 'mode.04': 'MODE 04',
  'mode.main': 'MAIN',
  'mode.online': 'ONLINE',
  'mode.free': '자유 훈련 (습관 수집)',

  // ── 스토어
  'store.title': 'AI 분신을 꾸미고, 리그를 확장하세요',
  'store.base': '본편 — 전 모드 · 전 시스템 포함',
  'store.owned': '구매 완료 · 소유 중',
  'store.equip': '장착',
  'store.equipped': '장착 중',
  'store.own': '보유 중',
  'store.buy': '구매',
  'store.free': '기본 제공',
  'store.renamel': '이름 변경',
  'store.slots': '슬롯',
  'store.noP2w': 'NO PAY-TO-WIN GUARANTEE',
  'store.noEffect': '전투 성능 영향 없음',

  // ── 조작
  'ctl.left': '◀', 'ctl.right': '▶', 'ctl.up': '▲', 'ctl.down': '▼',
  'ctl.light': '약', 'ctl.heavy': '강', 'ctl.low': '하단', 'ctl.grab': '잡기',
  'ctl.block': '가드', 'ctl.wave': '파', 'ctl.upper': '어', 'ctl.slide': '슬',
  'ctl.super': '초필', 'ctl.burst': '버스트',
  'ctl.keys': 'A/D 이동 · W 점프 · S 웅크림 · SHIFT 가드 · J/K/L/I 공격 · 1/2/3 필살기 · R 초필살기',
  'ctl.collecting': '지금의 모든 입력이 당신의 AI가 됩니다',
};

const EN: Dict = {
  'app.sub': 'AI HABIT-ANALYSIS FIGHTING · SELF-MIRROR FIGHTING',
  'app.pressAnyKey': 'PRESS ANY KEY',
  'app.insertCoin': 'INSERT COIN · 1 CREDIT',
  'app.ver': 'VER 1.0 · MIRROR NEURAL BRAWLER',
  'app.copyright': '© 2026 SELF-MIRROR FIGHTING SYSTEM',
  'app.select': 'SELECT',
  'app.decide': 'CONFIRM',
  'app.close': 'CLOSE',
  'app.locked': 'LOCKED',
  'app.pressEnter': 'PRESS ENTER',
  'app.start': 'START',
  'app.quit': 'QUIT',
  'app.sound': 'SOUND',

  'menu.training': 'FREE TRAINING',
  'menu.dungeon': 'HABIT DUNGEON',
  'menu.mirror': 'MIRROR BATTLE',
  'menu.league': 'GHOST LEAGUE',
  'menu.lab': 'AI LAB · REPLAYS',
  'menu.store': 'STORE · COSMETICS',
  'menu.training.d': 'Every input you make is recorded. The more you fight, the more SIMULA becomes you.',
  'menu.dungeon.d': 'Each floor seals one habit. On floor 5, SIMULA fights using only your worst habits.',
  'menu.mirror.d': 'Face an AI cloned from your own Combat DNA. If you can\'t beat it, that weakness is already inside you.',
  'menu.league.d': 'Enter your AI into the league. It keeps fighting other players\' AI even while you\'re away.',
  'menu.lab.d': 'Combat DNA profile, SIMULA\'s diagnosis, habit-correction drills and replay comparison.',
  'menu.store.d': 'AI skins, HUD themes, season pass and analysis tools. No item affects combat performance.',
  'menu.locked.ai': 'LOCKED — Generate your AI fighter first (collect data in TRAINING)',

  'hud.you': 'YOU',
  'hud.round': 'ROUND',
  'hud.noise': 'NOISE',
  'hud.absorb': 'ABSORB',
  'hud.async': 'SPECTATING — your AI is fighting on its own',
  'hud.burst.ready': 'NOISE BURST READY',
  'hud.super.ready': 'SUPER READY',
  'hud.desync': 'SIMULA DESYNC — COUNTER WINDOW',
  'hud.mirroring': 'MIRRORING −0.01s',
  'hud.read': 'READ',
  'hud.escape': 'ESCAPED',
  'hud.combo': 'COMBO',
  'hud.simula.combo': 'SIMULA COMBO',
  'hud.best': 'BEST',
  'hud.dungeon': 'DUNGEON',
  'hud.habit': 'HABIT BREAK',
  'hud.training': 'TRAINING',
  'hud.readStreak': 'READ {n} TIMES IN A ROW — change your pattern',
  'hud.habitWarn': 'HABIT DETECTED — {a} {p}%',
  'hud.predict': 'PRED',
  'hud.next': 'NEXT',

  'read.read': '{a} — predicted.',
  'read.again': '{a} again.',
  'read.youAgain': 'You jumped into {a} again.',
  'read.againN': '{a} again. That\'s {n} times.',
  'read.punished': 'Your {a} was already read.',
  'read.unreadable': 'You escaped the prediction.',
  'read.predictFail': 'SIMULA missed its {a} prediction',
  'read.confPrefix': 'Confidence {p}% — answered before it started',
  'read.habitReturn': 'Your habit came right back at you',

  'stage.observer': 'OBSERVER',
  'stage.mimic': 'MIMIC',
  'stage.predictor': 'PREDICTOR',
  'stage.punisher': 'PUNISHER',
  'stage.replica': 'REPLICA',
  'stage.betrayer': 'BETRAYER',
  'stage.observer.q': 'Recording started.',
  'stage.mimic.q': 'Let me try copying your habits.',
  'stage.predictor.q': 'I can see your next input.',
  'stage.punisher.q': 'Don\'t take the same path twice.',
  'stage.replica.q': 'We fight the same way now.',
  'stage.betrayer.q': 'SIMULA no longer imitates you. It hunts you.',
  'stage.observer.s': 'Only logs your inputs',
  'stage.mimic.s': 'Copies your favourite attacks',
  'stage.predictor.s': 'Starts predicting your next input',
  'stage.punisher.s': 'Counters your repeated habits',
  'stage.replica.s': 'Fights almost exactly like you',
  'stage.betrayer.s': 'Turns your habits against you',
  'stage.evolved': 'SIMULA EVOLVED',
  'stage.next': 'NEXT',
  'stage.max': 'FINAL STAGE',

  'arch.rusher': 'RUSHER', 'arch.counter_hunter': 'COUNTER HUNTER',
  'arch.throw_addict': 'THROW ADDICT', 'arch.turtle_guard': 'TURTLE GUARD',
  'arch.panic_jumper': 'PANIC JUMPER', 'arch.combo_repeater': 'COMBO REPEATER',
  'arch.frame_trap_lover': 'FRAME TRAP', 'arch.random_trickster': 'RANDOM TRICKSTER',
  'arch.rusher.t': 'Never stops pressing',
  'arch.counter_hunter.t': 'Hunts your startup frames',
  'arch.throw_addict.t': 'Hands always reach for the throw',
  'arch.turtle_guard.t': 'Blocks and waits',
  'arch.panic_jumper.t': 'Escapes upward under pressure',
  'arch.combo_repeater.t': 'Walks the same road',
  'arch.frame_trap_lover.t': 'Creates gaps to bait you',
  'arch.random_trickster.t': 'Cannot be read',

  'dna.aggression': 'AGGRESSION', 'dna.defense': 'DEFENSE', 'dna.repetition': 'REPETITION',
  'dna.risk': 'RISK', 'dna.grab': 'THROW DEPENDENCY', 'dna.aerial': 'JUMP DEPENDENCY',
  'dna.pressure': 'PRESSURE', 'dna.counter': 'COUNTER', 'dna.zoning': 'ZONING',
  'dna.panic': 'PANIC INDEX', 'dna.frameTrap': 'FRAME TRAP', 'dna.clutch': 'CLUTCH',
  'dna.okizemeLow': 'OKIZEME LOW', 'dna.cornerEscape': 'CORNER ESCAPE', 'dna.superTiming': 'SUPER FINISH',

  'verdict.defeat': 'DEFEATED BY YOUR OWN HABITS',
  'verdict.victory': 'HABIT BROKEN',
  'verdict.simulaPredicted': 'SIMULA predicted your next input.',
  'verdict.predicted': 'PREDICTED INPUT',
  'verdict.actual': 'ACTUAL INPUT',
  'verdict.accuracy': 'PREDICTION RATE',
  'verdict.conclusion': 'CONCLUSION',
  'verdict.correction': 'HABIT CORRECTION SUCCESS',
  'verdict.before': 'PREVIOUS {l}',
  'verdict.after': 'CURRENT {l}',
  'verdict.failCount': 'SIMULA MISSED',
  'verdict.unreadable': 'You can no longer be read.',
  'verdict.lostToSelf': 'SIMULA Lv.{lv} {s} — the one who beat you is you.',
  'verdict.defeatCause': 'CAUSE OF DEFEAT',
  'verdict.readCount': 'TIMES READ',
  'verdict.breakCount': 'TIMES ESCAPED',
  'verdict.worstStreak': 'LONGEST READ STREAK',
  'verdict.viewAnalysis': 'VIEW HABIT ANALYSIS',
  'verdict.continue': 'CONTINUE',

  'mission.habitBreak': 'HABIT BREAK MISSION',
  'mission.goal': 'Not just winning — winning without using your habit',
  'mission.clear': 'MISSION CLEAR',
  'mission.fail': 'MISSION FAILED',
  'mission.active': 'ACTIVE',
  'mission.failed': 'FAILED',
  'mission.cleared': 'CLEARED',
  'mission.progress': 'PROGRESS',
  'mission.habit': 'HABIT FIRED',
  'mission.seal': 'SEALED',
  'mission.require': 'REQUIRED',
  'mission.done': 'Correction complete — habit rewritten',
  'mission.retry': 'RETRY',
  'mission.free': 'FREE TRAINING',
  'mission.quit': 'GIVE UP',
  'mission.correction': 'CORRECT',
  'mission.habitFired': 'Habit triggered — mission failed',

  'lab.title': 'AI FIGHTER LAB',
  'lab.tagline': 'Your play becomes your fighter',
  'lab.coreLoop': 'PLAY → LEARN → CLONE → AI BATTLE → FIND WEAKNESS → RETRAIN → EVOLVE',
  'lab.train': 'TRAIN (play yourself)',
  'lab.reset': 'RESET DATA',
  'lab.generate': 'GENERATE AI FIGHTER',
  'lab.collecting': 'COLLECTING HABITS',
  'lab.trainingData': 'TRAINING DATA',
  'lab.combatDna': 'COMBAT DNA',
  'lab.yourType': 'YOUR COMBAT TYPE',
  'lab.traits': 'TRAITS',
  'lab.strength': 'STRENGTH',
  'lab.weakness': 'WHERE THE AI STRIKES',
  'lab.diagnosis': 'SIMULA\'S ANALYSIS',
  'lab.habitIndex': 'HABIT INDEX',
  'lab.evolution': 'SIMULA EVOLUTION',
  'lab.dnaDiagnosis': 'DNA DIAGNOSIS · RETRAINING GUIDE',
  'lab.drills': 'CORRECTION DRILLS',
  'lab.missions': 'HABIT BREAK MISSION',
  'lab.replay': 'REPLAY ANALYSIS',
  'lab.share': 'CREATE PROFILE CARD · SHARE',
  'lab.generation': 'GEN',
  'lab.samples': 'SAMPLES',

  'mode.01': 'MODE 01', 'mode.02': 'MODE 02', 'mode.03': 'MODE 03', 'mode.04': 'MODE 04',
  'mode.main': 'MAIN',
  'mode.online': 'ONLINE',
  'mode.free': 'FREE TRAINING (collect habits)',

  'store.title': 'Customise your AI. Extend your league.',
  'store.base': 'BASE GAME — all modes & systems included',
  'store.owned': 'PURCHASED · OWNED',
  'store.equip': 'EQUIP',
  'store.equipped': 'EQUIPPED',
  'store.own': 'OWNED',
  'store.buy': 'BUY',
  'store.free': 'INCLUDED',
  'store.renamel': 'RENAME',
  'store.slots': 'SLOTS',
  'store.noP2w': 'NO PAY-TO-WIN GUARANTEE',
  'store.noEffect': 'No effect on combat performance',

  'ctl.light': 'LP', 'ctl.heavy': 'HP', 'ctl.low': 'LK', 'ctl.grab': 'THROW',
  'ctl.block': 'GUARD', 'ctl.wave': 'WV', 'ctl.upper': 'DP', 'ctl.slide': 'SL',
  'ctl.super': 'SUPER', 'ctl.burst': 'BURST',
  'ctl.keys': 'A/D move · W jump · S crouch · SHIFT guard · J/K/L/I attack · 1/2/3 special · R super',
  'ctl.collecting': 'Every input right now becomes your AI',
};

const JA: Dict = {
  'app.sub': 'AI習慣分析格闘 · SELF-MIRROR FIGHTING',
  'app.pressAnyKey': 'いずれかのキーを押してください',
  'app.insertCoin': 'INSERT COIN · 1 CREDIT',
  'app.ver': 'VER 1.0 · MIRROR NEURAL BRAWLER',
  'app.copyright': '© 2026 SELF-MIRROR FIGHTING SYSTEM',
  'app.select': '選択',
  'app.decide': '決定',
  'app.close': '閉じる',
  'app.locked': 'LOCKED',
  'app.pressEnter': 'PRESS ENTER',
  'app.start': 'スタート',
  'app.quit': 'やめる',
  'app.sound': 'サウンド',

  'menu.training': 'フリートレーニング',
  'menu.dungeon': '習慣封印 5階',
  'menu.mirror': 'ミラーバトル',
  'menu.league': 'ゴーストリーグ',
  'menu.lab': 'AIラボ · リプレイ',
  'menu.store': 'ストア · コスメ',
  'menu.training.d': 'あなたの全入力が記録されます。戦うほどSIMULAはあなたに似ていきます。',
  'menu.dungeon.d': '各フロアで習慣を一つ封印します。5階ではSIMULAがあなたの最悪の癖だけで戦います。',
  'menu.mirror.d': 'あなたのCombat DNAを複製したAIと直接対戦。勝てないなら、その弱点はすでにあなたの中にあります。',
  'menu.league.d': 'あなたのAIをリーグに出走。オフラインでも他プレイヤーのAIと戦い続けます。',
  'menu.lab.d': 'Combat DNAプロフィール、SIMULAの分析、習慣矫正ドリル、リプレイ比較。',
  'menu.store.d': 'AIスキン、HUDテーマ、シーズンパス、分析ツール。戦闘性能に影響する商品はありません。',
  'menu.locked.ai': 'LOCKED — まずAIファイターを生成してください（TRAININGでデータ収集）',

  'hud.you': 'あなた',
  'hud.round': 'ラウンド',
  'hud.noise': 'ノイズ',
  'hud.absorb': '吸収率',
  'hud.async': '観戦中 — あなたのAIが自律的に戦闘中',
  'hud.burst.ready': 'ノイズバースト READY',
  'hud.super.ready': '超必殺技 READY',
  'hud.desync': 'SIMULA DESYNC — 反撃チャンス',
  'hud.mirroring': 'MIRRORING −0.01s',
  'hud.read': '読まれた',
  'hud.escape': '回避',
  'hud.combo': 'コンボ',
  'hud.simula.combo': 'SIMULAコンボ',
  'hud.best': 'BEST',
  'hud.dungeon': 'ダンジョン',
  'hud.habit': '習慣打破',
  'hud.training': 'トレーニング',
  'hud.readStreak': '{n}回連続で読まれています — パターンを変えてください',
  'hud.habitWarn': '習慣検知 — {a} {p}%',
  'hud.predict': '予測',
  'hud.next': '次',

  'read.read': '{a} — 予測済み。',
  'read.again': 'また{a}。',
  'read.youAgain': 'あなたはまた{a}しました。',
  'read.againN': 'また{a}です。{n}回目。',
  'read.punished': '{a}はすでに読まれています。',
  'read.unreadable': '予測を外れました。',
  'read.predictFail': 'SIMULAの{a}予測が外れました',
  'read.confPrefix': '信頼度 {p}% — 発生前に対処済み',
  'read.habitReturn': '習慣がそのまま反撃として返ってきました',

  'stage.observer': '観察者',
  'stage.mimic': '模倣者',
  'stage.predictor': '予測者',
  'stage.punisher': '処罰者',
  'stage.replica': '複製者',
  'stage.betrayer': '裏切り者',
  'stage.observer.q': '記録を開始します。',
  'stage.mimic.q': 'あなたの癖を真似してみます。',
  'stage.predictor.q': '次に押すボタンが見えます。',
  'stage.punisher.q': '同じ道を二度来るな。',
  'stage.replica.q': '今や私たちは同じやり方で戦います。',
  'stage.betrayer.q': 'SIMULAはもうあなたを模倣しません。あなたを攻略します。',
  'stage.observer.s': 'プレイヤーの入力を記録するのみ',
  'stage.mimic.s': 'よく使う攻撃を真似る',
  'stage.predictor.s': '次の入力を予測し始める',
  'stage.punisher.s': '繰り返される習慣をカウンター',
  'stage.replica.s': 'プレイヤーとほぼ同じスタイルで戦う',
  'stage.betrayer.s': 'プレイヤーの習慣を逆用して圧倒する',
  'stage.evolved': 'SIMULA EVOLVED',
  'stage.next': '次',
  'stage.max': '最終段階',

  'arch.rusher': 'ラッシャー', 'arch.counter_hunter': 'カウンターハンター',
  'arch.throw_addict': '投げ依存', 'arch.turtle_guard': 'タートルガード',
  'arch.panic_jumper': 'パニックジャンパー', 'arch.combo_repeater': 'コンボリピーター',
  'arch.frame_trap_lover': 'フレームトラップ', 'arch.random_trickster': 'ランダムトリックスター',
  'arch.rusher.t': '休みなく攻め込む',
  'arch.counter_hunter.t': '相手の発生を狩る',
  'arch.throw_addict.t': 'つい手が投げに向かう',
  'arch.turtle_guard.t': 'ガードして待つ',
  'arch.panic_jumper.t': '追い詰められると上へ逃げる',
  'arch.combo_repeater.t': '同じ道だけを歩く',
  'arch.frame_trap_lover.t': '隙を作って誘う',
  'arch.random_trickster.t': '読めない',

  'dna.aggression': '攻撃性', 'dna.defense': '防御性', 'dna.repetition': '反復性',
  'dna.risk': 'リスク許容', 'dna.grab': '投げ依存度', 'dna.aerial': 'ジャンプ依存度',
  'dna.pressure': '圧力持続', 'dna.counter': 'カウンター', 'dna.zoning': '距離維持',
  'dna.panic': 'パニック指数', 'dna.frameTrap': 'フレームトラップ', 'dna.clutch': '逆転本能',
  'dna.okizemeLow': '起き攻め下段', 'dna.cornerEscape': '端脱出', 'dna.superTiming': '超必殺仕込み',

  'verdict.defeat': '自分の習慣に敗北',
  'verdict.victory': '習慣打破成功',
  'verdict.simulaPredicted': 'SIMULAはあなたの次の入力を予測しました。',
  'verdict.predicted': '予測された入力',
  'verdict.actual': '実際の入力',
  'verdict.accuracy': '予測成功率',
  'verdict.conclusion': '結論',
  'verdict.correction': '習慣矫正成功',
  'verdict.before': '以前の{l}',
  'verdict.after': '現在の{l}',
  'verdict.failCount': 'SIMULAの予測失敗',
  'verdict.unreadable': 'あなたはもう読まれません。',
  'verdict.lostToSelf': 'SIMULA Lv.{lv} {s} — あなたが負けた相手はあなた自身です。',
  'verdict.defeatCause': '敗北原因',
  'verdict.readCount': '読まれた回数',
  'verdict.breakCount': '回避した回数',
  'verdict.worstStreak': '最长連続被読',
  'verdict.viewAnalysis': '習慣分析を見る',
  'verdict.continue': '続ける',

  'mission.habitBreak': 'HABIT BREAK MISSION',
  'mission.goal': '勝つだけでなく、習慣を使わずに勝つ',
  'mission.clear': 'MISSION CLEAR',
  'mission.fail': 'MISSION FAILED',
  'mission.active': 'ACTIVE',
  'mission.failed': 'FAILED',
  'mission.cleared': 'CLEARED',
  'mission.progress': '進行',
  'mission.habit': '習慣発動',
  'mission.seal': '封印',
  'mission.require': '必須',
  'mission.done': '矯正完了 — 習慣を更新しました',
  'mission.retry': '再挑戦',
  'mission.free': 'フリートレーニング',
  'mission.quit': 'あきらめる',
  'mission.correction': '矯正',
  'mission.habitFired': '習慣発動 — ミッション失敗',

  'lab.title': 'AI FIGHTER LAB',
  'lab.tagline': 'あなたのプレイがそのままファイターになる',
  'lab.coreLoop': 'プレイ → 学習 → 複製 → AI対戦 → 弱点発見 → 再訓練 → 進化',
  'lab.train': 'トレーニング（直接プレイ）',
  'lab.reset': 'データ初期化',
  'lab.generate': 'AIファイター生成',
  'lab.collecting': '習慣収集中',
  'lab.trainingData': 'TRAINING DATA',
  'lab.combatDna': 'COMBAT DNA',
  'lab.yourType': 'あなたの戦闘タイプ',
  'lab.traits': '特徴',
  'lab.strength': 'STRENGTH',
  'lab.weakness': 'AIが狙う弱点',
  'lab.diagnosis': 'SIMULAの分析',
  'lab.habitIndex': '習慣指数',
  'lab.evolution': 'SIMULA EVOLUTION',
  'lab.dnaDiagnosis': 'DNA診断 · 再訓練ガイド',
  'lab.drills': '矯正ドリル',
  'lab.missions': 'HABIT BREAK MISSION',
  'lab.replay': 'REPLAY ANALYSIS',
  'lab.share': 'プロフィールカード作成 · シェア',
  'lab.generation': '世代',
  'lab.samples': 'サンプル',

  'mode.01': 'MODE 01', 'mode.02': 'MODE 02', 'mode.03': 'MODE 03', 'mode.04': 'MODE 04',
  'mode.main': 'MAIN',
  'mode.online': 'ONLINE',
  'mode.free': 'フリートレーニング（習慣収集）',

  'store.title': 'AIを装飾し、リーグを拡張しよう',
  'store.base': '本編 — 全モード · 全システム収録',
  'store.owned': '購入済み · 所持中',
  'store.equip': '装備',
  'store.equipped': '装備中',
  'store.own': '所持中',
  'store.buy': '購入',
  'store.free': '標準搭載',
  'store.renamel': '名前変更',
  'store.slots': 'スロット',
  'store.noP2w': 'NO PAY-TO-WIN GUARANTEE',
  'store.noEffect': '戦闘性能への影響なし',

  'ctl.light': '小', 'ctl.heavy': '大', 'ctl.low': '下段', 'ctl.grab': '投げ',
  'ctl.block': 'ガード', 'ctl.wave': '波', 'ctl.upper': '昇', 'ctl.slide': '滑',
  'ctl.super': '超必', 'ctl.burst': 'バースト',
  'ctl.keys': 'A/D 移動 · W ジャンプ · S しゃがみ · SHIFT ガード · J/K/L/I 攻撃 · 1/2/3 必殺技 · R 超必殺技',
  'ctl.collecting': '今の全入力があなたのAIになります',
};

const DICTS: Record<Lang, Dict> = { ko: KO, en: EN, ja: JA };

// ── Context ───────────────────────────────────────
const KEY = 'mnb.lang';

function detect(): Lang {
  try {
    const s = localStorage.getItem(KEY) as Lang | null;
    if (s && DICTS[s]) return s;
  } catch { /* noop */ }
  const n = (navigator.language || 'ko').toLowerCase();
  if (n.startsWith('ja')) return 'ja';
  if (n.startsWith('ko')) return 'ko';
  return 'en';
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArch: (id: string) => string;
  tArchT: (id: string) => string;
  tStage: (key: string) => string;
  tDna: (key: string) => string;
}

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detect());

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* noop */ }
    document.documentElement.lang = l;
  };

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo<Ctx>(() => {
    const d = DICTS[lang];
    const raw = (k: string) => d[k] ?? KO[k] ?? k;
    const sub = (s: string, vars?: Record<string, string | number>) => {
      if (!vars) return s;
      let out = s;
      for (const v in vars) out = out.split(`{${v}}`).join(String(vars[v]));
      return out;
    };
    const t = (k: string, vars?: Record<string, string | number>) => sub(raw(k), vars);
    const snake = (s: string) => s.toLowerCase().replace(/_/g, '_');
    return {
      lang, setLang, t,
      tArch: (id) => t(`arch.${snake(id)}`),
      tArchT: (id) => t(`arch.${snake(id)}.t`),
      tStage: (key) => t(`stage.${key}`),
      tDna: (key) => t(`dna.${key}`),
    };
  }, [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nCtx);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}

/** Provider 밖(순수 로직)에서 쓰는 임시 번역기 */
export function tr(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const d = DICTS[lang] ?? KO;
  let s = d[key] ?? KO[key] ?? key;
  if (vars) for (const v in vars) s = s.split(`{${v}}`).join(String(vars[v]));
  return s;
}
