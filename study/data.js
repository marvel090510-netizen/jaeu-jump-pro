/* 재우의 스터디 뱅크 — 기본 데이터(연령대·과목·샘플 문제) */
(function () {
  'use strict';

  const LEVELS = [
    { key: '전체', label: '전체' },
    { key: '초등', label: '초등' },
    { key: '중등', label: '중등' },
    { key: '고등', label: '고등' },
    { key: '수능·N수', label: '수능·N수' },
    { key: '대학·성인', label: '대학·성인(자격증·어학)' }
  ];

  const SUBJECTS = [
    { key: '수학', cls: 'math' },
    { key: '영어', cls: 'eng' },
    { key: '국어', cls: 'kor' },
    { key: '과학', cls: 'sci' },
    { key: '사회·역사', cls: 'social' },
    { key: '한국사', cls: 'hist' },
    { key: '제2외국어·한문', cls: 'foreign' },
    { key: '코딩·IT', cls: 'code' },
    { key: '자격증·일반상식', cls: 'cert' },
    { key: '기타', cls: 'etc' }
  ];

  const SUBJECT_CLASS = {};
  SUBJECTS.forEach(function (s) { SUBJECT_CLASS[s.key] = s.cls; });

  /* 문제 등록 폼·시험지·타이머에서 쓰는 과목 목록 */
  const SUBJECT_KEYS = SUBJECTS.map(function (s) { return s.key; });

  const DIFFS = ['하', '중', '상'];

  /* 2022 개정 교육과정 과목 체계 (고등·수능) */
  const CURRICULUM = {
    '국어': ['공통국어1', '공통국어2', '화법과 언어', '독서와 작문', '문학', '매체 의사소통', '독서 토론과 글쓰기', '언어생활 탐구'],
    '수학': ['공통수학1', '공통수학2', '대수', '미적분Ⅰ', '확률과 통계', '미적분Ⅱ', '기하', '실용 수학', '경제 수학', '인공지능 수학'],
    '영어': ['공통영어1', '공통영어2', '영어Ⅰ', '영어Ⅱ', '독해와 작문', '영어 발표와 토론', '영미 문학 읽기', '직무 영어'],
    '과학': ['통합과학1', '통합과학2', '물리학', '화학', '생명과학', '지구과학', '과학탐구실험', '역학과 에너지', '전자기와 양자'],
    '사회·역사': ['통합사회1', '통합사회2', '한국지리', '세계지리', '세계사', '동아시아사', '경제', '정치와 법', '사회·문화', '생활과 윤리', '윤리와 사상', '도덕'],
    '한국사': ['한국사1', '한국사2'],
    '제2외국어·한문': ['일본어', '중국어', '독일어', '프랑스어', '스페인어', '러시아어', '아랍어', '베트남어', '한문'],
    '코딩·IT': ['정보', '인공지능 기초', '데이터과학', '소프트웨어와 생활'],
    '자격증·일반상식': ['한국사능력검정', '정보처리기사', 'TOEIC', 'TOEFL', '일반상식', '컴퓨터활용능력'],
    '기타': ['교양', '논술', '면접', '기타']
  };

  function P(o) {
    return Object.assign({
      id: 's' + Math.random().toString(36).slice(2, 9),
      level: '고등',
      subject: '수학',
      unit: '',
      difficulty: '중',
      type: 'mc',
      body: '',
      choices: [],
      answerIndex: 0,
      answer: '',
      solution: '',
      source: '',
      tags: [],
      image: '',
      createdAt: new Date().toISOString(),
      solves: 0,
      correct: 0,
      lastResult: 'unsolved'
    }, o);
  }

  const SEED = [
    /* ---------- 초등 ---------- */
    P({
      id: 'seed-e1', level: '초등', subject: '수학', unit: '초5 · 분수의 덧셈', difficulty: '하',
      type: 'short', body: '계산하시오.\n\n3/4 + 1/2', answer: '5/4|1과 1/4|1.25',
      solution: '분모를 4로 통일하면 3/4 + 2/4 = 5/4 = 1과 1/4 입니다.',
      source: '초등 기초 연산', tags: ['분수', '덧셈'], createdAt: '2026-11-26T09:00:00.000Z'
    }),
    P({
      id: 'seed-e2', level: '초등', subject: '국어', unit: '초3 · 낱말의 뜻', difficulty: '하',
      type: 'mc', body: '다음 낱말의 반의어(반대말)로 알맞은 것은?\n\n‘기쁘다’',
      choices: ['슬프다', '즐겁다', '신나다', '기쁨', '웃다'], answerIndex: 0,
      solution: '‘기쁘다’의 반대말은 ‘슬프다’입니다. 나머지는 비슷한 뜻이거나 낱말의 형태가 다릅니다.',
      source: '초등 국어 기본', tags: ['반의어', '어휘'], createdAt: '2026-11-26T09:02:00.000Z'
    }),
    P({
      id: 'seed-e3', level: '초등', subject: '영어', unit: '초4 · be동사', difficulty: '하',
      type: 'mc', body: '빈칸에 알맞은 것을 고르시오.\n\nI ___ a student.',
      choices: ['am', 'is', 'are', 'be', 'do'], answerIndex: 0,
      solution: '주어 I에는 be동사 am을 씁니다. (I am, You are, He/She is)',
      source: '초등 영어 기초', tags: ['be동사'], createdAt: '2026-11-26T09:04:00.000Z'
    }),

    /* ---------- 중등 ---------- */
    P({
      id: 'seed-m1', level: '중등', subject: '수학', unit: '중1 · 일차방정식', difficulty: '중',
      type: 'short', body: '일차방정식 3x - 5 = 7 을 풀어 x의 값을 구하시오.', answer: '4',
      solution: '3x = 7 + 5 = 12 이므로 x = 4입니다.',
      source: '중등 수학 기본', tags: ['일차방정식'], createdAt: '2026-11-26T09:06:00.000Z'
    }),
    P({
      id: 'seed-m2', level: '중등', subject: '영어', unit: '중1 · 일반동사 현재시제', difficulty: '중',
      type: 'mc', body: '다음 문장의 빈칸에 알맞은 것을 고르시오.\n\nShe ___ to school every morning.',
      choices: ['go', 'goes', 'going', 'gone', 'went'], answerIndex: 1,
      solution: '주어 She는 3인칭 단수이므로 현재시제 동사에 -es를 붙여 goes를 씁니다.',
      source: '중등 영어 문법', tags: ['3인칭 단수', '현재시제'], createdAt: '2026-11-26T09:08:00.000Z'
    }),
    P({
      id: 'seed-m3', level: '중등', subject: '과학', unit: '중2 · 식물과 에너지', difficulty: '중',
      type: 'mc', body: '식물이 광합성 과정에서 밖으로 내보내는 기체는?',
      choices: ['이산화 탄소', '산소', '수소', '질소', '수증기'], answerIndex: 1,
      solution: '광합성은 이산화 탄소와 물을 이용해 포도당을 만들고, 산소를 밖으로 내보냅니다.',
      source: '중등 과학 기본', tags: ['광합성', '생명'], createdAt: '2026-11-26T09:10:00.000Z'
    }),
    P({
      id: 'seed-m4', level: '중등', subject: '사회·역사', unit: '중3 · 조선 전기', difficulty: '중',
      type: 'mc', body: '다음 설명에 해당하는 조선 세종 때의 과학 기구는?\n\n‘그림자를 이용해 시간을 재는 해시계로, 앙부일구와 함께 만들어졌다.’',
      choices: ['측우기', '자격루', '혼천의', '앙부일구', '칠정산'], answerIndex: 3,
      solution: '앙부일구는 반구 모양의 해시계로, 세종 때 장영실 등이 만들었습니다. 자격루는 물시계입니다.',
      source: '중등 역사 기본', tags: ['세종', '과학기술'], createdAt: '2026-11-26T09:12:00.000Z'
    }),

    /* ---------- 고등 ---------- */
    P({
      id: 'seed-h1', level: '고등', subject: '수학', unit: '미적분Ⅰ · 합성함수의 미분법', difficulty: '상',
      type: 'mc', body: '함수 f(x) = x² - 2x + 2 에 대하여 방정식 f(f\'(x)) = f\'(f(x)) 를 만족시키는 실수 x의 값은?',
      choices: ['-2', '0', '1', '2', '4'], answerIndex: 3,
      solution: "f'(x) = 2x - 2 입니다.\nf(f'(x)) = (2x-2)² - 2(2x-2) + 2 = 4x² - 12x + 10\nf'(f(x)) = 2(x²-2x+2) - 2 = 2x² - 4x + 2\n두 식이 같으면 2x² - 8x + 8 = 0, (x-2)² = 0 이므로 x = 2 입니다.",
      source: '고2 학평 유형 변형', tags: ['합성함수', '미분'], createdAt: '2026-11-26T09:14:00.000Z'
    }),
    P({
      id: 'seed-h2', level: '고등', subject: '수학', unit: '미적분Ⅰ · 다항함수의 미분법', difficulty: '중',
      type: 'mc', body: '함수 f(x) = x³ - 3x² + 4x - 1 에 대하여 f\'(2)의 값은?',
      choices: ['1', '2', '3', '4', '5'], answerIndex: 3,
      solution: "f'(x) = 3x² - 6x + 4 이므로 f'(2) = 12 - 12 + 4 = 4 입니다.",
      source: '고2 학평 유형', tags: ['미분', '다항함수'], createdAt: '2026-11-26T09:16:00.000Z'
    }),
    P({
      id: 'seed-h3', level: '고등', subject: '영어', unit: '공통영어2 · 어법(수 일치)', difficulty: '상',
      type: 'mc', body: '다음 문장에서 어법상 알맞은 것을 고르시오.\n\nThe number of students who ___ in the club has increased.',
      choices: ['participate', 'participates', 'participating', 'to participate', 'participated'], answerIndex: 0,
      solution: '선행사 students가 복수이므로 관계대명사 who 뒤의 동사는 복수형 participate가 알맞습니다. 주절의 주어는 The number이므로 has increased로 씁니다.',
      source: '고2 모의고사 어법 변형', tags: ['어법', '수일치', '관계대명사'], createdAt: '2026-11-26T09:18:00.000Z'
    }),
    P({
      id: 'seed-h4', level: '고등', subject: '국어', unit: '문학 · 현대시', difficulty: '중',
      type: 'mc', body: '다음 시의 표현상 특징으로 가장 알맞은 것은?\n\n죽는 날까지 하늘을 우러러\n한 점 부끄럼이 없기를,\n잎새에 이는 바람에도\n나는 괴로워했다.\n\n— 윤동주, 「서시」',
      choices: ['현실을 회피하려는 태도', '자기 성찰과 순수한 삶의 지향', '자연과의 친화를 통한 체념', '사회 현실에 대한 직접적 풍자', '임에 대한 그리움과 기다림'], answerIndex: 1,
      solution: '화자는 하늘을 우러러 부끄럼 없는 삶을 바라며 자신을 성찰하고 있습니다. 작은 바람에도 괴로워하는 모습에서 순수한 삶을 지향하는 태도가 드러납니다.',
      source: '고2 문학 교과서', tags: ['현대시', '서시'], createdAt: '2026-11-26T09:20:00.000Z'
    }),
    P({
      id: 'seed-h5', level: '고등', subject: '한국사', unit: '한국사1 · 일제 강점기', difficulty: '중',
      type: 'mc', body: '1919년 3·1 운동 이후 국내외 임시정부를 통합하여 수립된 대한민국 임시정부의 소재지는?',
      choices: ['베이징', '상하이', '난징', '충칭', '타이베이'], answerIndex: 1,
      solution: '1919년 4월 상하이에 대한민국 임시정부가 수립되었습니다.',
      source: '한국사 기본', tags: ['3·1운동', '임시정부'], createdAt: '2026-11-26T09:22:00.000Z'
    }),
    P({
      id: 'seed-h6', level: '고등', subject: '과학', unit: '화학 · 산·염기 중화 반응', difficulty: '중',
      type: 'short', body: '0.1 M HCl 수용액 100 mL를 완전히 중화시키는 데 필요한 0.1 M NaOH 수용액의 부피는 몇 mL인가?',
      answer: '100', solution: 'HCl과 NaOH는 1:1로 반응하므로 몰수가 같아야 합니다. 0.1 M × 100 mL = 0.1 M × V 이므로 V = 100 mL입니다.',
      source: '고2 화학 기본', tags: ['중화', '몰농도'], createdAt: '2026-11-26T09:24:00.000Z'
    }),

    /* ---------- 수능·N수 ---------- */
    P({
      id: 'seed-s1', level: '수능·N수', subject: '국어', unit: '화법과 언어 · 음운 변동', difficulty: '중',
      type: 'mc', body: '다음 중 음운 변동이 ‘첨가’에 해당하는 것은?',
      choices: ['국물[궁물]', '꽃잎[꼬칩]', '좋아[조아]', '닭[닥]', '밥을[바블]'], answerIndex: 1,
      solution: '‘꽃잎’이 [꼬칩]으로 발음될 때 ㄴ 소리가 첨가됩니다. ①은 비음화, ③은 ㅎ 탈락, ④는 자음군 단순화, ⑤는 연음입니다.',
      source: '수능 국어 기출 유형', tags: ['음운', '첨가'], createdAt: '2026-11-26T09:26:00.000Z'
    }),
    P({
      id: 'seed-s2', level: '수능·N수', subject: '영어', unit: '영어Ⅱ · 빈칸 추론', difficulty: '상',
      type: 'mc', body: '다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.\n\nLearning a new language requires consistent practice; _____, studying for just ten minutes every day can be more effective than cramming once a week.',
      choices: ['therefore', 'in contrast', 'for example', 'nevertheless', 'otherwise'], answerIndex: 2,
      solution: '앞에서 꾸준한 연습을 강조하고, 뒤에서 매일 10분씩 공부하는 경우를 예로 들고 있으므로 ‘for example’이 적절합니다.',
      source: '수능 영어 유형', tags: ['빈칸', '연결어'], createdAt: '2026-11-26T09:28:00.000Z'
    }),
    P({
      id: 'seed-s3', level: '수능·N수', subject: '수학', unit: '미적분Ⅰ · 도함수의 활용', difficulty: '상',
      type: 'short', body: '함수 f(x) = x³ - 6x² + 9x 의 극댓값은?', answer: '4',
      solution: "f'(x) = 3x² - 12x + 9 = 3(x-1)(x-3) 이므로 x = 1에서 극대, x = 3에서 극소입니다. f(1) = 1 - 6 + 9 = 4.",
      source: '수능 수학 유형', tags: ['극값', '미분'], createdAt: '2026-11-26T09:30:00.000Z'
    }),

    /* ---------- 대학·성인 ---------- */
    P({
      id: 'seed-a1', level: '대학·성인', subject: '한국사', unit: '한국사능력검정 · 고려 정치', difficulty: '중',
      type: 'mc', body: '다음 설명에 해당하는 고려의 지방 행정 구역은?\n\n‘중앙의 고관이 파견되어 지방을 다스렸으며, 전국에 12곳이 있었다.’',
      choices: ['주', '부', '군', '현', '목'], answerIndex: 4,
      solution: '고려는 전국에 12목을 두고 중앙의 고관을 파견해 다스렸습니다.',
      source: '한국사능력검정 기본', tags: ['고려', '12목'], createdAt: '2026-11-26T09:32:00.000Z'
    }),
    P({
      id: 'seed-a2', level: '대학·성인', subject: '코딩·IT', unit: 'Python · 리스트', difficulty: '중',
      type: 'mc', body: 'Python에서 리스트 a = [1, 2, 3]의 끝에 값 4를 추가하는 코드로 알맞은 것은?',
      choices: ['a.add(4)', 'a.append(4)', 'a.push(4)', 'a.insert(4)', 'a.put(4)'], answerIndex: 1,
      solution: '리스트 끝에 요소를 추가할 때는 append()를 사용합니다. insert()는 위치와 값을 함께 받아야 합니다.',
      source: '정보처리기사·코딩 기본', tags: ['Python', '리스트'], createdAt: '2026-11-26T09:34:00.000Z'
    }),
    P({
      id: 'seed-a3', level: '대학·성인', subject: '영어', unit: 'TOEIC · 문법', difficulty: '하',
      type: 'mc', body: '빈칸에 알맞은 것을 고르시오.\n\nThe manager asked the staff to ___ the report by Friday.',
      choices: ['submit', 'submits', 'submitted', 'submitting', 'submission'], answerIndex: 0,
      solution: 'ask someone to do 형태이므로 to 뒤에는 동사원형 submit이 알맞습니다.',
      source: 'TOEIC 기본', tags: ['to부정사', '어휘'], createdAt: '2026-11-26T09:36:00.000Z'
    }),
    P({
      id: 'seed-a4', level: '대학·성인', subject: '자격증·일반상식', unit: '일반상식 · 국제기구', difficulty: '하',
      type: 'mc', body: '유엔(UN) 본부가 있는 도시는?',
      choices: ['제네바', '뉴욕', '파리', '런던', '브뤼셀'], answerIndex: 1,
      solution: '유엔 본부는 미국 뉴욕에 있습니다. 제네바에는 유엔 유럽 본부가 있습니다.',
      source: '일반상식', tags: ['UN', '국제기구'], createdAt: '2026-11-26T09:38:00.000Z'
    })
  ];

  window.SBData = {
    LEVELS: LEVELS,
    SUBJECTS: SUBJECTS,
    SUBJECT_KEYS: SUBJECT_KEYS,
    SUBJECT_CLASS: SUBJECT_CLASS,
    DIFFS: DIFFS,
    CURRICULUM: CURRICULUM,
    SEED: SEED
  };
})();
