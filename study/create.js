/* ============================================================
   재우의 스터디 뱅크 — 변형 문제 · 시험지 제작 · PDF 뷰어
   ============================================================ */
(function () {
  'use strict';
  const SB = window.SB, $ = SB.$, $$ = SB.$$;

  /* ============================================================
     1) 변형 문제 생성기
     ============================================================ */
  let V = null; // 마지막 변형 결과

  function refreshVariantSources() {
    const sel = $('#variantSource');
    if (!sel) return;
    const cur = sel.value;
    let html = '<option value="manual">직접 입력</option>';
    const groups = {};
    SB.state.problems.forEach(function (p) {
      if (!groups[p.level]) groups[p.level] = [];
      groups[p.level].push(p);
    });
    SB.D.LEVELS.forEach(function (l) {
      const arr = groups[l.key];
      if (!arr || !arr.length) return;
      html += '<optgroup label="' + SB.esc(l.label) + '">';
      arr.forEach(function (p) {
        const label = p.subject + ' · ' + (p.body || '').replace(/\s+/g, ' ').slice(0, 34);
        html += '<option value="' + p.id + '">' + SB.esc(label) + '</option>';
      });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
    if (cur) sel.value = cur;
  }
  SB.refreshVariantSources = refreshVariantSources;

  function fillVariantFrom(p) {
    if (!p) return;
    $('#variantBody').value = p.body || '';
    $('#variantChoices').value = (p.choices || []).filter(Boolean).join('\n');
    $('#variantAnswer').value = p.type === 'mc'
      ? (SB.choiceMark(p.answerIndex) + ' ' + ((p.choices || [])[p.answerIndex] || ''))
      : String(p.answer || '').split('|')[0];
    $('#variantSubject').value = p.subject || '수학';
    $('#variantLevel').value = p.level || '고등';
    if (p.choices && p.choices.length) {
      const mode = p.subject === '영어' ? 'blank' : 'shuffle';
      $('#variantMode').value = mode;
    } else if (p.subject === '영어') $('#variantMode').value = 'blank';
    else $('#variantMode').value = 'number';
    updateVariantHint();
  }

  SB.openVariantWith = function (p) {
    if (!p) return;
    SB.go('variant');
    refreshVariantSources();
    $('#variantSource').value = p.id;
    fillVariantFrom(p);
    $('#variantResultPanel').hidden = true;
    setTimeout(function () { $('#btnGenerateVariant').focus(); }, 60);
    SB.toast('변형 방식을 고르고 생성해 보세요');
  };

  function parseAnswerIndex(ans, choices) {
    const t = String(ans || '').trim();
    if (!t) return -1;
    const marks = '①②③④⑤';
    if (marks.indexOf(t[0]) >= 0) return marks.indexOf(t[0]);
    const m = t.match(/^([1-5])[\s.)]?/);
    if (m) return Number(m[1]) - 1;
    const norm = function (s) { return String(s || '').replace(/^[①②③④⑤]\s*/, '').replace(/\s+/g, ''); };
    const idx = choices.findIndex(function (c) { return norm(c) === norm(t); });
    if (idx >= 0) return idx;
    const loose = choices.findIndex(function (c) { return norm(c).indexOf(norm(t)) >= 0 && norm(t).length > 1; });
    return loose;
  }

  function updateVariantHint() {
    const mode = $('#variantMode').value;
    const map = {
      number: '숫자·계수를 바꿔 새 문제를 만들어요. 이차함수는 정답까지 자동 계산!',
      blank: '영어 문장의 핵심 단어를 빈칸으로 뚫고 보기 단어를 섞어요.',
      shuffle: '객관식 보기 1~5번 순서를 무작위로 바꿔 암기를 막아요.'
    };
    if ($('#variantHint')) $('#variantHint').textContent = map[mode] || '';
  }

  /* --- 숫자 변형 --- */
  function intOf(s) {
    const t = String(s || '').replace(/\s+/g, '');
    if (t === '' || t === '+') return 1;
    if (t === '-') return -1;
    return Number(t.replace(/x/gi, '')) || 0;
  }
  function signed(n) { return n >= 0 ? '+ ' + n : '- ' + Math.abs(n); }

  function numberVariant(body) {
    const quad = body.match(/f\s*\(\s*x\s*\)\s*=\s*([+-]?\s*\d*)\s*x\s*(?:²|\^\s*2|\*\*\s*2)\s*([+-]\s*\d+)\s*x\s*([+-]\s*\d+)/);
    const x0m = body.match(/f'\s*\(\s*(-?\d+)\s*\)/);
    if (quad) {
      const a = intOf(quad[1]);
      const x0 = x0m ? Number(x0m[1]) : 2;
      if (a !== 0) {
        let na = a;
        while (na === a || na === 0) na = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 4));
        let nb = Number(quad[2].replace(/\s/g, ''));
        const oldB = nb;
        while (nb === oldB || nb === 0) nb = (Math.random() < 0.5 ? 1 : -1) * (2 + Math.floor(Math.random() * 8));
        let nc = Number(quad[3].replace(/\s/g, ''));
        while (nc === Number(quad[3].replace(/\s/g, ''))) nc = Math.floor(Math.random() * 19) - 9;
        const aStr = na === 1 ? '' : (na === -1 ? '-' : String(na));
        const bodyOut = '함수 f(x) = ' + aStr + 'x² ' + signed(nb) + 'x ' + signed(nc) + ' 에 대하여 f\'(' + x0 + ')의 값을 구하시오.';
        return {
          body: bodyOut,
          choices: [],
          answer: String(2 * na * x0 + nb),
          note: '이차함수 계수를 바꾸고 f\'(x) = 2ax + b 로 정답을 자동 계산했어요.\n' +
            '바뀐 계수: a=' + na + ', b=' + nb + ', c=' + nc + ' (원래 a=' + a + ', b=' + oldB + ')\n' +
            '계산: f\'(' + x0 + ') = 2×' + na + '×' + x0 + ' + (' + nb + ') = ' + (2 * na * x0 + nb)
        };
      }
    }
    /* 일반 숫자 변형 */
    const changed = [];
    const out = body.replace(/(\d+(?:\.\d+)?)/g, function (m, _g, offset, str) {
      const before = str.slice(Math.max(0, offset - 2), offset);
      const after = str.slice(offset + m.length, offset + m.length + 1);
      if (before.indexOf('^') >= 0) return m;
      if (after === '/' || before.slice(-1) === '/') return m;
      if (m.length >= 4) return m; /* 연도·큰 수는 보존 */
      const isFloat = m.indexOf('.') >= 0;
      const n = Number(m);
      let delta = 0;
      while (!delta) delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
      let nv = isFloat ? Math.round((n + delta * 0.5) * 10) / 10 : n + delta;
      if (n > 0 && nv <= 0) nv = Math.abs(nv) + 1;
      if (n < 0 && nv >= 0) nv = -Math.abs(nv) - 1;
      changed.push(m + '→' + nv);
      return String(nv);
    });
    if (!changed.length) {
      return { body: body, choices: [], answer: '', note: '바꿀 숫자를 찾지 못했어요. 문제에 숫자를 넣거나 영어는 빈칸 모드를 써 보세요.' };
    }
    return {
      body: out,
      choices: [],
      answer: '',
      note: changed.length + '곳의 숫자를 바꿨어요 (' + changed.slice(0, 8).join(', ') + ').\n숫자가 바뀌면 정답도 달라지니 다시 계산해서 정답 칸에 적어 주세요.'
    };
  }

  /* --- 빈칸 변형 --- */
  const STOP = ('the a an and or but if because that this these those with without from into about over under is are was were be been being have has had do does did can could may might must will would should of to in on at for as by not no it its they them their we our you your he she his her i my me more most such than then there here what which who whom whose when where why how all any both each few many some own same so too very just also even still yet however therefore thus although though while during before after between among through within').split(' ');

  function blankVariant(body) {
    const re = /[A-Za-z][A-Za-z'’-]{3,}/g;
    const found = {};
    let m;
    while ((m = re.exec(body))) {
      const w = m[0];
      if (STOP.indexOf(w.toLowerCase()) >= 0) continue;
      if (!found[w.toLowerCase()]) found[w.toLowerCase()] = w;
    }
    let uniq = Object.keys(found);
    if (uniq.length < 2) {
      const short = body.match(/[A-Za-z]{2,}/g) || [];
      uniq = Array.from(new Set(short.map(function (w) { return w.toLowerCase(); })));
    }
    if (uniq.length < 2) {
      return { body: body, choices: [], answer: '', note: '영어 단어를 2개 이상 찾지 못했어요. 영어 지문을 넣어 주세요.' };
    }
    const n = SB.clamp(Math.round(uniq.length * 0.35), 2, 6);
    const chosen = SB.shuffle(uniq).slice(0, n);
    let out = body;
    chosen.forEach(function (w) {
      const rx = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      out = out.replace(rx, '_____');
    });
    const bank = SB.shuffle(chosen.map(function (w) { return found[w] || w; }));
    const ordered = chosen.map(function (w) { return found[w] || w; });
    const answer = ordered.join(', ');
    return {
      body: out + '\n\n<보기> ' + bank.join(' / '),
      choices: [],
      answer: answer,
      note: '빈칸 ' + n + '개를 만들고 보기 단어를 섞었어요.\n정답 순서: ' + answer + '\n(빈칸은 문장에 나온 순서대로 채점하세요.)'
    };
  }

  /* --- 보기 순서 섞기 --- */
  function shuffleVariant(body, choices, answerInput) {
    const list = choices.filter(function (c) { return String(c || '').trim(); });
    if (list.length < 2) {
      return { body: body, choices: [], answer: '', note: '객관식 보기가 2개 이상 있어야 순서를 섞을 수 있어요.' };
    }
    const keep = {};
    const marked = list.map(function (c, i) { keep[c] = i; return { text: String(c).replace(/^[①②③④⑤]\s*/, ''), old: keep[c] }; });
    const correctOld = parseAnswerIndex(answerInput, list);
    const order = SB.shuffle(marked.map(function (_, i) { return i; }));
    const newChoices = order.map(function (i) { return marked[i].text; });
    const newAns = correctOld >= 0 ? order.indexOf(correctOld) : -1;
    return {
      body: body,
      choices: newChoices,
      answer: newAns >= 0 ? (SB.choiceMark(newAns) + ' ' + newChoices[newAns]) : '',
      answerIndex: newAns,
      note: newAns >= 0
        ? '보기 순서를 섞었어요. 정답은 ' + SB.choiceMark(newAns) + '번으로 바뀌었습니다.'
        : '보기 순서를 섞었어요. 정답 번호를 확인해 정답 칸에 적어 주세요.'
    };
  }

  function generateVariant() {
    const mode = $('#variantMode').value;
    const body = $('#variantBody').value.trim();
    if (!body) { SB.toast('문제 본문을 먼저 입력해 주세요', 'bad'); $('#variantBody').focus(); return; }
    const choices = $('#variantChoices').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    const answer = $('#variantAnswer').value.trim();
    let r;
    if (mode === 'number') r = numberVariant(body);
    else if (mode === 'blank') r = blankVariant(body);
    else r = shuffleVariant(body, choices, answer);
    V = Object.assign({
      mode: mode,
      level: $('#variantLevel').value,
      subject: $('#variantSubject').value,
      body: body,
      choices: [],
      answer: '',
      answerIndex: -1,
      note: ''
    }, r);

    const panel = $('#variantResultPanel');
    panel.hidden = false;
    const labels = { number: '🔢 숫자 변형', blank: '🔤 빈칸 변형', shuffle: '🔀 보기 섞기' };
    $('#variantModeBadge').textContent = labels[mode] || '';
    $('#variantOutBody').textContent = V.body;
    const chBox = $('#variantOutChoices');
    const chLabel = $('#variantOutChoicesLabel');
    if (V.choices && V.choices.length) {
      chBox.innerHTML = V.choices.map(function (c, i) { return '<li>' + SB.choiceMark(i) + ' ' + SB.esc(c) + '</li>'; }).join('');
      chBox.hidden = false;
      chLabel.hidden = false;
    } else {
      chBox.innerHTML = '';
      chBox.hidden = true;
      chLabel.hidden = true;
    }
    const ansBox = $('#variantOutAnswer');
    if (V.answer) {
      ansBox.className = 'answer-box';
      ansBox.textContent = '정답: ' + V.answer;
    } else {
      ansBox.className = 'answer-box unknown';
      ansBox.textContent = '정답 미확정 — 저장할 때 직접 입력해 주세요';
    }
    $('#variantOutNote').textContent = V.note || '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function saveVariant() {
    if (!V) return;
    const base = {
      level: V.level,
      subject: V.subject,
      unit: '변형 문제',
      difficulty: '중',
      type: (V.choices && V.choices.length) ? 'mc' : 'short',
      body: V.body,
      choices: V.choices || [],
      answerIndex: V.answerIndex >= 0 ? V.answerIndex : 0,
      answer: V.answer && V.choices.length === 0 ? V.answer : '',
      solution: V.note || '',
      source: '변형 생성기',
      tags: ['변형', V.mode]
    };
    if (V.choices && V.choices.length && V.answerIndex >= 0) {
      base.answer = '';
      const p = Object.assign({ id: SB.uid('q'), createdAt: new Date().toISOString() }, base);
      SB.state.problems.unshift(p);
      SB.save(); SB.renderAll(); refreshVariantSources();
      SB.toast('변형 문제를 문제은행에 저장했어요', 'ok');
      return;
    }
    if (!V.answer) {
      SB.openProblemModal(base);
      SB.toast('정답만 채워서 저장해 주세요');
      return;
    }
    const p = Object.assign({ id: SB.uid('q'), createdAt: new Date().toISOString() }, base);
    SB.state.problems.unshift(p);
    SB.save(); SB.renderAll(); refreshVariantSources();
    SB.toast('변형 문제를 문제은행에 저장했어요', 'ok');
  }

  function copyVariant() {
    if (!V) return;
    let text = V.body;
    if (V.choices && V.choices.length) text += '\n\n' + V.choices.map(function (c, i) { return SB.choiceMark(i) + ' ' + c; }).join('\n');
    if (V.answer) text += '\n\n정답: ' + V.answer;
    if (V.note) text += '\n\n' + V.note;
    const done = function () { SB.toast('복사했어요', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { SB.toast('복사하지 못했어요', 'bad'); }
    ta.remove();
  }

  /* ============================================================
     2) 시험지 제작기
     ============================================================ */
  function examSelectedProblems() {
    const ids = SB.ui.exam.selected || new Set();
    return Array.from(ids).map(SB.problemById).filter(Boolean);
  }

  function renderExamPick() {
    const box = $('#examPickList');
    if (!box) return;
    const sel = SB.ui.exam.selected;
    box.innerHTML = SB.state.problems.map(function (p) {
      const on = sel.has(p.id);
      return '<label class="pick-item' + (on ? ' is-picked' : '') + '">' +
        '<input type="checkbox" data-pick="' + p.id + '"' + (on ? ' checked' : '') + ' />' +
        '<span class="pick-body">' + SB.subjectBadge(p) + ' <strong>' + SB.esc(p.level) + '</strong> ' + SB.esc((p.body || '').replace(/\s+/g, ' ')) +
        '<span class="pick-meta">' + SB.esc(p.unit || '') + ' · ' + (p.type === 'mc' ? '객관식' : '주관식') + '</span></span></label>';
    }).join('');
    if ($('#examPickCount')) $('#examPickCount').textContent = sel.size + '개';
    renderExamPreview();
  }

  function paperHTML() {
    const list = examSelectedProblems();
    const title = ($('#examTitle') && $('#examTitle').value.trim()) || '재우의 스터디 뱅크 모의고사';
    const subtitle = ($('#examSubtitle') && $('#examSubtitle').value.trim()) || '';
    const layout = $('#examLayout') ? $('#examLayout').value : '1';
    const ansMode = $('#examAnswers') ? $('#examAnswers').value : 'separate';
    const nameLine = !$('#examNameLine') || $('#examNameLine').checked;
    const showPoint = !$('#examPointLine') || $('#examPointLine').checked;
    const point = 4;
    const total = list.length * point;

    const qs = list.map(function (p, i) {
      const choices = (p.choices || []).map(function (c, ci) {
        return c ? '<li>' + SB.choiceMark(ci) + ' ' + SB.esc(c) + '</li>' : '';
      }).join('');
      return '<li class="q">' +
        '<div class="q-head"><span class="q-no">' + (i + 1) + '.</span>' +
        '<span class="q-text">' + SB.esc(p.body) + (p.image ? '\n<img class="q-img" src="' + p.image + '" alt="문제 사진" />' : '') + '</span>' +
        (showPoint ? '<span class="q-pt">[' + point + '점]</span>' : '') + '</div>' +
        (choices ? '<ol class="q-choices">' + choices + '</ol>' : '') +
        '</li>';
    }).join('');

    let answerHTML = '';
    if (ansMode !== 'none' && list.length) {
      const cells = list.map(function (p, i) {
        const a = p.type === 'mc' ? SB.choiceMark(p.answerIndex) : SB.esc(String(p.answer || '').split('|')[0]);
        return '<td class="qn">' + (i + 1) + '</td><td>' + a + '</td>';
      });
      let rows = '';
      for (let i = 0; i < cells.length; i += 5) rows += '<tr>' + cells.slice(i, i + 5).join('') + '</tr>';
      const sols = list.map(function (p, i) {
        const a = p.type === 'mc' ? SB.choiceMark(p.answerIndex) + ' ' + ((p.choices || [])[p.answerIndex] || '') : String(p.answer || '').split('|')[0];
        return '<div class="sol-item"><strong>' + (i + 1) + '. 정답</strong> ' + SB.esc(a) +
          (p.solution ? '<br /><strong>해설</strong> ' + SB.esc(p.solution) : '') + '</div>';
      }).join('');
      answerHTML = '<section class="answer-sheet"><h2>정답 및 해설</h2>' +
        '<table class="ans-table">' + rows + '</table><div class="solutions">' + sols + '</div></section>';
    }

    return '<div class="paper" data-layout="' + layout + '">' +
      '<div class="paper-head"><h1>' + SB.esc(title) + '</h1>' + (subtitle ? '<p>' + SB.esc(subtitle) + '</p>' : '') + '</div>' +
      (nameLine ? '<div class="paper-info"><span>이름: ____________________</span><span>반 / 번호: ______________</span><span>점수: ______ / ' + total + '</span></div>' : '') +
      '<div class="paper-meta"><span>총 ' + list.length + '문항 · 문항당 ' + point + '점 · 배점 ' + total + '점</span><span>' + SB.todayKey().replace(/-/g, '.') + '</span></div>' +
      (list.length ? '<ol class="q-list">' + qs + '</ol>' : '<p style="text-align:center;color:#666;padding:20px 0">문제를 담으면 여기에 시험지가 만들어집니다.</p>') +
      answerHTML + '</div>';
  }

  function renderExamPreview() {
    const el = $('#examMiniPreview');
    if (!el) return;
    el.innerHTML = paperHTML();
  }

  function examRandom() {
    const level = $('#examRandomLevel').value;
    const subject = $('#examRandomSubject').value;
    let pool = SB.state.problems.filter(function (p) {
      if (level !== 'all' && p.level !== level) return false;
      if (subject !== 'all' && p.subject !== subject) return false;
      return true;
    });
    if (!pool.length) { SB.toast('조건에 맞는 문제가 없어요', 'bad'); return; }
    const wrongFirst = $('#examRandomWrong') && $('#examRandomWrong').checked;
    pool = SB.shuffle(pool);
    if (wrongFirst) pool.sort(function (a, b) { return (a.lastResult === 'wrong' ? 0 : 1) - (b.lastResult === 'wrong' ? 0 : 1); });
    const n = SB.clamp(Number($('#examRandomCount').value) || 10, 1, 50);
    SB.ui.exam.selected = new Set(pool.slice(0, n).map(function (p) { return p.id; }));
    renderExamPick();
    SB.toast(n + '문제를 담았어요', 'ok');
  }

  function printExam() {
    if (!examSelectedProblems().length) { SB.toast('시험지에 담을 문제를 먼저 골라 주세요', 'bad'); return; }
    renderExamPreview();
    SB.printHTML(paperHTML());
  }

  /* ============================================================
     3) PDF 뷰어 (텍스트 추출 · 페이지 인쇄 · 변형/저장 연결)
     ============================================================ */
  const PDF = {
    doc: null, pages: [], active: 0, name: '', url: '', fallback: false,
    buf: null, cropMode: false, crop: null, splitItems: []
  };
  let pdfjsPromise = null;
  let pdflibPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;
    const urls = [
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
    ];
    pdfjsPromise = new Promise(function (resolve) {
      let i = 0;
      function next() {
        if (i >= urls.length) return resolve(null);
        const src = urls[i++];
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = function () {
          if (window.pdfjsLib) {
            try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = src.replace('pdf.min.js', 'pdf.worker.min.js'); } catch (e) {}
            resolve(window.pdfjsLib);
          } else next();
        };
        s.onerror = function () { s.remove(); next(); };
        document.head.appendChild(s);
      }
      next();
    });
    return pdfjsPromise;
  }

  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (pdflibPromise) return pdflibPromise;
    const urls = [
      'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
      'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
    ];
    pdflibPromise = new Promise(function (resolve) {
      let i = 0;
      function next() {
        if (i >= urls.length) { pdflibPromise = null; return resolve(null); }
        const s = document.createElement('script');
        s.src = urls[i++];
        s.async = true;
        s.onload = function () { if (window.PDFLib) resolve(window.PDFLib); else next(); };
        s.onerror = function () { s.remove(); next(); };
        document.head.appendChild(s);
      }
      next();
    });
    return pdflibPromise;
  }

  function joinTextItems(items) {
    let out = '', prev = null;
    items.forEach(function (it) {
      const str = it.str || '';
      if (it.hasEOL) { out += '\n'; prev = null; return; }
      if (prev && it.transform) {
        const gap = it.transform[4] - (prev.x + prev.w);
        const dy = Math.abs(it.transform[5] - prev.y);
        if (dy > 4) out += '\n';
        else if (gap > 0.8 && out.slice(-1) !== ' ' && str !== ' ') out += ' ';
      }
      out += str;
      prev = it.transform ? { x: it.transform[4], y: it.transform[5], w: it.width || 0 } : null;
    });
    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  }

  function pdfMessage(msg) {
    const el = $('#pdfEmpty');
    if (el) { el.hidden = false; el.textContent = msg; }
  }

  async function openPdf(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      SB.toast('PDF 파일만 열 수 있어요', 'bad'); return;
    }
    PDF.name = file.name;
    if (PDF.url) { try { URL.revokeObjectURL(PDF.url); } catch (e) {} PDF.url = ''; }
    PDF.pages = []; PDF.active = 0; PDF.fallback = false; PDF.buf = null;
    PDF.crop = null; PDF.splitItems = [];
    setCropMode(false);
    if ($('#pdfCropPanel')) $('#pdfCropPanel').hidden = true;
    if ($('#pdfSplitPanel')) $('#pdfSplitPanel').hidden = true;
    $('#pdfPages').innerHTML = '';
    $('#pdfPageDetail').hidden = true;
    if ($('#pdfName')) $('#pdfName').textContent = file.name;
    if ($('#pdfToolbar')) $('#pdfToolbar').hidden = false;
    pdfMessage('PDF를 불러오는 중…');
    SB.toast('PDF를 여는 중이에요');

    const lib = await loadPdfJs();
    if (!lib) { fallbackEmbed(file, 'PDF.js를 불러오지 못해 브라우저 기본 뷰어로 열었어요. 페이지 선택 인쇄는 제한됩니다.'); return; }
    try {
      const buf = await file.arrayBuffer();
      PDF.buf = buf;
      const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
      PDF.doc = doc;
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, Math.max(0.6, 340 / base.width));
        const vp = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const image = canvas.toDataURL('image/jpeg', 0.82);
        let text = '';
        try {
          const tc = await page.getTextContent();
          text = joinTextItems(tc.items);
        } catch (e) { text = ''; }
        const noteKey = PDF.name + '::' + n;
        const savedNote = (SB.state.pdfNotes && SB.state.pdfNotes[noteKey]) || {};
        PDF.pages.push({ num: n, selected: false, memo: savedNote.memo || '', tag: savedNote.tag || '', text: text, image: image });
        if (n % 3 === 0 || n === doc.numPages) pdfMessage('PDF 불러오는 중… ' + n + ' / ' + doc.numPages);
      }
      if (!PDF.pages.length) { fallbackEmbed(file, '페이지를 읽지 못했어요.'); return; }
      renderPdfPages();
      selectPdfPage(1, true);
      pdfMessage('');
      $('#pdfEmpty').hidden = true;
      SB.toast(doc.numPages + '페이지를 열었어요', 'ok');
    } catch (e) {
      fallbackEmbed(file, 'PDF를 해석하지 못했어요. 브라우저 기본 뷰어로 엽니다.');
    }
  }

  function fallbackEmbed(file, msg) {
    PDF.fallback = true;
    PDF.buf = null;
    PDF.url = URL.createObjectURL(file);
    if ($('#pdfPages')) {
      $('#pdfPages').innerHTML = '<div style="grid-column:1/-1">' +
        '<p class="muted small" style="margin:0 0 8px">' + SB.esc(msg) + '</p>' +
        '<embed class="pdf-fallback" type="application/pdf" src="' + PDF.url + '" /></div>';
    }
    pdfMessage(msg);
    $('#pdfEmpty').hidden = false;
    $('#pdfPageDetail').hidden = true;
  }

  function renderPdfPages() {
    const box = $('#pdfPages');
    if (!box) return;
    box.innerHTML = PDF.pages.map(function (pg) {
      return '<div class="pdf-page' + (pg.selected ? ' is-picked' : '') + '" data-num="' + pg.num + '">' +
        '<div class="pdf-page-top"><input type="checkbox" data-pdf-sel="' + pg.num + '"' + (pg.selected ? ' checked' : '') + ' aria-label="' + pg.num + '페이지 선택" />' +
        '<span>' + pg.num + '페이지</span><span class="muted" style="margin-left:auto;font-weight:600">' + (pg.text ? '텍스트 ' + pg.text.length + '자' : '텍스트 없음') + '</span></div>' +
        '<div class="pdf-canvas"><img src="' + pg.image + '" alt="' + pg.num + '페이지" loading="lazy" draggable="false" /></div>' +
        '<div class="pdf-page-memo">' +
        '<input type="text" data-pdf-memo="' + pg.num + '" placeholder="이 페이지 메모" value="' + SB.esc(pg.memo) + '" />' +
        '<select data-pdf-tag="' + pg.num + '">' +
        ['', '⭐ 중요', '❌ 오답', '🔁 복습', '📌 시험 범위'].map(function (t) {
          return '<option value="' + SB.esc(t) + '"' + (pg.tag === t ? ' selected' : '') + '>' + (t || '태그 없음') + '</option>';
        }).join('') +
        '</select></div></div>';
    }).join('');
  }

  function selectPdfPage(n, silent) {
    const pg = PDF.pages.find(function (p) { return p.num === n; });
    if (!pg) return;
    PDF.active = n;
    const panel = $('#pdfPageDetail');
    panel.hidden = false;
    $('#pdfDetailNo').textContent = n + '페이지 · ' + (pg.text ? '텍스트 ' + pg.text.length + '자' : '추출된 텍스트 없음(스캔본)');
    $('#pdfText').value = pg.text || '';
    renderPdfSplit(pg);
    if (!silent) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $$('.pdf-page').forEach(function (el) { el.style.outline = el.dataset.num === String(n) ? '2px solid var(--brand)' : ''; });
  }

  function activePdfPage() {
    return PDF.pages.find(function (p) { return p.num === PDF.active; }) || PDF.pages[0] || null;
  }

  function printPdfPages() {
    if (PDF.fallback) { SB.toast('이 PDF는 페이지 선택 인쇄를 지원하지 않아요', 'bad'); return; }
    let pages = PDF.pages.filter(function (p) { return p.selected; });
    if (!pages.length) {
      const a = activePdfPage();
      if (!a) { SB.toast('페이지를 먼저 선택해 주세요', 'bad'); return; }
      pages = [a];
    }
    const html = '<div class="paper pdf-paper">' + pages.map(function (p) {
      return '<div class="pdf-print-page"><img src="' + p.image + '" alt="' + p.num + '페이지" />' +
        (p.memo || p.tag ? '<div class="pmemo">' + SB.esc(p.tag || '') + ' ' + SB.esc(p.memo || '') + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    SB.printHTML(html);
  }

  function pdfTextFor(pg) {
    const edited = $('#pdfText') && PDF.active === pg.num ? $('#pdfText').value.trim() : '';
    return edited || pg.text || '';
  }

  function pdfMakeVariant() {
    const pg = activePdfPage();
    if (!pg) { SB.toast('PDF를 먼저 열어 주세요', 'bad'); return; }
    const text = pdfTextFor(pg);
    if (!text) {
      SB.toast('이 페이지는 텍스트가 없어요. 스캔본은 문제은행 저장을 이용해 주세요', 'bad');
      return;
    }
    refreshVariantSources();
    $('#variantSource').value = 'manual';
    $('#variantBody').value = text.slice(0, 1600);
    $('#variantChoices').value = '';
    $('#variantAnswer').value = '';
    $('#variantMode').value = /[A-Za-z]/.test(text) && !/[가-힣]/.test(text) ? 'blank' : 'number';
    updateVariantHint();
    SB.go('variant');
    $('#variantResultPanel').hidden = true;
    SB.toast('PDF ' + pg.num + '페이지 텍스트를 가져왔어요', 'ok');
    setTimeout(function () { $('#variantBody').focus(); }, 100);
  }

  function pdfSaveProblem() {
    const pg = activePdfPage();
    if (!pg) { SB.toast('PDF를 먼저 열어 주세요', 'bad'); return; }
    const text = pdfTextFor(pg);
    let body = text;
    if (body.length > 1400) body = body.slice(0, 1400) + ' …';
    if (!body) body = PDF.name + ' ' + pg.num + '페이지 문제';
    const p = {
      id: SB.uid('q'),
      level: '고등',
      subject: '기타',
      unit: 'PDF · ' + PDF.name.slice(0, 20) + ' p.' + pg.num,
      difficulty: '중',
      type: 'short',
      body: body,
      choices: [],
      answerIndex: 0,
      answer: '',
      image: pg.image,
      source: PDF.name + ' p.' + pg.num,
      tags: ['PDF', pg.tag || ''].filter(Boolean),
      solution: pg.memo || 'PDF ' + pg.num + '페이지에서 저장',
      createdAt: new Date().toISOString()
    };
    SB.state.problems.unshift(p);
    SB.save(); SB.renderAll(); refreshVariantSources();
    SB.toast('PDF ' + pg.num + '페이지를 문제은행에 저장했어요 · 정답은 수정에서 채워 주세요', 'ok');
  }

  /* ============================================================
     3-1) 문항 자동 분리 · 선택 저장
     ============================================================ */
  const Q_MARKS = [
    /^\[\s*(?:문제\s*)?(\d{1,2})\s*\]\s*/,     /* [1] · [문제 1] */
    /^문제\s*(\d{1,2})\s*[.)]?\s*/,               /* 문제 1 · 문제 1. */
    /^\(\s*(\d{1,2})\s*\)\s*/,                    /* (1) */
    /^(\d{1,2})\s*[.)]\s*(?!\d)/                  /* 1. · 01. · 2) */
  ];

  function matchQuestionMark(line) {
    const t = String(line == null ? '' : line).trim();
    if (!t) return null;
    for (let i = 0; i < Q_MARKS.length; i++) {
      const m = t.match(Q_MARKS[i]);
      if (m) return { num: Number(m[1]), label: m[0].trim() };
    }
    return null;
  }

  /* 페이지 텍스트를 문제 번호 기준으로 나눈다. 번호가 안 잡히면 전체를 1문항으로. */
  function splitPdfText(text) {
    const src = String(text || '').replace(/\r/g, '');
    if (!src.trim()) return [];
    const lines = src.split('\n');
    const marks = [];
    let last = -1;
    lines.forEach(function (line, i) {
      const m = matchQuestionMark(line);
      if (!m) return;
      if (marks.length && m.num <= last) return;   /* 본문 안의 번호·보기 번호는 무시 */
      marks.push({ line: i, num: m.num, label: m.label });
      last = m.num;
    });
    if (marks.length < 2) {
      const head = marks.length ? marks[0].label : '';
      return [{ num: marks.length ? marks[0].num : 0, label: head, body: src.trim(), single: true }];
    }
    const items = [];
    const preface = lines.slice(0, marks[0].line).join('\n').trim();
    marks.forEach(function (mk, idx) {
      const end = idx + 1 < marks.length ? marks[idx + 1].line : lines.length;
      let body = lines.slice(mk.line, end).join('\n').trim();
      if (idx === 0 && preface) body = preface + '\n\n' + body;
      if (body) items.push({ num: mk.num, label: mk.label, body: body });
    });
    return items.length ? items : [{ num: 0, label: '', body: src.trim(), single: true }];
  }

  function makePdfProblem(body, num, extra) {
    const text = String(body || '').trim();
    const short = text.length > 1400 ? text.slice(0, 1400) + ' …' : text;
    const opt = extra || {};
    return {
      id: SB.uid('q'),
      level: '고등',
      subject: '기타',
      unit: 'PDF · ' + PDF.name.slice(0, 20) + ' p.' + num,
      difficulty: '중',
      type: 'short',
      body: short || (PDF.name + ' ' + num + '페이지 문제'),
      choices: [],
      answerIndex: 0,
      answer: '',
      image: opt.image || '',
      source: PDF.name + ' p.' + num,
      tags: opt.tags || ['PDF', '문항분리'],
      solution: opt.solution || ('PDF ' + num + '페이지에서 자동 분리 저장'),
      createdAt: new Date().toISOString()
    };
  }

  function commitPdfProblems(list) {
    if (!list.length) return 0;
    /* 1번이 목록 맨 위에 오도록 거꾸로 담는다 */
    for (let i = list.length - 1; i >= 0; i--) SB.state.problems.unshift(list[i]);
    SB.save(); SB.renderAll(); refreshVariantSources();
    return list.length;
  }

  function renderPdfSplit(pg) {
    const panel = $('#pdfSplitPanel');
    const list = $('#pdfSplitList');
    if (!panel || !list) return;
    const page = pg || activePdfPage();
    if (!page) { panel.hidden = true; PDF.splitItems = []; return; }
    panel.hidden = false;
    const text = pdfTextFor(page);
    const items = splitPdfText(text);
    PDF.splitItems = items;
    const single = !!(items[0] && items[0].single);
    $('#pdfSplitCount').textContent = items.length + '문항' + (single ? ' · 전체' : '');
    $('#pdfSplitHint').textContent = items.length ? (single ? '번호를 찾지 못해 페이지 전체를 1문항으로 담았어요' : '체크한 문항만 저장돼요') : '';
    if (!items.length) {
      list.innerHTML = '<div class="pdf-split-empty">이 페이지에는 추출된 글자가 없어요.<br/>스캔본·그림 문제는 위의 <strong>✂️ 영역 선택</strong>으로 잘라 저장하세요.</div>';
      return;
    }
    list.innerHTML = items.map(function (it, i) {
      const label = it.num ? it.num + '번' : '전체 텍스트';
      const preview = it.body.slice(0, 200);
      return '<div class="pdf-split-item is-picked" data-split-item="' + i + '">' +
        '<label class="pdf-split-check"><input type="checkbox" data-split-check="' + i + '" checked aria-label="' + label + ' 선택" /></label>' +
        '<div class="pdf-split-main">' +
        '<div class="pdf-split-top"><span class="badge">' + SB.esc(label) + '</span><span class="muted small">' + it.body.length + '자</span></div>' +
        '<div class="pdf-split-body">' + SB.esc(preview) + (it.body.length > 200 ? '…' : '') + '</div>' +
        '</div>' +
        '<div class="pdf-split-acts">' +
        '<button class="btn btn-sm btn-ghost" data-split-variant="' + i + '">🔄 변형</button>' +
        '<button class="btn btn-sm" data-split-save="' + i + '">📥 저장</button>' +
        '</div></div>';
    }).join('');
  }

  function setSplitChecked(on) {
    $$('#pdfSplitList [data-split-check]').forEach(function (cb) {
      cb.checked = on;
      const row = cb.closest('.pdf-split-item');
      if (row) row.classList.toggle('is-picked', on);
    });
  }

  function savePdfSplitItems(indices) {
    const pg = activePdfPage();
    if (!pg) { SB.toast('PDF를 먼저 열어 주세요', 'bad'); return; }
    const items = indices.map(function (i) { return PDF.splitItems[i]; }).filter(Boolean);
    if (!items.length) { SB.toast('저장할 문항을 먼저 체크해 주세요', 'bad'); return; }
    const nums = [];
    const list = items.map(function (it) { if (it.num) nums.push(it.num); return makePdfProblem(it.body, pg.num, { tags: ['PDF', '문항분리'].concat(it.num ? [it.num + '번'] : []) }); });
    commitPdfProblems(list);
    SB.toast(list.length + '문항을 문제은행에 저장했어요' + (nums.length ? ' (' + nums.join(', ') + '번)' : '') + ' · 정답은 수정에서 채워 주세요', 'ok');
  }

  function variantFromPdfText(text, num, toastMsg) {
    if (!text) { SB.toast('변형할 문제 텍스트가 없어요', 'bad'); return; }
    refreshVariantSources();
    $('#variantSource').value = 'manual';
    $('#variantBody').value = text.slice(0, 1600);
    $('#variantChoices').value = '';
    $('#variantAnswer').value = '';
    $('#variantMode').value = /[A-Za-z]/.test(text) && !/[가-힣]/.test(text) ? 'blank' : 'number';
    updateVariantHint();
    SB.go('variant');
    $('#variantResultPanel').hidden = true;
    SB.toast(toastMsg || ('PDF ' + num + '페이지 텍스트를 가져왔어요'), 'ok');
    setTimeout(function () { $('#variantBody').focus(); }, 100);
  }

  /* ============================================================
     3-2) 네모 드래그 영역 캡처
     ============================================================ */
  let cropDrag = null;

  function setCropMode(on) {
    PDF.cropMode = !!on;
    const btn = $('#btnPdfCropMode');
    if (btn) {
      btn.classList.toggle('is-on', PDF.cropMode);
      btn.setAttribute('aria-pressed', PDF.cropMode ? 'true' : 'false');
      btn.textContent = PDF.cropMode ? '✂️ 영역 선택 중' : '✂️ 영역 선택';
    }
    if ($('#pdfPages')) $('#pdfPages').classList.toggle('is-crop', PDF.cropMode);
    if ($('#pdfCropBar')) $('#pdfCropBar').hidden = !PDF.cropMode;
    clearCropRects();
  }

  function clearCropRects() {
    $$('.crop-rect').forEach(function (el) { el.remove(); });
    cropDrag = null;
  }

  function cropPointToBox(e) {
    const b = cropDrag.img.getBoundingClientRect();
    cropDrag.box = b;
    const cx = SB.clamp(e.clientX, b.left, b.right) - b.left;
    const cy = SB.clamp(e.clientY, b.top, b.bottom) - b.top;
    const ox = SB.clamp(cropDrag.x0, b.left, b.right) - b.left;
    const oy = SB.clamp(cropDrag.y0, b.top, b.bottom) - b.top;
    return { left: Math.min(ox, cx), top: Math.min(oy, cy), w: Math.abs(cx - ox), h: Math.abs(cy - oy) };
  }

  function cropDown(e) {
    if (!PDF.cropMode || cropDrag) return;
    if (e.button != null && e.button > 0) return;
    const canvas = e.target.closest && e.target.closest('.pdf-canvas');
    if (!canvas) return;
    const img = canvas.querySelector('img');
    const page = canvas.closest('.pdf-page');
    if (!img || !page) return;
    e.preventDefault();
    const rectEl = document.createElement('div');
    rectEl.className = 'crop-rect';
    canvas.appendChild(rectEl);
    cropDrag = {
      num: Number(page.dataset.num), canvas: canvas, img: img, rectEl: rectEl,
      x0: 0, y0: 0, moved: false, pointerId: e.pointerId, box: null
    };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const b = img.getBoundingClientRect();
    cropDrag.x0 = SB.clamp(e.clientX, b.left, b.right);
    cropDrag.y0 = SB.clamp(e.clientY, b.top, b.bottom);
    cropMove(e);
  }

  function cropMove(e) {
    if (!cropDrag) return;
    const r = cropPointToBox(e);
    cropDrag.rect = r;
    if (r.w > 6 && r.h > 6) cropDrag.moved = true;
    Object.assign(cropDrag.rectEl.style, {
      left: r.left + 'px', top: r.top + 'px', width: r.w + 'px', height: r.h + 'px'
    });
  }

  function cropUp(e) {
    if (!cropDrag) return;
    const d = cropDrag;
    cropDrag = null;
    try { d.canvas.releasePointerCapture(d.pointerId); } catch (err) {}
    if (!d.rect || !d.moved) {
      d.rectEl.remove();
      if (e && e.pointerType) SB.toast('문제 영역을 네모로 조금 더 크게 드래그해 주세요');
      return;
    }
    const b = d.box || d.img.getBoundingClientRect();
    const rect = {
      x: SB.clamp(d.rect.left / b.width, 0, 1),
      y: SB.clamp(d.rect.top / b.height, 0, 1),
      w: SB.clamp(d.rect.w / b.width, 0, 1),
      h: SB.clamp(d.rect.h / b.height, 0, 1)
    };
    applyPdfCrop(d.num, rect);
  }

  /* 원본 PDF 페이지를 고해상도로 다시 그려서 그 영역만 잘라 낸다. */
  async function cropFromPdfPage(num, rect) {
    const page = await PDF.doc.getPage(num);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.6, Math.max(1.4, 1200 / base.width));
    const vp = page.getViewport({ scale: scale });
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(vp.width));
    cv.height = Math.max(1, Math.round(vp.height));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return cutCanvas(cv, rect);
  }

  /* pdf.js 없이 페이지 JPEG만 있을 때(폴백) 쓰는 크롭 */
  function cropFromDataUrl(src, rect) {
    return new Promise(function (resolve) {
      const im = new Image();
      im.onload = function () {
        const cv = document.createElement('canvas');
        cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        const ctx = cv.getContext('2d');
        ctx.drawImage(im, 0, 0);
        resolve(cutCanvas(cv, rect));
      };
      im.onerror = function () { resolve(''); };
      im.src = src;
    });
  }

  function cutCanvas(srcCanvas, rect) {
    const sx = Math.round(rect.x * srcCanvas.width);
    const sy = Math.round(rect.y * srcCanvas.height);
    const sw = Math.max(1, Math.round(rect.w * srcCanvas.width));
    const sh = Math.max(1, Math.round(rect.h * srcCanvas.height));
    const out = document.createElement('canvas');
    out.width = sw; out.height = sh;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    let url = out.toDataURL('image/jpeg', 0.88);
    /* 저장 공간이 작은 기기에서도 여러 장을 담을 수 있게 큰 이미지는 품질을 낮춘다 */
    let q = 0.88;
    while (url.length > 300000 && q > 0.55) { q -= 0.11; url = out.toDataURL('image/jpeg', q); }
    if (url.length > 300000) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(sw * 0.7));
      small.height = Math.max(1, Math.round(sh * 0.7));
      const sctx = small.getContext('2d');
      sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, small.width, small.height);
      sctx.drawImage(out, 0, 0, small.width, small.height);
      url = small.toDataURL('image/jpeg', 0.8);
    }
    return url;
  }

  async function applyPdfCrop(num, rect) {
    const pg = PDF.pages.find(function (p) { return p.num === num; });
    if ((rect.w < 0.03 || rect.h < 0.03)) { clearCropRects(); SB.toast('영역이 너무 작아요. 조금 더 크게 드래그해 주세요', 'bad'); return; }
    let image = '';
    try {
      if (PDF.doc) image = await cropFromPdfPage(num, rect);
      else if (pg && pg.image) image = await cropFromDataUrl(pg.image, rect);
    } catch (err) { image = ''; }
    if (!image) { clearCropRects(); SB.toast('영역을 잘라내지 못했어요. 다시 시도해 주세요', 'bad'); return; }
    PDF.crop = { num: num, image: image, rect: rect };
    const img = $('#pdfCropImg');
    if (img) img.src = image;
    if ($('#pdfCropInfo')) $('#pdfCropInfo').textContent = num + '페이지 · 영역 ' + Math.round(rect.w * 100) + '% × ' + Math.round(rect.h * 100) + '%';
    if ($('#pdfCropBody')) $('#pdfCropBody').value = PDF.name.replace(/\.pdf$/i, '') + ' p.' + num + ' 잘라낸 문제';
    if ($('#pdfCropPanel')) {
      $('#pdfCropPanel').hidden = false;
      $('#pdfCropPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setTimeout(clearCropRects, 700);
    SB.toast('잘라냈어요 — 미리보기를 확인하고 저장하세요', 'ok');
  }

  function savePdfCrop() {
    const c = PDF.crop;
    if (!c || !c.image) { SB.toast('먼저 ✂️ 영역 선택으로 문제를 잘라 주세요', 'bad'); return; }
    const body = (($('#pdfCropBody') && $('#pdfCropBody').value) || '').trim();
    const p = makePdfProblem(body, c.num, {
      image: c.image,
      tags: ['PDF', '영역캡처'],
      solution: 'PDF ' + c.num + '페이지 영역 캡처로 저장'
    });
    commitPdfProblems([p]);
    SB.toast('잘라낸 문제를 사진 첨부로 문제은행에 저장했어요', 'ok');
    PDF.crop = null;
    if ($('#pdfCropPanel')) $('#pdfCropPanel').hidden = true;
    if ($('#pdfCropImg')) $('#pdfCropImg').removeAttribute('src');
    clearCropRects();
  }

  /* ============================================================
     3-3) 선택한 페이지만 PDF로 묶어 저장
     ============================================================ */
  function fileNameForSelected() {
    const base = String(PDF.name || 'pdf').replace(/\.pdf$/i, '').trim() || 'pdf';
    return base + '_선택페이지.pdf';
  }

  async function exportSelectedPdf() {
    if (PDF.fallback || !PDF.doc) {
      SB.toast('이 PDF는 페이지 묶기 저장을 지원하지 않아요', 'bad');
      return;
    }
    const nums = PDF.pages.filter(function (p) { return p.selected; })
      .map(function (p) { return p.num; }).sort(function (a, b) { return a - b; });
    if (!nums.length) {
      SB.toast('PDF로 묶을 페이지를 먼저 체크해 주세요', 'bad');
      return;
    }
    const btn = $('#btnPdfExportSel');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '📥 PDF 만드는 중…'; }
    try {
      const lib = await loadPdfLib();
      if (!lib) throw new Error('pdf-lib load failed');
      const buf = PDF.buf ? PDF.buf.slice(0) : await PDF.doc.getData();
      const src = await lib.PDFDocument.load(buf);
      const out = await lib.PDFDocument.create();
      const copied = await out.copyPages(src, nums.map(function (n) { return n - 1; }));
      copied.forEach(function (pg) { out.addPage(pg); });
      const bytes = await out.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameForSelected();
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      SB.toast(nums.length + '페이지를 PDF로 묶어 저장했어요 (' + nums.join(', ') + '쪽)', 'ok');
    } catch (err) {
      SB.toast('PDF 묶기 도구를 불러오지 못해 인쇄 창으로 대신 열어요', 'bad');
      printPdfPages();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label || '📥 선택 페이지 PDF로 묶기'; }
    }
  }

  function closePdf() {
    if (PDF.url) { try { URL.revokeObjectURL(PDF.url); } catch (e) {} }
    setCropMode(false);
    PDF.doc = null; PDF.pages = []; PDF.active = 0; PDF.name = ''; PDF.url = ''; PDF.fallback = false;
    PDF.buf = null; PDF.crop = null; PDF.splitItems = [];
    $('#pdfPages').innerHTML = '';
    $('#pdfToolbar').hidden = true;
    $('#pdfPageDetail').hidden = true;
    if ($('#pdfSplitPanel')) $('#pdfSplitPanel').hidden = true;
    if ($('#pdfCropPanel')) $('#pdfCropPanel').hidden = true;
    $('#pdfEmpty').hidden = false;
    pdfMessage('아직 PDF를 열지 않았어요.');
    $('#pdfInput').value = '';
  }

  /* ============================================================
     초기화 & 이벤트
     ============================================================ */
  function init() {
    /* 변형 */
    refreshVariantSources();
    if ($('#variantMode')) $('#variantMode').addEventListener('change', updateVariantHint);
    if ($('#variantSource')) $('#variantSource').addEventListener('change', function () {
      if (this.value === 'manual') return;
      const p = SB.problemById(this.value);
      if (p) fillVariantFrom(p);
    });
    if ($('#btnGenerateVariant')) $('#btnGenerateVariant').addEventListener('click', generateVariant);
    if ($('#btnRegenerateVariant')) $('#btnRegenerateVariant').addEventListener('click', generateVariant);
    if ($('#btnSaveVariant')) $('#btnSaveVariant').addEventListener('click', saveVariant);
    if ($('#btnCopyVariant')) $('#btnCopyVariant').addEventListener('click', copyVariant);
    if ($('#btnVariantSpeak')) $('#btnVariantSpeak').addEventListener('click', function () {
      if (!V) { SB.toast('먼저 변형 문제를 만들어 주세요', 'bad'); return; }
      SB.speak(V.body + '. ' + (V.answer ? '정답은 ' + V.answer : ''), V.subject === '영어' ? 'en-US' : 'ko-KR');
    });
    updateVariantHint();

    /* 시험지 */
    renderExamPick();
    if ($('#examPickList')) $('#examPickList').addEventListener('change', function (e) {
      const cb = e.target.closest('[data-pick]');
      if (!cb) return;
      if (cb.checked) SB.ui.exam.selected.add(cb.dataset.pick);
      else SB.ui.exam.selected.delete(cb.dataset.pick);
      cb.closest('.pick-item').classList.toggle('is-picked', cb.checked);
      if ($('#examPickCount')) $('#examPickCount').textContent = SB.ui.exam.selected.size + '개';
      renderExamPreview();
    });
    if ($('#btnExamSelectAll')) $('#btnExamSelectAll').addEventListener('click', function () {
      SB.ui.exam.selected = new Set(SB.state.problems.map(function (p) { return p.id; }));
      renderExamPick();
    });
    if ($('#btnExamSelectNone')) $('#btnExamSelectNone').addEventListener('click', function () {
      SB.ui.exam.selected = new Set();
      renderExamPick();
    });
    if ($('#btnExamRandom')) $('#btnExamRandom').addEventListener('click', examRandom);
    if ($('#btnPrintExam')) $('#btnPrintExam').addEventListener('click', printExam);
    ['examTitle', 'examSubtitle', 'examLayout', 'examAnswers', 'examNameLine', 'examPointLine'].forEach(function (id) {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('input', renderExamPreview);
      el.addEventListener('change', renderExamPreview);
    });

    /* PDF */
    if ($('#pdfDrop')) {
      $('#pdfDrop').addEventListener('click', function () { $('#pdfInput').click(); });
      ['dragenter', 'dragover'].forEach(function (ev) {
        $('#pdfDrop').addEventListener(ev, function (e) { e.preventDefault(); this.classList.add('is-over'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        $('#pdfDrop').addEventListener(ev, function (e) { e.preventDefault(); this.classList.remove('is-over'); });
      });
      $('#pdfDrop').addEventListener('drop', function (e) {
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) openPdf(f);
      });
    }
    if ($('#pdfInput')) $('#pdfInput').addEventListener('change', function () {
      const f = this.files && this.files[0];
      if (f) openPdf(f);
    });
    if ($('#pdfPages')) {
      $('#pdfPages').addEventListener('change', function (e) {
        const cb = e.target.closest('[data-pdf-sel]');
        if (cb) {
          const pg = PDF.pages.find(function (p) { return p.num === Number(cb.dataset.pdfSel); });
          if (pg) { pg.selected = cb.checked; cb.closest('.pdf-page').classList.toggle('is-picked', cb.checked); }
          return;
        }
        const memo = e.target.closest('[data-pdf-memo]');
        if (memo) {
          const pg = PDF.pages.find(function (p) { return p.num === Number(memo.dataset.pdfMemo); });
          if (pg) {
            pg.memo = memo.value;
            SB.state.pdfNotes[PDF.name + '::' + pg.num] = { memo: pg.memo, tag: pg.tag };
            SB.save();
          }
          return;
        }
        const tag = e.target.closest('[data-pdf-tag]');
        if (tag) {
          const pg = PDF.pages.find(function (p) { return p.num === Number(tag.dataset.pdfTag); });
          if (pg) {
            pg.tag = tag.value;
            SB.state.pdfNotes[PDF.name + '::' + pg.num] = { memo: pg.memo, tag: pg.tag };
            SB.save();
          }
        }
      });
      $('#pdfPages').addEventListener('click', function (e) {
        if (PDF.cropMode) return;
        if (e.target.closest('[data-pdf-sel]') || e.target.closest('[data-pdf-memo]') || e.target.closest('[data-pdf-tag]')) return;
        const card = e.target.closest('.pdf-page');
        if (card) selectPdfPage(Number(card.dataset.num));
      });
    }
    if ($('#btnPdfSelectAll')) $('#btnPdfSelectAll').addEventListener('click', function () {
      PDF.pages.forEach(function (p) { p.selected = true; });
      renderPdfPages();
    });
    if ($('#btnPdfSelectNone')) $('#btnPdfSelectNone').addEventListener('click', function () {
      PDF.pages.forEach(function (p) { p.selected = false; });
      renderPdfPages();
    });
    if ($('#btnPdfPrint')) $('#btnPdfPrint').addEventListener('click', printPdfPages);
    if ($('#btnPdfPrintPage')) $('#btnPdfPrintPage').addEventListener('click', printPdfPages);
    if ($('#btnPdfClose')) $('#btnPdfClose').addEventListener('click', closePdf);
    if ($('#btnPdfMakeVariant')) $('#btnPdfMakeVariant').addEventListener('click', pdfMakeVariant);
    if ($('#btnPdfSpeak')) $('#btnPdfSpeak').addEventListener('click', function () {
      const pg = activePdfPage();
      if (!pg) { SB.toast('PDF를 먼저 열어 주세요', 'bad'); return; }
      const text = pdfTextFor(pg);
      if (!text) { SB.toast('읽을 텍스트가 없어요', 'bad'); return; }
      SB.speak(text.slice(0, 900), /[가-힣]/.test(text) ? 'ko-KR' : 'en-US');
    });
    if ($('#btnPdfSaveProblem')) $('#btnPdfSaveProblem').addEventListener('click', pdfSaveProblem);
    if ($('#pdfText')) $('#pdfText').addEventListener('input', function () {
      const pg = activePdfPage();
      if (pg) pg.text = this.value;
    });
    if ($('#pdfText')) $('#pdfText').addEventListener('change', function () { renderPdfSplit(); });

    /* PDF — 문항 자동 분리 */
    if ($('#pdfSplitList')) {
      $('#pdfSplitList').addEventListener('change', function (e) {
        const cb = e.target.closest('[data-split-check]');
        if (!cb) return;
        const row = cb.closest('.pdf-split-item');
        if (row) row.classList.toggle('is-picked', cb.checked);
      });
      $('#pdfSplitList').addEventListener('click', function (e) {
        const v = e.target.closest('[data-split-variant]');
        if (v) {
          const it = PDF.splitItems[Number(v.dataset.splitVariant)];
          if (it) variantFromPdfText(it.body, PDF.active, ('PDF ' + PDF.active + '페이지 ' + (it.num ? it.num + '번' : '문항') + '을 변형으로 가져왔어요'));
          return;
        }
        const s = e.target.closest('[data-split-save]');
        if (s) {
          const it = PDF.splitItems[Number(s.dataset.splitSave)];
          if (it) savePdfSplitItems([Number(s.dataset.splitSave)]);
        }
      });
    }
    if ($('#btnPdfSplitRefresh')) $('#btnPdfSplitRefresh').addEventListener('click', function () { renderPdfSplit(); });
    if ($('#btnPdfSplitAll')) $('#btnPdfSplitAll').addEventListener('click', function () { setSplitChecked(true); });
    if ($('#btnPdfSplitNone')) $('#btnPdfSplitNone').addEventListener('click', function () { setSplitChecked(false); });
    if ($('#btnPdfSaveSelected')) $('#btnPdfSaveSelected').addEventListener('click', function () {
      const idx = $$('#pdfSplitList [data-split-check]').filter(function (cb) { return cb.checked; })
        .map(function (cb) { return Number(cb.dataset.splitCheck); });
      if (!idx.length) { SB.toast('저장할 문항을 먼저 체크해 주세요', 'bad'); return; }
      savePdfSplitItems(idx);
      setSplitChecked(false);
    });

    /* PDF — 영역 선택 캐처 */
    if ($('#btnPdfCropMode')) $('#btnPdfCropMode').addEventListener('click', function () {
      setCropMode(!PDF.cropMode);
      if (PDF.cropMode) SB.toast('영역 선택 모드 — 문제 부분을 네모로 드래그하세요', 'ok');
    });
    if ($('#btnPdfCropOff')) $('#btnPdfCropOff').addEventListener('click', function () { setCropMode(false); });
    if ($('#pdfPages')) {
      $('#pdfPages').addEventListener('pointerdown', cropDown);
      window.addEventListener('pointermove', cropMove, { passive: false });
      window.addEventListener('pointerup', cropUp);
      window.addEventListener('pointercancel', cropUp);
    }
    if ($('#btnPdfCropSave')) $('#btnPdfCropSave').addEventListener('click', savePdfCrop);
    if ($('#btnPdfCropDiscard')) $('#btnPdfCropDiscard').addEventListener('click', function () {
      PDF.crop = null;
      if ($('#pdfCropPanel')) $('#pdfCropPanel').hidden = true;
      if ($('#pdfCropImg')) $('#pdfCropImg').removeAttribute('src');
      SB.toast('잘라낸 영역을 버렸어요');
    });

    /* PDF — 선택 페이지 PDF로 묶기 */
    if ($('#btnPdfExportSel')) $('#btnPdfExportSel').addEventListener('click', exportSelectedPdf);
  }

  function render() {
    renderExamPick();
    if (SB.ui.tab === 'variant') updateVariantHint();
  }

  SB.pdf = PDF;

  SB.register({
    init: init,
    render: render,
    onEnter: function (tab) {
      if (tab === 'exam') renderExamPick();
      if (tab === 'variant') refreshVariantSources();
    }
  });
})();
