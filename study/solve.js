/* ============================================================
   재우의 스터디 뱅크 — 문제 풀기 · 손글씨 패드 · OMR 실전 모의
   ============================================================ */
(function () {
  'use strict';
  const SB = window.SB, $ = SB.$, $$ = SB.$$;

  /* ============================================================
     1) 연습 모드
     ============================================================ */
  let S = null;          // { queue, idx, results, timerOn, qStart, answered, selected }
  let clockId = null;
  let lastIds = [];

  function currentPool() {
    const f = SB.ui.solve;
    const wrongOnly = $('#solveWrongOnly') && $('#solveWrongOnly').checked;
    return SB.state.problems.filter(function (p) {
      if (f.level !== 'all' && p.level !== f.level) return false;
      if (f.subject !== 'all' && p.subject !== f.subject) return false;
      if (f.diff !== 'all' && p.difficulty !== f.diff) return false;
      if (wrongOnly) {
        const w = SB.wrongByPid(p.id);
        if (!((w && !w.resolved) || p.lastResult === 'wrong')) return false;
      }
      return true;
    });
  }

  function updatePoolInfo() {
    const n = currentPool().length;
    if ($('#solvePoolInfo')) $('#solvePoolInfo').textContent = n ? '풀 수 있는 문제 ' + n + '개' : '조건에 맞는 문제가 없어요';
  }

  function startFromSetup() {
    let list = currentPool();
    const order = $('#solveOrder').value;
    if (order === 'new') list = list.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    else if (order === 'wrong') {
      list = SB.shuffle(list).sort(function (a, b) { return (a.lastResult === 'wrong' ? 0 : 1) - (b.lastResult === 'wrong' ? 0 : 1); });
    } else list = SB.shuffle(list);
    const count = Number($('#solveCount').value) || 0;
    if (count > 0) list = list.slice(0, count);
    if (!list.length) { SB.toast('조건에 맞는 문제가 없어요', 'bad'); return; }
    SB.startSolve(list.map(function (p) { return p.id; }));
  }

  SB.startSolve = function (ids) {
    const list = (ids || []).map(SB.problemById).filter(Boolean);
    if (!list.length) { SB.toast('풀 문제가 없어요', 'bad'); return; }
    lastIds = list.map(function (p) { return p.id; });
    S = {
      queue: list, idx: 0, results: [],
      timerOn: !$('#solveTimerOn') || $('#solveTimerOn').checked,
      qStart: Date.now(), answered: false, selected: null
    };
    SB.go('solve');
    switchSub('practice');
    $('#solveSetup').hidden = true;
    $('#solveStage').hidden = false;
    $('#solveResult').hidden = true;
    renderQuestion();
  };

  function stopClock() { if (clockId) { clearInterval(clockId); clockId = null; } }

  function startClock() {
    stopClock();
    clockId = setInterval(function () {
      if (!S || S.answered || !$('#solveClock')) return;
      const sec = (Date.now() - S.qStart) / 1000;
      $('#solveClock').textContent = SB.fmtClock(sec);
      $('#solveClock').style.color = sec >= 180 ? 'var(--bad)' : '';
    }, 500);
  }

  function renderQuestion() {
    const p = S.queue[S.idx];
    if (!p) return finish();
    S.answered = false;
    S.selected = null;
    S.qStart = Date.now();
    $('#solveProgressText').textContent = (S.idx + 1) + ' / ' + S.queue.length;
    $('#solveProgressBar').style.width = Math.round(S.idx / S.queue.length * 100) + '%';
    $('#solveClock').textContent = '00:00';
    $('#solveClock').style.color = '';

    $('#solveSubjectBadge').textContent = p.subject;
    $('#solveSubjectBadge').className = 'badge s-' + SB.subjectCls(p.subject);
    $('#solveUnitBadge').textContent = p.unit || p.level;
    $('#solveDiffBadge').textContent = p.difficulty;
    $('#solveDiffBadge').className = 'badge badge-diff d-' + p.difficulty;
    $('#solveTypeBadge').textContent = p.type === 'mc' ? '객관식' : '주관식';

    $('#solveBody').textContent = p.body;
    const imgWrap = $('#solveImage');
    if (p.image) { imgWrap.hidden = false; imgWrap.querySelector('img').src = p.image; }
    else { imgWrap.hidden = true; imgWrap.querySelector('img').removeAttribute('src'); }

    const chWrap = $('#solveChoices');
    if (p.type === 'mc') {
      chWrap.hidden = false;
      chWrap.innerHTML = (p.choices || []).map(function (c, i) {
        if (!c) return '';
        return '<button class="choice" data-idx="' + i + '"><span class="num">' + SB.choiceMark(i) + '</span><span>' + SB.esc(c) + '</span></button>';
      }).join('');
      $('#solveShort').hidden = true;
    } else {
      chWrap.hidden = true;
      chWrap.innerHTML = '';
      $('#solveShort').hidden = false;
      $('#solveShortInput').value = '';
      $('#solveShortInput').disabled = false;
    }

    $('#solveFeedback').hidden = true;
    $('#solveFeedback').className = 'feedback';
    $('#solveFeedback').innerHTML = '';
    const btn = $('#btnSubmitAnswer');
    btn.textContent = '채점하기';
    btn.disabled = false;
    $('#padPanel').classList.add('pad-hidden');
    if (window.SBPad) window.SBPad.clear(true);
    startClock();
  }

  function markChoices() {
    const p = S.queue[S.idx];
    $$('#solveChoices .choice').forEach(function (b) {
      const i = Number(b.dataset.idx);
      if (i === p.answerIndex) b.classList.add('is-correct');
      else if (i === S.selected) b.classList.add('is-wrong');
      b.disabled = true;
    });
  }

  function correctShort(p, text) {
    const given = SB.normAnswer(text);
    if (!given) return false;
    return String(p.answer || '').split('|').some(function (alt) {
      return SB.normAnswer(alt) === given;
    });
  }

  function grade() {
    if (!S || S.answered) return;
    const p = S.queue[S.idx];
    let ok = false;
    let givenText = '';
    if (p.type === 'mc') {
      if (S.selected == null) { SB.toast('보기를 먼저 선택해 주세요'); return; }
      ok = S.selected === p.answerIndex;
      givenText = (p.choices && p.choices[S.selected]) || '';
      markChoices();
    } else {
      const input = $('#solveShortInput');
      givenText = input.value;
      if (!givenText.trim()) { SB.toast('답을 입력해 주세요'); input.focus(); return; }
      ok = correctShort(p, givenText);
      input.disabled = true;
    }
    const seconds = S.timerOn ? (Date.now() - S.qStart) / 1000 : 0;
    S.answered = true;
    S.results.push({ pid: p.id, correct: ok, seconds: seconds, given: givenText });
    SB.recordAttempt(p, ok, seconds);
    SB.renderBank();

    const fb = $('#solveFeedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
    const answerText = p.type === 'mc'
      ? ('정답 ' + SB.choiceMark(p.answerIndex) + ' ' + (p.choices[p.answerIndex] || ''))
      : ('정답 ' + (p.answer || '').split('|')[0]);
    const wrongNote = SB.wrongByPid(p.id);
    let note = '';
    if (!ok) {
      note = '<div class="feedback-note">📕 오답노트에 자동으로 담았어요 · <button class="link-btn" data-goto="wrong">오답노트 보기</button></div>';
    } else if (wrongNote && wrongNote.resolved) {
      note = '<div class="feedback-note">🎉 오답노트의 이 문제가 <strong>해결됨</strong>으로 바뀌었어요</div>';
    }
    const ttsText = answerText + '. ' + (p.solution || '');
    fb.innerHTML =
      '<div class="feedback-head">' + (ok ? '✅ 정답이에요' : '❌ 아쉬워요') + '</div>' +
      '<p class="ans-line">' + SB.esc(answerText) + '</p>' +
      (p.solution ? '<p style="margin-top:6px">' + SB.esc(p.solution) + '</p>' : '<p class="muted" style="margin-top:6px">등록된 해설이 없어요.</p>') +
      '<div class="feedback-note"><span>' + (S.timerOn ? '이 문항 ' + SB.fmtClock(seconds) : '시간 기록 꺼짐') + '</span>' +
      '<button class="tts-btn" data-tts="' + SB.esc(ttsText) + '">🔊 해설 듣기</button></div>' +
      note;

    $('#btnSubmitAnswer').textContent = (S.idx + 1 >= S.queue.length) ? '결과 보기' : '다음 문제 →';
    stopClock();
    $('#solveProgressBar').style.width = Math.round((S.idx + 1) / S.queue.length * 100) + '%';
  }

  function next() {
    S.idx++;
    if (S.idx >= S.queue.length) return finish();
    renderQuestion();
  }

  function finish() {
    stopClock();
    const total = S.queue.length;
    const correct = S.results.filter(function (r) { return r.correct; }).length;
    const secs = S.results.reduce(function (a, r) { return a + (r.seconds || 0); }, 0);
    $('#solveStage').hidden = true;
    $('#solveResult').hidden = false;
    const rate = total ? Math.round(correct / total * 100) : 0;
    const emoji = rate >= 90 ? '🏆' : rate >= 70 ? '🎉' : rate >= 40 ? '💪' : '🌱';
    $('#resultEmoji').textContent = emoji;
    $('#resultTitle').textContent = rate >= 70 ? '잘했어요!' : '여기서 한 번 더!';
    $('#resultSub').textContent = '정답률 ' + rate + '% · ' + total + '문제 중 ' + correct + '문제 정답';
    const slow = S.results.filter(function (r) { return r.seconds > 0; });
    const avg = slow.length ? slow.reduce(function (a, r) { return a + r.seconds; }, 0) / slow.length : 0;
    $('#resultGrid').innerHTML =
      '<div class="result-box"><strong>' + total + '</strong><span>푼 문제</span></div>' +
      '<div class="result-box"><strong style="color:var(--ok)">' + correct + '</strong><span>정답</span></div>' +
      '<div class="result-box"><strong style="color:var(--bad)">' + (total - correct) + '</strong><span>오답</span></div>' +
      '<div class="result-box"><strong>' + SB.fmtClock(avg) + '</strong><span>문항 평균 시간</span></div>';
    SB.renderAll();
    SB.toast('오답은 오답노트에 담겼어요', 'ok');
  }

  function quitSolve() {
    if (!S) return;
    if (S.results.length && !confirm('지금까지 푼 결과는 저장돼요. 그만둘까요?')) return;
    stopClock();
    S = null;
    $('#solveStage').hidden = true;
    $('#solveSetup').hidden = false;
    $('#solveResult').hidden = true;
    updatePoolInfo();
  }

  function selectSub(sub) {
    $$('#solveSubmodes .submode').forEach(function (b) { b.classList.toggle('is-active', b.dataset.sub === sub); });
    const pr = $('#practiceWrap'), om = $('#omrWrap');
    if (pr) pr.hidden = sub !== 'practice';
    if (om) om.hidden = sub !== 'omr';
    if (sub === 'omr') { stopOmrTimer(); updateOmrPool(); }
    else { stopOmrTimer(); }
  }
  const switchSub = selectSub;

  /* ============================================================
     2) 손글씨 패드
     ============================================================ */
  const Pad = {
    canvas: null, ctx: null, drawing: false, color: '#1a1a1a', width: 3, eraser: false,
    undo: [], last: null, ready: false
  };

  function padResize() {
    if (!Pad.canvas) return;
    const rect = Pad.canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const snapshot = Pad.canvas.width ? Pad.canvas.toDataURL() : '';
    Pad.canvas.width = Math.round(rect.width * dpr);
    Pad.canvas.height = Math.round(rect.height * dpr);
    const ctx = Pad.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (snapshot) {
      const img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = snapshot;
    }
    Pad.ctx = ctx;
  }

  function padPos(e) {
    const r = Pad.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function padStart(e) {
    if (!Pad.ctx) return;
    padPushUndo();
    Pad.drawing = true;
    const p = padPos(e);
    Pad.last = p;
    Pad.ctx.beginPath();
    Pad.ctx.moveTo(p.x, p.y);
    Pad.ctx.lineTo(p.x + 0.01, p.y + 0.01);
    Pad.ctx.strokeStyle = Pad.eraser ? '#000' : Pad.color;
    Pad.ctx.globalCompositeOperation = Pad.eraser ? 'destination-out' : 'source-over';
    Pad.ctx.lineWidth = Pad.eraser ? Pad.width * 3 : Pad.width;
    Pad.ctx.stroke();
    if (Pad.canvas.setPointerCapture && e.pointerId != null) {
      try { Pad.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }
  function padMove(e) {
    if (!Pad.drawing || !Pad.ctx) return;
    const p = padPos(e);
    Pad.ctx.beginPath();
    Pad.ctx.moveTo(Pad.last.x, Pad.last.y);
    Pad.ctx.lineTo(p.x, p.y);
    Pad.ctx.strokeStyle = Pad.eraser ? '#000' : Pad.color;
    Pad.ctx.globalCompositeOperation = Pad.eraser ? 'destination-out' : 'source-over';
    Pad.ctx.lineWidth = Pad.eraser ? Pad.width * 3 : Pad.width;
    Pad.ctx.stroke();
    Pad.last = p;
  }
  function padEnd() { Pad.drawing = false; Pad.ctx && (Pad.ctx.globalCompositeOperation = 'source-over'); }

  function padPushUndo() {
    try {
      Pad.undo.push(Pad.canvas.toDataURL());
      if (Pad.undo.length > 8) Pad.undo.shift();
    } catch (e) {}
  }
  function padClear(silent) {
    if (!Pad.ctx) return;
    const r = Pad.canvas.getBoundingClientRect();
    Pad.ctx.globalCompositeOperation = 'source-over';
    Pad.ctx.fillStyle = '#fff';
    Pad.ctx.fillRect(0, 0, r.width, r.height);
    if (!silent) Pad.undo = [];
  }
  function padUndo() {
    if (!Pad.undo.length) return;
    const data = Pad.undo.pop();
    const img = new Image();
    img.onload = function () {
      const r = Pad.canvas.getBoundingClientRect();
      Pad.ctx.globalCompositeOperation = 'source-over';
      Pad.ctx.clearRect(0, 0, r.width, r.height);
      Pad.ctx.drawImage(img, 0, 0, r.width, r.height);
    };
    img.src = data;
  }
  function padSave() {
    if (!Pad.canvas) return;
    try {
      Pad.canvas.toBlob(function (b) {
        if (!b) { SB.toast('이미지를 만들지 못했어요', 'bad'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = '풀이_' + SB.todayKey() + '.png';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        SB.toast('풀이 이미지를 저장했어요', 'ok');
      }, 'image/png');
    } catch (e) { SB.toast('저장하지 못했어요', 'bad'); }
  }

  window.SBPad = { clear: padClear, resize: padResize };

  /* ============================================================
     3) OMR 실전 모의
     ============================================================ */
  let O = null;
  let omrTimerId = null;

  function omrPool() {
    const level = $('#omrLevel') ? $('#omrLevel').value : 'all';
    const subject = $('#omrSubject') ? $('#omrSubject').value : 'all';
    return SB.state.problems.filter(function (p) {
      if (p.type !== 'mc') return false;
      if (level !== 'all' && p.level !== level) return false;
      if (subject !== 'all' && p.subject !== subject) return false;
      return true;
    });
  }
  function updateOmrPool() {
    const n = omrPool().length;
    if ($('#omrPoolInfo')) $('#omrPoolInfo').textContent = n ? '객관식 ' + n + '문제에서 출제' : '객관식 문제가 없어요';
  }
  function omrMinutes() {
    const v = $('#omrMinutes').value;
    if (v === 'custom') return SB.clamp(Number($('#omrCustomMin').value) || 60, 1, 300);
    return Number(v) || 80;
  }

  function startOmr() {
    let list = omrPool();
    if (!list.length) { SB.toast('객관식 문제를 먼저 등록해 주세요', 'bad'); return; }
    list = SB.shuffle(list);
    if ($('#omrWrongFirst') && $('#omrWrongFirst').checked) {
      list.sort(function (a, b) { return (a.lastResult === 'wrong' ? 0 : 1) - (b.lastResult === 'wrong' ? 0 : 1); });
    }
    const n = SB.clamp(Number($('#omrCount').value) || 20, 1, 50);
    list = list.slice(0, n);
    const mins = omrMinutes();
    O = {
      queue: list, marked: {}, minutes: mins,
      endAt: Date.now() + mins * 60000, totalMs: mins * 60000,
      submitted: false, startedAt: Date.now()
    };
    $('#omrSetup').hidden = true;
    $('#omrResult').hidden = true;
    $('#omrStage').hidden = false;
    $('#omrTitle').textContent = '실전 모의고사 · ' + list.length + '문항';
    $('#omrSub').textContent = 'OMR에 답을 마킹하고 한 번에 채점하세요';
    renderOmrGrid();
    updateOmrMarked();
    startOmrTimer();
    SB.toast('시험 시작! ' + mins + '분', 'ok');
  }

  function renderOmrGrid() {
    const grid = $('#omrGrid');
    grid.innerHTML = O.queue.map(function (p, qi) {
      let bubbles = '';
      for (let i = 0; i < 5; i++) {
        if (!p.choices || !p.choices[i]) continue;
        bubbles += '<button class="omr-b" data-q="' + qi + '" data-a="' + i + '" aria-label="' + (qi + 1) + '번 ' + (i + 1) + '번">' + (i + 1) + '</button>';
      }
      return '<div class="omr-item" data-q="' + qi + '"><span class="omr-no">' + (qi + 1) + '</span><div class="omr-bubbles">' + bubbles + '</div></div>';
    }).join('');
  }

  function updateOmrMarked() {
    const n = Object.keys(O.marked).length;
    if ($('#omrMarked')) $('#omrMarked').textContent = n + ' / ' + O.queue.length + ' 마킹';
  }

  function startOmrTimer() {
    stopOmrTimer();
    omrTimerId = setInterval(function () {
      if (!O || O.submitted) return;
      const left = Math.max(0, O.endAt - Date.now());
      const el = $('#omrTimer');
      if (el) {
        el.textContent = SB.fmtClock(left / 1000);
        el.style.color = left < 5 * 60000 ? 'var(--bad)' : '';
      }
      if (left <= 0) {
        SB.toast('시간 종료! 자동 채점합니다', 'bad');
        gradeOmr(true);
      }
    }, 500);
    const left = Math.max(0, O.endAt - Date.now());
    if ($('#omrTimer')) $('#omrTimer').textContent = SB.fmtClock(left / 1000);
  }
  function stopOmrTimer() { if (omrTimerId) { clearInterval(omrTimerId); omrTimerId = null; } }

  function gradeOmr(auto) {
    if (!O || O.submitted) return;
    const unmarked = O.queue.length - Object.keys(O.marked).length;
    if (!auto && unmarked > 0) {
      if (!confirm('아직 ' + unmarked + '문항이 비어 있어요. 그래도 채점할까요?')) return;
    }
    O.submitted = true;
    stopOmrTimer();
    const totalSec = Math.round((Date.now() - O.startedAt) / 1000);
    const per = Math.round(totalSec / Math.max(1, O.queue.length));
    let correct = 0;
    const units = {};
    O.queue.forEach(function (p, qi) {
      const marked = O.marked[qi];
      const ok = marked === p.answerIndex;
      if (ok) correct++;
      const key = (p.unit || p.subject || '기타').split('·')[0].trim() || '기타';
      if (!units[key]) units[key] = { n: 0, c: 0 };
      units[key].n++; if (ok) units[key].c++;
      SB.recordAttempt(p, ok, per, { mode: 'omr' });
      const item = $('#omrGrid .omr-item[data-q="' + qi + '"]');
      if (item) {
        item.classList.add(ok ? 'is-right' : 'is-wrong');
        if (marked != null) {
          const b = item.querySelector('.omr-b[data-a="' + marked + '"]');
          if (b) b.classList.add('is-marked');
        }
      }
    });
    const rate = Math.round(correct / O.queue.length * 1000) / 10;
    $('#omrEmoji').textContent = rate >= 90 ? '🏆' : rate >= 70 ? '🎉' : rate >= 40 ? '💪' : '🌱';
    $('#omrResultTitle').textContent = '정답률 ' + rate + '%';
    const wrongNos = O.queue.map(function (p, qi) { return O.marked[qi] !== p.answerIndex ? qi + 1 : 0; }).filter(Boolean);
    $('#omrResultSub').textContent = O.queue.length + '문항 중 ' + correct + '문항 정답 · 소요 ' + SB.fmtClock(totalSec) + ' · ' + O.minutes + '분 설정' +
      (wrongNos.length ? ' · 틀린 번호 ' + wrongNos.join(', ') : ' · 전부 정답!');
    $('#omrResultGrid').innerHTML =
      '<div class="result-box"><strong>' + correct + '</strong><span>정답</span></div>' +
      '<div class="result-box"><strong style="color:var(--bad)">' + (O.queue.length - correct) + '</strong><span>오답</span></div>' +
      '<div class="result-box"><strong>' + rate + '%</strong><span>정답률</span></div>' +
      '<div class="result-box"><strong>' + SB.fmtClock(per) + '</strong><span>문항 평균</span></div>';
    $('#omrUnitBars').innerHTML = Object.keys(units).map(function (k) {
      const u = units[k];
      const r = Math.round(u.c / u.n * 100);
      return '<div class="unit-bar-row"><span class="name" title="' + SB.esc(k) + '">' + SB.esc(k) + '</span>' +
        '<div class="track"><div class="fill" style="width:' + r + '%"></div></div><span class="val">' + r + '% (' + u.c + '/' + u.n + ')</span></div>';
    }).join('');
    $('#omrStage').hidden = true;
    $('#omrResult').hidden = false;
    SB.state.sessions.push({ id: SB.uid('s'), type: 'omr', at: new Date().toISOString(), minutes: O.minutes, count: O.queue.length, correct: correct, seconds: totalSec });
    SB.save();
    SB.renderAll();
    SB.toast('채점 완료! 오답은 오답노트에 담겼어요', 'ok');
  }

  function quitOmr() {
    if (!O) return;
    if (!confirm('시험을 그만둘까요? 마킹한 답은 저장되지 않아요.')) return;
    stopOmrTimer();
    O = null;
    $('#omrStage').hidden = true;
    $('#omrResult').hidden = true;
    $('#omrSetup').hidden = false;
  }

  /* ============================================================
     초기화 & 이벤트
     ============================================================ */
  function init() {
    if ($('#btnStartSolve')) $('#btnStartSolve').addEventListener('click', startFromSetup);
    ['solveLevel', 'solveSubject', 'solveDifficulty', 'solveWrongOnly'].forEach(function (id) {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'solveLevel') SB.ui.solve.level = el.value;
        if (id === 'solveSubject') SB.ui.solve.subject = el.value;
        if (id === 'solveDifficulty') SB.ui.solve.diff = el.value;
        updatePoolInfo();
      });
    });

    if ($('#solveChoices')) $('#solveChoices').addEventListener('click', function (e) {
      const b = e.target.closest('.choice');
      if (!b || !S || S.answered) return;
      S.selected = Number(b.dataset.idx);
      $$('#solveChoices .choice').forEach(function (x) { x.classList.toggle('is-selected', x === b); });
    });

    if ($('#btnSubmitAnswer')) $('#btnSubmitAnswer').addEventListener('click', function () {
      if (!S) return;
      if (S.answered) next(); else grade();
    });
    if ($('#btnSolveQuit')) $('#btnSolveQuit').addEventListener('click', quitSolve);
    if ($('#btnSolveClose')) $('#btnSolveClose').addEventListener('click', function () {
      $('#solveResult').hidden = true; $('#solveSetup').hidden = false; updatePoolInfo();
    });
    if ($('#btnSolveAgain')) $('#btnSolveAgain').addEventListener('click', function () {
      if (lastIds.length) SB.startSolve(lastIds);
    });

    $$('#solveSubmodes .submode').forEach(function (b) {
      b.addEventListener('click', function () { selectSub(b.dataset.sub); });
    });

    /* 손글씨 패드 */
    Pad.canvas = $('#padCanvas');
    if (Pad.canvas) {
      Pad.ctx = Pad.canvas.getContext('2d');
      Pad.canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); padStart(e); });
      Pad.canvas.addEventListener('pointermove', function (e) { e.preventDefault(); padMove(e); });
      Pad.canvas.addEventListener('pointerup', padEnd);
      Pad.canvas.addEventListener('pointercancel', padEnd);
      Pad.canvas.addEventListener('pointerleave', padEnd);
      padResize();
    }
    if ($('#btnTogglePad')) $('#btnTogglePad').addEventListener('click', function () {
      const panel = $('#padPanel');
      const show = panel.classList.contains('pad-hidden');
      panel.classList.toggle('pad-hidden', !show);
      this.classList.toggle('is-on', show);
      if (show) setTimeout(function () { padResize(); panel.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 40);
    });
    $$('#padPanel [data-pen]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.pen === 'eraser') {
          Pad.eraser = true;
          $$('#padPanel [data-pen]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
        } else {
          Pad.eraser = false;
          Pad.color = b.dataset.color || '#1a1a1a';
          $$('#padPanel [data-pen]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
        }
      });
    });
    $$('#padPanel [data-width]').forEach(function (b) {
      b.addEventListener('click', function () {
        Pad.width = Number(b.dataset.width) || 3;
        $$('#padPanel [data-width]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
      });
    });
    if ($('#btnPadUndo')) $('#btnPadUndo').addEventListener('click', padUndo);
    if ($('#btnPadClear')) $('#btnPadClear').addEventListener('click', function () { padClear(false); });
    if ($('#btnPadSave')) $('#btnPadSave').addEventListener('click', padSave);
    window.addEventListener('resize', function () {
      if (!$('#padPanel').classList.contains('pad-hidden')) padResize();
    });

    /* OMR */
    if ($('#btnStartOmr')) $('#btnStartOmr').addEventListener('click', startOmr);
    if ($('#omrMinutes')) $('#omrMinutes').addEventListener('change', function () {
      $('#omrCustomWrap').hidden = this.value !== 'custom';
    });
    ['omrLevel', 'omrSubject'].forEach(function (id) {
      const el = $('#' + id);
      if (el) el.addEventListener('change', updateOmrPool);
    });
    if ($('#omrGrid')) $('#omrGrid').addEventListener('click', function (e) {
      const b = e.target.closest('.omr-b');
      if (!b || !O || O.submitted) return;
      const qi = b.dataset.q, ai = Number(b.dataset.a);
      O.marked[qi] = ai;
      const item = b.closest('.omr-item');
      item.querySelectorAll('.omr-b').forEach(function (x) { x.classList.toggle('is-marked', x === b); });
      updateOmrMarked();
    });
    if ($('#btnGradeOmr')) $('#btnGradeOmr').addEventListener('click', function () { gradeOmr(false); });
    if ($('#btnQuitOmr')) $('#btnQuitOmr').addEventListener('click', quitOmr);
    if ($('#btnOmrClose')) $('#btnOmrClose').addEventListener('click', function () {
      O = null;
      $('#omrResult').hidden = true;
      $('#omrSetup').hidden = false;
    });
    if ($('#btnOmrRetryWrong')) $('#btnOmrRetryWrong').addEventListener('click', function () {
      if (!O) return;
      const ids = O.queue.filter(function (p, qi) { return O.marked[qi] !== p.answerIndex; }).map(function (p) { return p.id; });
      if (!ids.length) { SB.toast('틀린 문제가 없어요! 🎉', 'ok'); return; }
      SB.startSolve(ids);
    });

    document.addEventListener('keydown', function (e) {
      if (!S || $('#solveStage').hidden) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (e.key === 'Enter' && e.target.id === 'solveShortInput') {
          e.preventDefault();
          if (S.answered) next(); else grade();
        }
        return;
      }
      if (S.answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); return; }
      if (!S.answered && /^[1-5]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const b = $('#solveChoices .choice[data-idx="' + idx + '"]');
        if (b) { b.click(); }
      }
      if (e.key === 'Enter') { e.preventDefault(); grade(); }
    });
  }

  function render() {
    if (!S) { $('#solveStage').hidden = true; $('#solveSetup').hidden = false; }
    updatePoolInfo();
    updateOmrPool();
  }

  SB.register({
    init: init,
    render: render,
    onEnter: function (tab) {
      if (tab === 'solve') {
        updatePoolInfo();
        updateOmrPool();
        if (SB.ui.solve.level === 'all' && $('#solveLevel')) $('#solveLevel').value = 'all';
      }
    }
  });

  /* 외부에서 오답노트 → 다시 풀기 등에서 사용 */
  SB.gradeOmr = gradeOmr;
})();
