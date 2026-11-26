/* ============================================================
   재우의 스터디 뱅크 — 코어 (상태·문제은행·모달·백업·D-day)
   ============================================================ */
(function () {
  'use strict';

  const D = window.SBData;
  const LS_KEY = 'studybank_v1';
  const VERSION = 2;

  const SB = window.SB = {
    D: D,
    state: null,
    ui: {
      tab: 'bank',
      bank: { level: '전체', subject: 'all', search: '', diff: 'all', status: 'all', type: 'all', star: false },
      solve: { level: 'all', subject: 'all', diff: 'all' },
      omr: {},
      flash: { level: 'all', subject: 'all', mode: 'due' },
      wrong: { filter: 'open' },
      exam: { selected: null },
      pdf: { pages: [], active: 0, name: '' },
      variant: {},
      timer: {}
    },
    modules: [],
    VERSION: VERSION
  };

  /* ---------------- 유틸 ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  SB.$ = $; SB.$$ = $$;

  SB.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  SB.uid = function (p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  SB.clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };
  SB.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  SB.pad2 = function (n) { return String(n).padStart(2, '0'); };
  SB.fmtClock = function (sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return SB.pad2(m) + ':' + SB.pad2(s);
  };
  SB.dateKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + SB.pad2(d.getMonth() + 1) + '-' + SB.pad2(d.getDate());
  };
  SB.todayKey = function () { return SB.dateKey(new Date()); };
  SB.normAnswer = function (s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.,]/g, '')
      .replace(/[①]/g, '1').replace(/[②]/g, '2').replace(/[③]/g, '3').replace(/[④]/g, '4').replace(/[⑤]/g, '5');
  };
  SB.choiceMark = function (i) { return '①②③④⑤'[i] || String(i + 1); };

  /* ---------------- 상태 ---------------- */
  function defaultState() {
    return {
      version: VERSION,
      problems: D.SEED.map(function (p) { return Object.assign({}, p); }),
      attempts: [],
      wrong: [],
      sessions: [],
      cards: {},
      pdfNotes: {},
      settings: {
        theme: 'light',
        focus: false,
        exam: { name: '', date: '' },
        dailyGoal: 20
      },
      createdAt: new Date().toISOString()
    };
  }
  const makeDefaultState = defaultState;

  function normalizeProblem(p) {
    const q = Object.assign({
      level: '고등', subject: '기타', unit: '', difficulty: '중', type: 'mc',
      body: '', choices: [], answerIndex: 0, answer: '', solution: '', source: '',
      tags: [], image: '', createdAt: new Date().toISOString(),
      solves: 0, correct: 0, lastResult: 'unsolved', starred: false
    }, p || {});
    if (!Array.isArray(q.choices)) q.choices = [];
    if (!Array.isArray(q.tags)) q.tags = [];
    q.answerIndex = Number(q.answerIndex) || 0;
    q.starred = !!q.starred;
    return q;
  }

  function loadState() {
    let st;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) st = makeDefaultState();
      else {
        st = JSON.parse(raw);
        if (!st || !Array.isArray(st.problems)) st = makeDefaultState();
      }
    } catch (e) { st = makeDefaultState(); }

    st.problems = (st.problems || []).map(normalizeProblem);
    if (!Array.isArray(st.attempts)) st.attempts = [];
    if (!Array.isArray(st.wrong)) st.wrong = [];
    if (!Array.isArray(st.sessions)) st.sessions = [];
    if (!st.cards || typeof st.cards !== 'object') st.cards = {};
    if (!st.pdfNotes || typeof st.pdfNotes !== 'object') st.pdfNotes = {};
    st.settings = Object.assign({ theme: 'light', focus: false, exam: { name: '', date: '' }, dailyGoal: 20 }, st.settings || {});
    if (!st.settings.exam || typeof st.settings.exam !== 'object') st.settings.exam = { name: '', date: '' };
    if (!st.problems.length) st.problems = D.SEED.map(function (p) { return normalizeProblem(Object.assign({}, p)); });
    return st;
  }

  SB.save = function () {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(SB.state));
      return true;
    } catch (e) {
      SB.toast('저장 공간이 부족해요. 사진이 많은 경우 백업 후 정리해 주세요.', 'bad');
      return false;
    }
  };

  SB.problemById = function (id) {
    return SB.state.problems.find(function (p) { return p.id === id; }) || null;
  };
  SB.wrongByPid = function (pid) {
    return SB.state.wrong.find(function (w) { return w.pid === pid; }) || null;
  };
  SB.addWrong = function (pid) {
    let w = SB.wrongByPid(pid);
    const now = new Date().toISOString();
    if (w) {
      w.resolved = false;
      w.lastAt = now;
      w.tries = (w.tries || 1) + 1;
    } else {
      SB.state.wrong.push({ pid: pid, addedAt: now, lastAt: now, resolved: false, tries: 1 });
    }
  };
  SB.resolveWrong = function (pid) {
    const w = SB.wrongByPid(pid);
    if (w && !w.resolved) {
      w.resolved = true;
      w.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  };
  SB.removeWrong = function (pid) {
    SB.state.wrong = SB.state.wrong.filter(function (w) { return w.pid !== pid; });
    SB.save();
  };

  SB.recordAttempt = function (p, correct, seconds, extra) {
    if (!p) return;
    const at = new Date().toISOString();
    SB.state.attempts.push(Object.assign({
      id: SB.uid('a'), pid: p.id, at: at, correct: !!correct,
      seconds: Math.max(0, Math.round(seconds || 0)),
      subject: p.subject, level: p.level, unit: p.unit || ''
    }, extra || {}));
    p.solves = (p.solves || 0) + 1;
    if (correct) p.correct = (p.correct || 0) + 1;
    p.lastResult = correct ? 'correct' : 'wrong';
    if (correct) SB.resolveWrong(p.id); else SB.addWrong(p.id);
    SB.save();
  };

  SB.streak = function () {
    const days = {};
    SB.state.attempts.forEach(function (a) { days[SB.dateKey(new Date(a.at))] = 1; });
    SB.state.sessions.forEach(function (s) { days[SB.dateKey(new Date(s.at))] = 1; });
    const d = new Date();
    if (!days[SB.dateKey(d)]) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days[SB.dateKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  SB.todayAttempts = function () {
    const t = SB.todayKey();
    return SB.state.attempts.filter(function (a) { return SB.dateKey(new Date(a.at)) === t; });
  };

  /* ---------------- 토스트 ---------------- */
  let toastTimer = null;
  SB.toast = function (msg, kind) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast is-show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.className = 'toast' + (kind ? ' ' + kind : '');
    }, 2400);
  };

  /* ---------------- 셀렉트/뱃지 ---------------- */
  SB.levelLabel = function (key) {
    const l = D.LEVELS.find(function (x) { return x.key === key; });
    return l ? l.label : (key || '');
  };
  SB.subjectCls = function (s) { return D.SUBJECT_CLASS[s] || 'etc'; };
  SB.subjectBadge = function (p) {
    return '<span class="badge s-' + SB.subjectCls(p.subject) + '">' + SB.esc(p.subject) + '</span>';
  };
  SB.levelBadge = function (p) {
    return '<span class="badge badge-soft">' + SB.esc(p.level || '고등') + '</span>';
  };
  SB.diffBadge = function (p) {
    return '<span class="badge badge-diff d-' + SB.esc(p.difficulty || '중') + '">' + SB.esc(p.difficulty || '중') + '</span>';
  };

  SB.fillLevelSelect = function (el, allLabel) {
    if (!el) return;
    let html = '<option value="all">' + SB.esc(allLabel || '전체 연령·학년') + '</option>';
    D.LEVELS.forEach(function (l) {
      if (l.key === '전체') return;
      html += '<option value="' + SB.esc(l.key) + '">' + SB.esc(l.label) + '</option>';
    });
    el.innerHTML = html;
  };
  SB.fillSubjectSelect = function (el, allLabel) {
    if (!el) return;
    let html = '<option value="all">' + SB.esc(allLabel || '전체 과목') + '</option>';
    D.SUBJECTS.forEach(function (s) {
      html += '<option value="' + SB.esc(s.key) + '">' + SB.esc(s.key) + '</option>';
    });
    el.innerHTML = html;
  };

  SB.renderChips = function () {
    const box = $('#bankLevels');
    if (box) {
      let h = '<button class="chip' + (SB.ui.bank.level === '전체' ? ' is-active' : '') + '" data-level="전체">전체</button>';
      D.LEVELS.forEach(function (l) {
        if (l.key === '전체') return;
        h += '<button class="chip' + (SB.ui.bank.level === l.key ? ' is-active' : '') + '" data-level="' + SB.esc(l.key) + '">' + SB.esc(l.label) + '</button>';
      });
      box.innerHTML = h;
    }
    const sbox = $('#bankSubjects');
    if (sbox) {
      let h2 = '<button class="chip' + (SB.ui.bank.subject === 'all' ? ' is-active' : '') + '" data-subject="all">전체</button>';
      D.SUBJECTS.forEach(function (s) {
        h2 += '<button class="chip' + (SB.ui.bank.subject === s.key ? ' is-active' : '') + '" data-subject="' + SB.esc(s.key) + '">' + SB.esc(s.key) + '</button>';
      });
      sbox.innerHTML = h2;
    }
    const star = $('#chipStar');
    if (star) star.classList.toggle('is-active', !!SB.ui.bank.star);
  };

  /* ---------------- 문제은행 ---------------- */
  SB.filteredProblems = function (o) {
    o = o || {};
    const f = Object.assign({}, SB.ui.bank, o);
    const q = String(f.search || '').trim().toLowerCase();
    return SB.state.problems.filter(function (p) {
      if (f.level && f.level !== 'all' && f.level !== '전체' && p.level !== f.level) return false;
      if (f.subject && f.subject !== 'all' && p.subject !== f.subject) return false;
      if (f.diff && f.diff !== 'all' && p.difficulty !== f.diff) return false;
      if (f.type && f.type !== 'all' && p.type !== f.type) return false;
      if (f.status && f.status !== 'all' && p.lastResult !== f.status) return false;
      if (f.star && !p.starred) return false;
      if (o.ids && !o.ids.includes(p.id)) return false;
      if (q) {
        const hay = [p.body, p.unit, p.source, p.subject, p.level, (p.tags || []).join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  };

  SB.hasAnswer = function (p) {
    if (!p) return false;
    if (p.type === 'mc') return !!(p.choices && p.choices[p.answerIndex]);
    return !!String(p.answer || '').trim();
  };

  SB.statusChip = function (p) {
    const map = { unsolved: '미풀이', correct: '맞힘', wrong: '틀림' };
    const k = p.lastResult || 'unsolved';
    return '<span class="q-status st-' + k + '">' + map[k] + '</span>';
  };

  function problemCard(p) {
    const actions = [
      '<button class="btn btn-primary" data-act="solve" data-id="' + p.id + '">✏️ 풀기</button>',
      '<button class="btn" data-act="variant" data-id="' + p.id + '">🔄 변형</button>',
      '<button class="btn btn-ghost" data-act="edit" data-id="' + p.id + '">수정</button>',
      '<button class="btn btn-ghost" data-act="del" data-id="' + p.id + '">삭제</button>'
    ].join('');
    const meta = [];
    if (p.unit) meta.push(SB.esc(p.unit));
    if (p.source) meta.push('출처 ' + SB.esc(p.source));
    if ((p.tags || []).length) meta.push('#' + p.tags.map(SB.esc).join(' #'));
    meta.push(p.solves ? '푼 횟수 ' + p.solves : '아직 안 풀어봄');
    return '<article class="q-card" data-id="' + p.id + '">' +
      '<div class="q-card-top">' + SB.subjectBadge(p) + SB.levelBadge(p) + SB.diffBadge(p) +
      (p.type === 'short' ? '<span class="badge badge-soft">주관식</span>' : '') +
      (SB.hasAnswer(p) ? '' : '<span class="badge" style="background:var(--warn-soft);color:var(--warn)">정답 미정</span>') +
      SB.statusChip(p) + '</div>' +
      '<div class="q-card-row">' +
      '<div class="grow"><div class="q-card-body">' + SB.esc(p.body) + '</div>' +
      '<div class="q-card-meta">' + meta.join(' · ') + '</div></div>' +
      (p.image ? '<img class="q-thumb" src="' + p.image + '" alt="문제 사진" loading="lazy" />' : '') +
      '<button class="star-btn' + (p.starred ? ' is-on' : '') + '" data-act="star" data-id="' + p.id + '" aria-label="즐겨찾기">' + (p.starred ? '★' : '☆') + '</button>' +
      '</div>' +
      '<div class="q-card-actions">' + actions + '</div></article>';
  }

  SB.renderBank = function () {
    const list = SB.filteredProblems();
    const el = $('#bankList');
    if (!el) return;
    el.innerHTML = list.map(problemCard).join('');
    const empty = $('#bankEmpty');
    if (empty) empty.hidden = list.length > 0;

    const all = SB.state.problems;
    const wrongOpen = SB.state.wrong.filter(function (w) { return !w.resolved; }).length;
    const sum = $('#bankSummary');
    if (sum) {
      sum.innerHTML =
        '<span class="summary-pill">총 <strong>' + all.length + '</strong>문제</span>' +
        '<span class="summary-pill">미풀이 <strong>' + all.filter(function (p) { return p.lastResult === 'unsolved'; }).length + '</strong></span>' +
        '<span class="summary-pill">오답 <strong>' + wrongOpen + '</strong></span>' +
        '<span class="summary-pill">⭐ <strong>' + all.filter(function (p) { return p.starred; }).length + '</strong></span>' +
        '<span class="summary-pill">표시 <strong>' + list.length + '</strong></span>';
    }
    SB.renderDday();
  };

  /* ---------------- D-day / 목표 ---------------- */
  SB.renderDday = function () {
    if (!$('#ddayNum')) return;
    const ex = SB.state.settings.exam || {};
    const numEl = $('#ddayNum'), nameEl = $('#ddayName'), dateEl = $('#ddayDate');
    if (ex.date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const target = new Date(ex.date + 'T00:00:00');
      const diff = Math.round((target - today) / 86400000);
      numEl.textContent = diff > 0 ? 'D-' + diff : (diff === 0 ? 'D-DAY' : 'D+' + Math.abs(diff));
      nameEl.textContent = ex.name || '등록한 시험';
      const mmdd = ex.date.slice(5).replace('-', '.');
      dateEl.textContent = ex.date.replace(/-/g, '.') + ' · ' + (diff > 0 ? diff + '일 남음' : (diff === 0 ? '오늘이 시험일!' : diff * -1 + '일 지남'));
    } else {
      numEl.textContent = 'D-?';
      nameEl.textContent = '시험일을 등록해 보세요';
      dateEl.textContent = 'D-day와 오늘의 목표를 함께 관리해요';
    }

    const goal = Math.max(1, Number(SB.state.settings.dailyGoal) || 20);
    const today = SB.todayAttempts().length;
    if ($('#goalCount')) $('#goalCount').textContent = today + ' / ' + goal + '문제';
    if ($('#goalBar')) $('#goalBar').style.width = Math.min(100, Math.round(today / goal * 100)) + '%';
    if ($('#goalMsg')) {
      $('#goalMsg').textContent = today >= goal ? '🎉 오늘 목표 달성!' : (today ? (goal - today) + '문제만 더!' : '한 문제부터 시작해 볼까요?');
    }
    if ($('#goalStreak')) $('#goalStreak').textContent = '🔥 ' + SB.streak() + '일 연속';
  };

  function openDdayEdit() {
    const row = $('#ddayEditRow');
    if (!row) return;
    row.hidden = false;
    $('#ddayNameInput').value = (SB.state.settings.exam && SB.state.settings.exam.name) || '';
    $('#ddayDateInput').value = (SB.state.settings.exam && SB.state.settings.exam.date) || '';
    $('#ddayGoalInput').value = SB.state.settings.dailyGoal || 20;
    $('#ddayNameInput').focus();
  }
  function closeDdayEdit() { const r = $('#ddayEditRow'); if (r) r.hidden = true; }
  function saveDday() {
    SB.state.settings.exam = {
      name: $('#ddayNameInput').value.trim() || '시험',
      date: $('#ddayDateInput').value || ''
    };
    SB.state.settings.dailyGoal = Math.max(1, Number($('#ddayGoalInput').value) || 20);
    SB.save(); SB.renderDday(); closeDdayEdit();
    SB.toast('시험일과 목표를 저장했어요', 'ok');
  }

  /* ---------------- 문제 등록/수정 모달 ---------------- */
  let pfImageData = '';
  let pfType = 'mc';

  function rebuildCurriculum() {
    const sel = $('#pfCurriculum');
    if (!sel) return;
    const level = $('#pfLevel') ? $('#pfLevel').value : '고등';
    const show = (level === '고등' || level === '수능·N수');
    const field = $('#pfCurriculumField');
    if (field) field.hidden = !show;
    if (!show) { sel.innerHTML = '<option value="">— 직접 입력 —</option>'; return; }
    const subject = $('#pfSubject').value;
    const list = (D.CURRICULUM[subject] || []);
    sel.innerHTML = '<option value="">— 직접 입력 —</option>' + list.map(function (v) {
      return '<option value="' + SB.esc(v) + '">' + SB.esc(v) + '</option>';
    }).join('');
  }

  function setPfType(t) {
    pfType = t;
    $$('#pfTypeSeg .seg-btn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.type === t); });
    const cw = $('#pfChoiceWrap'), sw = $('#pfShortWrap');
    if (cw) cw.hidden = t !== 'mc';
    if (sw) sw.hidden = t !== 'short';
  }

  function setImage(data) {
    pfImageData = data || '';
    const wrap = $('#pfImagePreview');
    if (!wrap) return;
    const img = wrap.querySelector('img');
    if (pfImageData) {
      img.src = pfImageData;
      wrap.hidden = false;
    } else {
      img.removeAttribute('src');
      wrap.hidden = true;
    }
  }

  SB.openProblemModal = function (prefill) {
    const p = prefill && prefill.id ? SB.problemById(prefill.id) : null;
    const data = p || Object.assign({}, prefill || {});
    $('#problemModalTitle').textContent = p ? '문제 수정' : '문제 등록';
    $('#pfId').value = p ? p.id : '';
    $('#pfLevel').value = data.level || '고등';
    if (D.SUBJECT_KEYS.indexOf(data.subject) === -1) $('#pfSubject').value = '기타';
    else $('#pfSubject').value = data.subject || '기타';
    rebuildCurriculum();
    $('#pfDifficulty').value = data.difficulty || '중';
    $('#pfBody').value = data.body || '';
    $('#pfUnit').value = data.unit || '';
    $('#pfSource').value = data.source || '';
    $('#pfTags').value = (data.tags || []).join(', ');
    $('#pfSolution').value = data.solution || '';
    setPfType(data.type === 'short' ? 'short' : 'mc');
    const ch = data.choices || [];
    $$('#pfChoiceInputs input').forEach(function (inp) {
      inp.value = ch[Number(inp.dataset.choice)] || '';
    });
    $('#pfAnswerIndex').value = String(Number(data.answerIndex) || 0);
    $('#pfShortAnswer').value = data.answer || '';
    setImage(data.image || '');
    const cur = $('#pfCurriculum');
    if (cur) {
      const hit = (D.CURRICULUM[data.subject] || []).find(function (v) { return (data.unit || '').indexOf(v) === 0; });
      cur.value = hit || '';
    }
    const m = $('#problemModal');
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#pfBody').focus(); }, 40);
  };

  SB.closeProblemModal = function () {
    const m = $('#problemModal');
    if (m) m.hidden = true;
    document.body.style.overflow = '';
  };

  function saveProblem(e) {
    if (e) e.preventDefault();
    const body = $('#pfBody').value.trim();
    if (!body) { SB.toast('문제 본문을 입력해 주세요', 'bad'); $('#pfBody').focus(); return; }
    const id = $('#pfId').value;
    const type = pfType;
    let choices = [];
    let answerIndex = 0;
    let answer = '';
    if (type === 'mc') {
      choices = $$('#pfChoiceInputs input').map(function (i) { return i.value.trim(); });
      const filled = choices.filter(function (c) { return c; }).length;
      if (filled < 2) { SB.toast('객관식은 보기를 2개 이상 채워 주세요', 'bad'); return; }
      answerIndex = Number($('#pfAnswerIndex').value) || 0;
      if (!choices[answerIndex]) { SB.toast('정답 번호의 보기가 비어 있어요', 'bad'); return; }
    } else {
      answer = $('#pfShortAnswer').value.trim();
      if (!answer) { SB.toast('주관식 정답을 입력해 주세요', 'bad'); $('#pfShortAnswer').focus(); return; }
    }
    const obj = {
      level: $('#pfLevel').value,
      subject: $('#pfSubject').value,
      unit: $('#pfUnit').value.trim(),
      difficulty: $('#pfDifficulty').value,
      type: type,
      body: body,
      choices: choices,
      answerIndex: answerIndex,
      answer: answer,
      solution: $('#pfSolution').value.trim(),
      source: $('#pfSource').value.trim(),
      tags: $('#pfTags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      image: pfImageData
    };
    if (id) {
      const p = SB.problemById(id);
      if (p) Object.assign(p, obj);
      SB.toast('문제를 수정했어요', 'ok');
    } else {
      const p = normalizeProblem(Object.assign({ id: SB.uid('q'), createdAt: new Date().toISOString() }, obj));
      SB.state.problems.unshift(p);
      SB.toast('문제를 등록했어요', 'ok');
    }
    SB.save();
    SB.closeProblemModal();
    SB.renderAll();
    if (SB.refreshVariantSources) SB.refreshVariantSources();
  }

  function deleteProblem(id) {
    const p = SB.problemById(id);
    if (!p) return;
    if (!confirm('이 문제를 삭제할까요?\n\n' + (p.body || '').slice(0, 60))) return;
    SB.state.problems = SB.state.problems.filter(function (x) { return x.id !== id; });
    SB.state.wrong = SB.state.wrong.filter(function (w) { return w.pid !== id; });
    if (SB.ui.exam.selected) SB.ui.exam.selected.delete(id);
    SB.save(); SB.renderAll();
    SB.toast('삭제했어요');
  }

  /* ---------------- TTS ---------------- */
  SB.speak = function (text, lang) {
    if (!('speechSynthesis' in window)) { SB.toast('이 브라우저는 음성 읽기를 지원하지 않아요', 'bad'); return; }
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t.slice(0, 900));
      u.lang = lang || (/[가-힣]/.test(t) ? 'ko-KR' : 'en-US');
      u.rate = 0.95;
      const voices = window.speechSynthesis.getVoices() || [];
      const v = voices.find(function (x) { return x.lang === u.lang; });
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
      SB.toast('🔊 읽어 주는 중...');
    } catch (e) { SB.toast('음성 읽기를 시작하지 못했어요', 'bad'); }
  };

  /* ---------------- 인쇄 ---------------- */
  SB.setPrint = function (html) {
    const root = $('#printRoot');
    root.innerHTML = html;
    root.setAttribute('aria-hidden', 'false');
  };
  SB.printHTML = function (html) {
    SB.setPrint(html);
    setTimeout(function () { window.print(); }, 120);
  };
  window.addEventListener('afterprint', function () {
    const root = $('#printRoot');
    if (root) { root.innerHTML = ''; root.setAttribute('aria-hidden', 'true'); }
  });

  /* ---------------- 백업 / 복원 ---------------- */
  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 600);
  }
  SB.backup = function () {
    download('studybank-backup-' + SB.todayKey() + '.json', JSON.stringify(SB.state, null, 2));
    SB.toast('백업 파일을 내려받았어요', 'ok');
  };

  function mergeState(incoming) {
    const cur = SB.state;
    const ids = {};
    cur.problems.forEach(function (p) { ids[p.id] = 1; });
    (incoming.problems || []).forEach(function (p) {
      const q = normalizeProblem(p);
      if (!ids[q.id]) { cur.problems.push(q); ids[q.id] = 1; }
      else {
        const old = cur.problems.find(function (x) { return x.id === q.id; });
        if (old) Object.assign(old, q);
      }
    });
    const aIds = {};
    cur.attempts.forEach(function (a) { aIds[a.id] = 1; });
    (incoming.attempts || []).forEach(function (a) { if (!aIds[a.id]) cur.attempts.push(a); });
    (incoming.wrong || []).forEach(function (w) {
      const old = cur.wrong.find(function (x) { return x.pid === w.pid; });
      if (!old) cur.wrong.push(w);
      else if (!w.resolved) { old.resolved = false; old.lastAt = w.lastAt || old.lastAt; }
    });
    (incoming.sessions || []).forEach(function (s) { cur.sessions.push(s); });
    if (incoming.cards) {
      Object.keys(incoming.cards).forEach(function (k) {
        cur.cards[k] = Object.assign({}, cur.cards[k], incoming.cards[k]);
      });
    }
    if (incoming.pdfNotes) cur.pdfNotes = Object.assign({}, cur.pdfNotes || {}, incoming.pdfNotes);
  }

  function restoreFromFile(file) {
    const reader = new FileReader();
    reader.onload = function () {
      let obj;
      try { obj = JSON.parse(String(reader.result)); }
      catch (e) { SB.toast('JSON 파일을 읽지 못했어요', 'bad'); return; }
      if (!obj || !Array.isArray(obj.problems)) { SB.toast('스터디 뱅크 백업 파일이 아니에요', 'bad'); return; }
      const replace = confirm('기존 데이터를 모두 지우고 복원할까요?\n\n확인 = 전부 교체 · 취소 = 기존 데이터에 합치기');
      if (replace) {
        SB.state = loadStateFromObj(obj);
      } else {
        mergeState(obj);
      }
      SB.save();
      SB.renderAll();
      if (SB.refreshVariantSources) SB.refreshVariantSources();
      SB.toast('복원했어요 (' + SB.state.problems.length + '문제)', 'ok');
    };
    reader.readAsText(file, 'utf-8');
  }
  function loadStateFromObj(obj) {
    const st = makeDefaultState();
    st.problems = (obj.problems || []).map(normalizeProblem);
    st.attempts = Array.isArray(obj.attempts) ? obj.attempts : [];
    st.wrong = Array.isArray(obj.wrong) ? obj.wrong : [];
    st.sessions = Array.isArray(obj.sessions) ? obj.sessions : [];
    st.cards = obj.cards && typeof obj.cards === 'object' ? obj.cards : {};
    st.pdfNotes = obj.pdfNotes && typeof obj.pdfNotes === 'object' ? obj.pdfNotes : {};
    st.settings = Object.assign(st.settings, obj.settings || {});
    return st;
  }

  /* ---------------- 테마 / 집중 모드 ---------------- */
  SB.applyTheme = function (theme) {
    const t = theme || SB.state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', t);
    SB.state.settings.theme = t;
    const icon = $('#themeIcon');
    if (icon) icon.textContent = t === 'dark' ? '☀️' : '🌙';
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0e1117' : '#f4f6fb');
  };
  SB.toggleTheme = function () {
    SB.applyTheme(SB.state.settings.theme === 'dark' ? 'light' : 'dark');
    SB.save();
  };
  SB.setFocus = function (on) {
    document.body.classList.toggle('focus-mode', !!on);
    SB.state.settings.focus = !!on;
    const b = $('#btnFocus');
    if (b) b.classList.toggle('is-on', !!on);
    SB.save();
  };

  /* ---------------- 탭 이동 ---------------- */
  const TABS = ['bank', 'solve', 'flash', 'variant', 'exam', 'pdf', 'wrong', 'timer', 'stats'];
  SB.go = function (tab, silent) {
    if (TABS.indexOf(tab) === -1) tab = 'bank';
    SB.ui.tab = tab;
    $$('.tab').forEach(function (b) { b.classList.toggle('is-active', b.dataset.tab === tab); });
    $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-' + tab); });
    if (!silent) {
      try { history.replaceState(null, '', '#' + tab); } catch (e) {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    SB.modules.forEach(function (m) { if (m.onEnter) m.onEnter(tab); });
    if (tab === 'bank') SB.renderBank();
  };

  /* ---------------- 전체 렌더 ---------------- */
  SB.renderAll = function () {
    SB.renderBank();
    SB.modules.forEach(function (m) { if (m.render) m.render(); });
  };

  /* ---------------- 이벤트 ---------------- */
  function bind() {
    document.addEventListener('click', function (e) {
      const tabBtn = e.target.closest('.tab');
      if (tabBtn) { SB.go(tabBtn.dataset.tab); return; }

      const goto = e.target.closest('[data-goto]');
      if (goto) { SB.go(goto.dataset.goto); return; }

      const tts = e.target.closest('[data-tts]');
      if (tts) { SB.speak(tts.dataset.tts, tts.dataset.ttslang); return; }

      const lv = e.target.closest('#bankLevels .chip');
      if (lv) { SB.ui.bank.level = lv.dataset.level; SB.renderChips(); SB.renderBank(); return; }

      const sj = e.target.closest('#bankSubjects .chip');
      if (sj) { SB.ui.bank.subject = sj.dataset.subject; SB.renderChips(); SB.renderBank(); return; }

      const act = e.target.closest('#bankList [data-act]');
      if (act) {
        const id = act.dataset.id;
        if (act.dataset.act === 'solve') { if (SB.startSolve) SB.startSolve([id]); }
        else if (act.dataset.act === 'variant') { if (SB.openVariantWith) SB.openVariantWith(SB.problemById(id)); }
        else if (act.dataset.act === 'edit') SB.openProblemModal({ id: id });
        else if (act.dataset.act === 'del') deleteProblem(id);
        else if (act.dataset.act === 'star') {
          const p = SB.problemById(id);
          if (p) { p.starred = !p.starred; SB.save(); SB.renderBank(); }
        }
        return;
      }

      if (e.target.closest('#focusExit')) { SB.setFocus(false); return; }
    });

    const search = $('#bankSearch');
    if (search) {
      let timer;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        const clear = $('#bankSearchClear');
        if (clear) clear.hidden = !search.value;
        timer = setTimeout(function () { SB.ui.bank.search = search.value; SB.renderBank(); }, 130);
      });
    }
    const clear = $('#bankSearchClear');
    if (clear) clear.addEventListener('click', function () {
      const s = $('#bankSearch'); if (s) { s.value = ''; s.focus(); }
      SB.ui.bank.search = ''; this.hidden = true; SB.renderBank();
    });
    ['bankDifficulty', 'bankStatus', 'bankType'].forEach(function (id) {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'bankDifficulty') SB.ui.bank.diff = el.value;
        if (id === 'bankStatus') SB.ui.bank.status = el.value;
        if (id === 'bankType') SB.ui.bank.type = el.value;
        SB.renderBank();
      });
    });
    const starChip = $('#chipStar');
    if (starChip) starChip.addEventListener('click', function () {
      SB.ui.bank.star = !SB.ui.bank.star;
      SB.renderChips(); SB.renderBank();
    });

    const add = $('#btnAddProblem');
    if (add) add.addEventListener('click', function () { SB.openProblemModal({}); });
    const addEmpty = $('#bankEmpty');
    if (addEmpty) addEmpty.addEventListener('click', function (e) {
      if (e.target.closest('[data-action=add]')) SB.openProblemModal({});
    });

    if ($('#problemForm')) $('#problemForm').addEventListener('submit', saveProblem);
    if ($('#btnProblemClose')) $('#btnProblemClose').addEventListener('click', SB.closeProblemModal);
    if ($('#btnProblemCancel')) $('#btnProblemCancel').addEventListener('click', SB.closeProblemModal);
    if ($('#problemModal')) $('#problemModal').addEventListener('click', function (e) {
      if (e.target === this) SB.closeProblemModal();
    });
    if ($('#pfSubject')) $('#pfSubject').addEventListener('change', rebuildCurriculum);
    if ($('#pfLevel')) $('#pfLevel').addEventListener('change', rebuildCurriculum);
    if ($('#pfCurriculum')) $('#pfCurriculum').addEventListener('change', function () {
      if (this.value) $('#pfUnit').value = this.value;
    });
    $$('#pfTypeSeg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () { setPfType(b.dataset.type); });
    });
    if ($('#btnPickImage')) $('#btnPickImage').addEventListener('click', function () { $('#pfImage').click(); });
    if ($('#pfImage')) $('#pfImage').addEventListener('change', function () {
      const f = this.files && this.files[0];
      if (!f) return;
      if (f.size > 3.2 * 1024 * 1024) { SB.toast('사진은 3MB 이하로 올려 주세요', 'bad'); this.value = ''; return; }
      const r = new FileReader();
      r.onload = function () { setImage(String(r.result)); };
      r.readAsDataURL(f);
    });
    if ($('#btnRemoveImage')) $('#btnRemoveImage').addEventListener('click', function () { setImage(''); });

    if ($('#btnTheme')) $('#btnTheme').addEventListener('click', SB.toggleTheme);
    if ($('#btnFocus')) $('#btnFocus').addEventListener('click', function () { SB.setFocus(!document.body.classList.contains('focus-mode')); });
    if ($('#btnBackup')) $('#btnBackup').addEventListener('click', SB.backup);
    if ($('#btnBackupFoot')) $('#btnBackupFoot').addEventListener('click', SB.backup);
    if ($('#btnRestore')) $('#btnRestore').addEventListener('click', function () { $('#restoreInput').click(); });
    if ($('#restoreInput')) $('#restoreInput').addEventListener('change', function () {
      const f = this.files && this.files[0];
      if (f) restoreFromFile(f);
      this.value = '';
    });

    if ($('#btnDdayEdit')) $('#btnDdayEdit').addEventListener('click', openDdayEdit);
    if ($('#btnDdayCancel')) $('#btnDdayCancel').addEventListener('click', closeDdayEdit);
    if ($('#btnDdaySave')) $('#btnDdaySave').addEventListener('click', saveDday);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('#problemModal').hidden) SB.closeProblemModal();
        if (document.body.classList.contains('focus-mode')) SB.setFocus(false);
      }
    });

    window.addEventListener('hashchange', function () {
      const h = location.hash.replace('#', '');
      if (h && h !== SB.ui.tab) SB.go(h, true);
    });
  }

  /* ---------------- 시작 ---------------- */
  function boot() {
    SB.state = loadState();
    SB.ui.exam.selected = new Set();
    SB.applyTheme();
    if (SB.state.settings.focus) SB.setFocus(true);

    SB.renderChips();
    SB.fillLevelSelect($('#solveLevel'), '전체 연령·학년');
    SB.fillLevelSelect($('#omrLevel'), '전체 연령·학년');
    SB.fillLevelSelect($('#flashLevel'), '전체 연령·학년');
    SB.fillLevelSelect($('#examRandomLevel'), '전체 연령·학년');
    SB.fillSubjectSelect($('#solveSubject'), '전체 과목');
    SB.fillSubjectSelect($('#omrSubject'), '전체 과목');
    SB.fillSubjectSelect($('#flashSubject'), '전체 과목');
    SB.fillSubjectSelect($('#examRandomSubject'), '전체');
    if ($('#solveDifficulty')) { /* 옵션은 HTML에 있음 */ }

    bind();
    SB.modules.forEach(function (m) { if (m.init) m.init(); });
    SB.renderAll();
    if (SB.refreshVariantSources) SB.refreshVariantSources();

    const h = location.hash.replace('#', '');
    if (h && TABS.indexOf(h) !== -1) SB.go(h, true);
    else SB.go('bank', true);
  }

  SB.register = function (m) { SB.modules.push(m); };
  SB.boot = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
