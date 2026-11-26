/* ============================================================
   재우의 스터디 뱅크 — 오답노트 · 플래시카드 · 타이머 · 통계
   ============================================================ */
(function () {
  'use strict';
  const SB = window.SB, $ = SB.$, $$ = SB.$$;

  /* ============================================================
     1) 오답노트
     ============================================================ */
  function wrongEntries(filter) {
    return SB.state.wrong.map(function (w) {
      const p = SB.problemById(w.pid);
      return { w: w, p: p };
    }).filter(function (it) {
      if (!it.p) return false;
      if (filter === 'open') return !it.w.resolved;
      if (filter === 'resolved') return !!it.w.resolved;
      return true;
    }).sort(function (a, b) {
      if (a.w.resolved !== b.w.resolved) return a.w.resolved ? 1 : -1;
      return new Date(b.w.lastAt || b.w.addedAt) - new Date(a.w.lastAt || a.w.addedAt);
    });
  }

  function wrongCard(it) {
    const p = it.p, w = it.w;
    const ans = p.type === 'mc'
      ? (SB.choiceMark(p.answerIndex) + ' ' + (p.choices[p.answerIndex] || ''))
      : String(p.answer || '').split('|')[0];
    const date = (w.lastAt || w.addedAt || '').slice(0, 10).replace(/-/g, '.');
    return '<article class="q-card">' +
      '<div class="q-card-top">' + SB.subjectBadge(p) + SB.levelBadge(p) + SB.diffBadge(p) +
      (w.resolved ? '<span class="q-status st-correct">해결됨</span>' : '<span class="q-status st-wrong">복습 필요</span>') +
      '</div>' +
      '<div class="q-card-body">' + SB.esc(p.body) + '</div>' +
      '<div class="q-card-meta"><span>정답: <strong>' + SB.esc(ans) + '</strong></span><span>' + SB.esc(p.unit || p.subject) + '</span><span>' + date + ' · ' + (w.tries || 1) + '회 틀림</span></div>' +
      (p.solution ? '<details style="margin-top:6px"><summary class="muted small" style="cursor:pointer">해설 보기</summary><p class="small" style="margin-top:6px;white-space:pre-wrap">' + SB.esc(p.solution) + '</p></details>' : '') +
      '<div class="q-card-actions">' +
      '<button class="btn btn-primary" data-wrong-act="retry" data-id="' + p.id + '">✏️ 다시 풀기</button>' +
      '<button class="btn" data-wrong-act="toggle" data-id="' + p.id + '">' + (w.resolved ? '↩ 복습 목록으로' : '✅ 해결됨 표시') + '</button>' +
      '<button class="btn btn-ghost" data-wrong-act="remove" data-id="' + p.id + '">목록에서 빼기</button>' +
      '</div></article>';
  }

  function renderWrong() {
    const box = $('#wrongList');
    if (!box) return;
    const filter = SB.ui.wrong.filter;
    const list = wrongEntries(filter);
    box.innerHTML = list.map(wrongCard).join('');
    if ($('#wrongEmpty')) $('#wrongEmpty').hidden = list.length > 0;
    const open = wrongEntries('open').length;
    const done = wrongEntries('resolved').length;
    if ($('#wrongSummary')) {
      $('#wrongSummary').innerHTML =
        '<span class="summary-pill">복습 필요 <strong>' + open + '</strong></span>' +
        '<span class="summary-pill">해결됨 <strong>' + done + '</strong></span>' +
        '<span class="summary-pill">전체 오답 <strong>' + wrongEntries('all').length + '</strong></span>';
    }
    $$('#wrongFilters .chip').forEach(function (b) { b.classList.toggle('is-active', b.dataset.wrong === filter); });
  }

  function printWrongNote() {
    const list = wrongEntries('all');
    if (!list.length) { SB.toast('오답노트가 비어 있어요', 'bad'); return; }
    const items = list.map(function (it, i) {
      const p = it.p;
      const ans = p.type === 'mc'
        ? choiceMarkReadable(p)
        : String(p.answer || '').split('|')[0];
      return '<div class="note-item">' +
        '<div class="note-meta">' + (i + 1) + '. ' + SB.esc(p.subject) + ' · ' + SB.esc(p.level) + ' · ' + SB.esc(p.unit || '') + ' · ' + (it.w.resolved ? '해결됨' : '복습 필요') + '</div>' +
        '<div class="q-text">' + SB.esc(p.body) + '</div>' +
        (p.choices && p.choices.length ? '<ol class="q-choices">' + p.choices.map(function (c, ci) { return c ? '<li>' + SB.choiceMark(ci) + ' ' + SB.esc(c) + '</li>' : ''; }).join('') + '</ol>' : '') +
        '<div class="note-answer"><strong>정답</strong> ' + SB.esc(ans) + '</div>' +
        (p.solution ? '<div class="note-answer"><strong>해설</strong> ' + SB.esc(p.solution) + '</div>' : '') +
        '<div class="note-answer" style="margin-top:6px;color:#555">다시 풀어 본 메모: ______________________________________________</div>' +
        '</div>';
    }).join('');
    const html = '<div class="paper note-paper">' +
      '<div class="paper-head"><h1>오답노트</h1><p>재우의 스터디 뱅크 · ' + SB.todayKey().replace(/-/g, '.') + '</p></div>' +
      '<div class="paper-info"><span>이름: ______________</span><span>복습 필요 ' + wrongEntries('open').length + '문제</span><span>전체 ' + list.length + '문제</span></div>' +
      items + '</div>';
    SB.printHTML(html);
  }

  /* choice mark helper (문자열 안전) */
  function choiceMarkReadable(p) {
    return SB.choiceMark(p.answerIndex) + ' ' + ((p.choices && p.choices[p.answerIndex]) || '');
  }

  /* ============================================================
     2) 플래시카드
     ============================================================ */
  const INTERVALS = [0, 1, 3, 7, 21, 60];
  let F = null;

  function cardOf(pid) {
    return SB.state.cards[pid] || null;
  }
  function dueDate(box) {
    const d = new Date();
    d.setDate(d.getDate() + (INTERVALS[box] || 0));
    return SB.dateKey(d);
  }

  function flashPool() {
    const f = SB.ui.flash;
    let list = SB.state.problems.filter(function (p) {
      if (f.level !== 'all' && p.level !== f.level) return false;
      if (f.subject !== 'all' && p.subject !== f.subject) return false;
      if (f.mode === 'star' && !p.starred) return false;
      if (f.mode === 'wrong') {
        const w = SB.wrongByPid(p.id);
        if (!(w && !w.resolved)) return false;
      }
      if (f.mode === 'due') {
        const c = cardOf(p.id);
        if (c && c.due && c.due > SB.todayKey()) return false;
      }
      return true;
    });
    return SB.shuffle(list);
  }

  function updateFlashInfo() {
    const n = flashPool().length;
    if ($('#flashInfo')) $('#flashInfo').textContent = n ? '카드 ' + n + '장 준비됨' : '해당하는 카드가 없어요';
  }

  function startFlash() {
    const queue = flashPool();
    if (!queue.length) {
      $('#fcWrap').hidden = true;
      $('#fcEmpty').hidden = false;
      $('#fcEmpty').querySelector('h3').textContent = '복습할 카드가 없어요';
      return;
    }
    F = { queue: queue, idx: 0, flipped: false, known: 0, unknown: 0 };
    $('#fcEmpty').hidden = true;
    $('#fcWrap').hidden = false;
    if ($('#flashSetup')) $('#flashSetup').hidden = true;
    renderCard();
  }

  function flashAnswer(p) {
    if (p.type === 'mc') return SB.choiceMark(p.answerIndex) + ' ' + (p.choices[p.answerIndex] || '');
    return String(p.answer || '').split('|')[0];
  }

  function renderCard() {
    if (!F) return;
    if (F.idx >= F.queue.length) {
      F = null;
      $('#fcWrap').hidden = true;
      $('#fcEmpty').hidden = false;
      if ($('#flashSetup')) $('#flashSetup').hidden = false;
      $('#fcEmpty').querySelector('h3').textContent = '오늘 카드 다 봤어요! 🎉';
      $('#fcEmpty').querySelector('p').textContent = '모르겠어요로 표시한 카드는 오늘 다시 나와요.';
      SB.toast('카드 학습 완료!', 'ok');
      return;
    }
    const p = F.queue[F.idx];
    F.flipped = false;
    const card = $('#fcCard');
    card.classList.remove('is-flipped');
    $('#fcProgress').textContent = (F.idx + 1) + ' / ' + F.queue.length;
    $('#fcScore').textContent = '알아요 ' + F.known + ' · 모르겠어요 ' + F.unknown;
    $('#fcTagFront').innerHTML = SB.subjectBadge(p) + SB.levelBadge(p) + (p.unit ? '<span class="badge badge-soft">' + SB.esc(p.unit) + '</span>' : '');
    $('#fcTagBack').innerHTML = SB.subjectBadge(p) + (p.unit ? '<span class="badge badge-soft">' + SB.esc(p.unit) + '</span>' : '');
    $('#fcFront').textContent = p.body;
    $('#fcAnswer').textContent = flashAnswer(p);
    $('#fcSolution').textContent = p.solution || '등록된 해설이 없어요.';
  }

  function flipCard() {
    if (!F) return;
    F.flipped = !F.flipped;
    $('#fcCard').classList.toggle('is-flipped', F.flipped);
  }

  function answerCard(known) {
    if (!F) return;
    const p = F.queue[F.idx];
    const c = cardOf(p.id) || { box: 0, seen: 0, known: 0, unknown: 0 };
    if (known) {
      c.box = Math.min((c.box || 0) + 1, INTERVALS.length - 1);
      c.known = (c.known || 0) + 1;
      F.known++;
    } else {
      c.box = 0;
      c.unknown = (c.unknown || 0) + 1;
      F.unknown++;
      if (F.queue.length < 40) F.queue.push(p);
    }
    c.seen = (c.seen || 0) + 1;
    c.due = dueDate(c.box);
    c.last = new Date().toISOString();
    SB.state.cards[p.id] = c;
    SB.save();
    F.idx++;
    renderCard();
  }

  function skipCard() {
    if (!F) return;
    F.idx++;
    renderCard();
  }

  /* ============================================================
     3) 타이머
     ============================================================ */
  const T = { minutes: 100, label: '2028 수능 수학', remaining: 6000, endAt: 0, running: false, id: null };
  let audioCtx = null;

  function timerDisplay() {
    if ($('#timerDisplay')) $('#timerDisplay').textContent = SB.fmtClock(T.remaining);
    if ($('#timerLabel')) $('#timerLabel').textContent = T.label + ' · ' + T.minutes + '분';
    const total = Math.max(1, T.minutes * 60);
    if ($('#timerBar')) $('#timerBar').style.width = SB.clamp(T.remaining / total * 100, 0, 100) + '%';
    const el = $('#timerDisplay');
    if (el) {
      el.classList.toggle('is-warn', T.remaining <= 300 && T.remaining > 0);
      el.classList.toggle('is-over', T.remaining <= 0);
    }
  }

  function stopTimer() {
    if (T.id) { clearInterval(T.id); T.id = null; }
    T.running = false;
    const b = $('#btnTimerStart');
    if (b) b.textContent = '▶ 시작';
  }

  function tickTimer() {
    T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1000));
    timerDisplay();
    if (T.remaining <= 0) {
      stopTimer();
      beep();
      SB.toast('⏰ 시간 종료!', 'bad');
      SB.state.sessions.push({
        id: SB.uid('s'), type: 'timer', at: new Date().toISOString(),
        label: T.label, minutes: T.minutes, seconds: T.minutes * 60, completed: true
      });
      SB.save();
      renderTimerLog();
    }
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      let t = audioCtx.currentTime;
      for (let i = 0; i < 3; i++) {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + 0.3);
        t += 0.42;
      }
    } catch (e) {}
  }

  function startTimer() {
    if (T.running) return;
    if (T.remaining <= 0) T.remaining = T.minutes * 60;
    T.endAt = Date.now() + T.remaining * 1000;
    T.running = true;
    T.id = setInterval(tickTimer, 250);
    const b = $('#btnTimerStart');
    if (b) b.textContent = '⏵ 진행 중';
    timerDisplay();
  }

  function pauseTimer() {
    if (!T.running) return;
    T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1000));
    stopTimer();
    timerDisplay();
    SB.toast('일시정지했어요');
  }

  function resetTimer() {
    stopTimer();
    T.remaining = T.minutes * 60;
    timerDisplay();
  }

  function selectPreset(btn) {
    const min = btn.dataset.min;
    $$('#timerPresets .preset, .preset-row .preset').forEach(function (b) { b.classList.remove('is-active'); });
    if (min === 'custom') {
      $('#customMinWrap').hidden = false;
      $('#customMin').focus();
      btn.classList.add('is-active');
      return;
    }
    $('#customMinWrap').hidden = true;
    btn.classList.add('is-active');
    T.minutes = Number(min) || 60;
    T.label = btn.dataset.label || (btn.querySelector('strong').textContent + ' ' + btn.querySelector('span').textContent);
    T.remaining = T.minutes * 60;
    stopTimer();
    timerDisplay();
  }

  function renderTimerLog() {
    const box = $('#timerLog');
    if (!box) return;
    const list = SB.state.sessions.filter(function (s) { return s.type === 'timer' || s.type === 'omr'; })
      .slice(-6).reverse();
    if (!list.length) { box.textContent = '아직 기록이 없어요.'; return; }
    box.innerHTML = list.map(function (s) {
      const d = new Date(s.at);
      const when = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + SB.pad2(d.getHours()) + ':' + SB.pad2(d.getMinutes());
      if (s.type === 'omr') return '<div class="session-item"><span>📝 OMR 모의 · ' + s.count + '문항</span><span>' + when + ' · ' + s.correct + '/' + s.count + '</span></div>';
      return '<div class="session-item"><span>⏱️ ' + SB.esc(s.label || '타이머') + '</span><span>' + when + ' · ' + s.minutes + '분</span></div>';
    }).join('');
  }

  /* ============================================================
     4) 통계
     ============================================================ */
  function renderStats() {
    if (!$('#statCards')) return;
    const at = SB.state.attempts;
    const today = SB.todayAttempts();
    const rate = at.length ? Math.round(at.filter(function (a) { return a.correct; }).length / at.length * 100) : 0;
    const openWrong = SB.state.wrong.filter(function (w) { return !w.resolved; }).length;
    const totalMin = Math.round(at.reduce(function (a, x) { return a + (x.seconds || 0); }, 0) / 60);
    $('#statCards').innerHTML =
      card('등록한 문제', SB.state.problems.length + '개', '⭐ ' + SB.state.problems.filter(function (p) { return p.starred; }).length + '개 즐겨찾기') +
      card('오늘 푼 문제', today.length + '개', '목표 ' + (SB.state.settings.dailyGoal || 20) + '개') +
      card('전체 정답률', rate + '%', at.length + '회 풀이') +
      card('연속 학습', SB.streak() + '일', '🔥 꾸준히 가요') +
      card('복습할 오답', openWrong + '개', '해결 ' + SB.state.wrong.filter(function (w) { return w.resolved; }).length + '개') +
      card('누적 풀이 시간', totalMin + '분', '기록된 시간 기준');

    const bySub = {};
    at.forEach(function (a) {
      const k = a.subject || '기타';
      if (!bySub[k]) bySub[k] = { n: 0, c: 0, sec: 0 };
      bySub[k].n++; if (a.correct) bySub[k].c++; bySub[k].sec += a.seconds || 0;
    });
    const keys = Object.keys(bySub).sort(function (a, b) { return bySub[b].n - bySub[a].n; });
    $('#statSubjects').innerHTML = keys.length ? keys.map(function (k) {
      const s = bySub[k];
      const r = Math.round(s.c / s.n * 100);
      return '<div class="stat-bar-row"><span class="name">' + SB.esc(k) + '</span>' +
        '<div class="track"><div class="fill" style="width:' + r + '%"></div></div>' +
        '<span class="val">' + r + '% (' + s.c + '/' + s.n + ')</span></div>';
    }).join('') : '<p class="muted small">아직 풀이 기록이 없어요. 문제를 한 문제 풀어 보세요!</p>';
    if ($('#statRateInfo')) $('#statRateInfo').textContent = at.length ? '총 ' + at.length + '회 풀이' : '';

    /* 최근 14일 */
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = SB.dateKey(d);
      const n = at.filter(function (a) { return SB.dateKey(new Date(a.at)) === key; }).length;
      days.push({ key: key, label: (d.getMonth() + 1) + '/' + d.getDate(), n: n });
    }
    const max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.n; })));
    $('#statSpark').innerHTML = days.map(function (d) {
      return '<div class="spark-col"><div class="spark-bar' + (d.n ? '' : ' zero') + '" style="height:' + Math.max(3, Math.round(d.n / max * 88)) + '%" title="' + d.label + ' · ' + d.n + '문제"></div><span class="spark-day">' + d.label + '</span></div>';
    }).join('');

    const timed = at.filter(function (a) { return a.seconds > 0; });
    const avg = timed.length ? Math.round(timed.reduce(function (a, x) { return a + x.seconds; }, 0) / timed.length) : 0;
    const fastest = timed.length ? Math.min.apply(null, timed.map(function (a) { return a.seconds; })) : 0;
    if ($('#statTime')) {
      $('#statTime').innerHTML = timed.length
        ? '<p>문항당 평균 <strong>' + SB.fmtClock(avg) + '</strong> · 가장 빠른 풀이 <strong>' + SB.fmtClock(fastest) + '</strong> · 시간 기록 ' + timed.length + '회</p>'
        : '아직 시간 기록이 없어요. 문제를 풀면 문항별 풀이 시간이 쌓여요.';
    }
  }
  function card(k, v, s) {
    return '<div class="stat-card"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div></div>';
  }

  /* ============================================================
     이벤트 & 등록
     ============================================================ */
  function init() {
    if ($('#wrongFilters')) $('#wrongFilters').addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      SB.ui.wrong.filter = b.dataset.wrong;
      renderWrong();
    });
    if ($('#wrongList')) $('#wrongList').addEventListener('click', function (e) {
      const b = e.target.closest('[data-wrong-act]');
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.wrongAct === 'retry') { if (SB.startSolve) SB.startSolve([id]); }
      else if (b.dataset.wrongAct === 'toggle') {
        const w = SB.wrongByPid(id);
        if (w) { w.resolved = !w.resolved; if (w.resolved) w.resolvedAt = new Date().toISOString(); SB.save(); renderWrong(); }
      } else if (b.dataset.wrongAct === 'remove') {
        SB.removeWrong(id); renderWrong();
      }
    });
    if ($('#btnPrintWrong')) $('#btnPrintWrong').addEventListener('click', printWrongNote);

    /* 플래시카드 */
    if ($('#btnStartFlash')) $('#btnStartFlash').addEventListener('click', startFlash);
    ['flashLevel', 'flashSubject', 'flashMode'].forEach(function (id) {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'flashLevel') SB.ui.flash.level = el.value;
        if (id === 'flashSubject') SB.ui.flash.subject = el.value;
        if (id === 'flashMode') SB.ui.flash.mode = el.value;
        updateFlashInfo();
      });
    });
    if ($('#fcCard')) $('#fcCard').addEventListener('click', flipCard);
    if ($('#fcCard')) $('#fcCard').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(); }
    });
    if ($('#btnFcKnown')) $('#btnFcKnown').addEventListener('click', function (e) { e.stopPropagation(); answerCard(true); });
    if ($('#btnFcUnknown')) $('#btnFcUnknown').addEventListener('click', function (e) { e.stopPropagation(); answerCard(false); });
    if ($('#btnFcSkip')) $('#btnFcSkip').addEventListener('click', skipCard);
    if ($('#btnFcQuit')) $('#btnFcQuit').addEventListener('click', function () {
      F = null;
      $('#fcWrap').hidden = true;
      if ($('#flashSetup')) $('#flashSetup').hidden = false;
      updateFlashInfo();
    });
    if ($('#btnFcSpeak')) $('#btnFcSpeak').addEventListener('click', function () {
      if (!F || !F.queue[F.idx]) return;
      const p = F.queue[F.idx];
      SB.speak(p.body + '. 정답은 ' + flashAnswer(p) + '. ' + (p.solution || ''), p.subject === '영어' ? 'en-US' : 'ko-KR');
    });

    /* 타이머 */
    const presets = $$('#timerPresets .preset, .preset-row .preset');
    presets.forEach(function (b) { b.addEventListener('click', function () { selectPreset(b); }); });
    if ($('#btnApplyCustom')) $('#btnApplyCustom').addEventListener('click', function () {
      const m = SB.clamp(Number($('#customMin').value) || 50, 1, 300);
      T.minutes = m; T.label = '커스텀'; T.remaining = m * 60;
      stopTimer(); timerDisplay();
      SB.toast(m + '분으로 설정했어요');
    });
    if ($('#btnTimerStart')) $('#btnTimerStart').addEventListener('click', startTimer);
    if ($('#btnTimerPause')) $('#btnTimerPause').addEventListener('click', pauseTimer);
    if ($('#btnTimerReset')) $('#btnTimerReset').addEventListener('click', resetTimer);

    /* 단축키: 카드 */
    document.addEventListener('keydown', function (e) {
      if (!F || $('#fcWrap').hidden) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === ' ') { e.preventDefault(); flipCard(); }
      if (e.key === '1') answerCard(false);
      if (e.key === '2') answerCard(true);
    });

    const active = $('#timerPresets .preset[data-min="100"]');
    if (active) { T.minutes = 100; T.label = '2028 수능 수학'; T.remaining = 6000; }
    timerDisplay();
    renderTimerLog();
  }

  function render() {
    renderWrong();
    updateFlashInfo();
    renderStats();
    renderTimerLog();
  }

  SB.register({
    init: init,
    render: render,
    onEnter: function (tab) {
      if (tab === 'wrong') renderWrong();
      if (tab === 'flash') updateFlashInfo();
      if (tab === 'stats') renderStats();
      if (tab === 'timer') { renderTimerLog(); timerDisplay(); }
    }
  });
})();
