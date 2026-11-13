/* 词源星图 · 语段面板与答题逻辑 */
(function (ES) {
  'use strict';
  const { escapeHtml } = ES.util;

  const TYPE = ES.TYPE || {
    meaning: { name: '词义辨识', short: '词义', color: '#ffd479' },
    form: { name: '词形变换', short: '词形', color: '#7fd4ff' },
    cloze: { name: '语境填空', short: '语境', color: '#c9a7ff' },
  };

  function passageHtml(text, mode) {
    return escapeHtml(text).replace(/\[\[([^\]]+)\]\]/g, (m, token) => {
      if (mode === 'highlight') return `<mark class="target">${token}</mark>`;
      return `<span class="blank">______</span>`;
    });
  }

  class Panel {
    constructor(hooks) {
      this.hooks = hooks;
      this.el = document.getElementById('panel');
      this.inner = this.el.querySelector('.panel-inner');
      this.typeEl = document.getElementById('pType');
      this.typeDot = document.getElementById('pTypeDot');
      this.wordEl = document.getElementById('pWord');
      this.phoneticEl = document.getElementById('pPhonetic');
      this.formsEl = document.getElementById('pForms');
      this.dotsEl = document.getElementById('pDots');
      this.sceneEl = document.getElementById('pScene');
      this.passageEl = document.getElementById('pPassage');
      this.cnEl = document.getElementById('pCn');
      this.cnToggle = document.getElementById('pCnToggle');
      this.questionEl = document.getElementById('pQuestion');
      this.optionsEl = document.getElementById('pOptions');
      this.feedbackEl = document.getElementById('pFeedback');
      this.submitEl = document.getElementById('pSubmit');
      this.footEl = document.getElementById('pFoot');
      this.closeEl = document.getElementById('panelClose');

      this.current = null;
      this.selected = null;
      this.solved = false;
      this.wrongCount = 0;

      this.closeEl.addEventListener('click', () => this.close());
      this.cnToggle.addEventListener('click', () => {
        const open = this.cnEl.hidden;
        this.cnEl.hidden = !open;
        this.cnToggle.setAttribute('aria-expanded', String(open));
        this.cnToggle.innerHTML = (open ? '收起中文翻译' : '显示中文翻译') + ' <span>▾</span>';
      });
      this.submitEl.addEventListener('click', () => this.submit());
    }

    isOpen() { return this.el.classList.contains('open'); }

    open(ctx) {
      this.current = ctx;
      this.selected = null;
      this.wrongCount = 0;
      this.solved = !!this.hooks.getLit(ctx.planet.id);
      this.pendingNext = null;
      this.render();
      this.el.classList.add('open');
      this.el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('panel-open');
      if (this.inner) this.inner.scrollTop = 0;
      this.hooks.onOpen(ctx);
    }

    close() {
      if (!this.isOpen()) return;
      this.el.classList.remove('open');
      this.el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('panel-open');
      this.hooks.onClose();
      this.current = null;
    }

    render() {
      const { root, word, planet } = this.current;
      const q = planet.question;
      const type = q.type || planet.type;
      const meta = TYPE[type] || TYPE.meaning;

      this.typeEl.textContent = q.label || meta.name;
      this.typeDot.style.background = planet.color;
      this.typeDot.style.color = planet.color;
      this.typeDot.style.boxShadow = `0 0 10px ${planet.color}`;

      this.wordEl.textContent = word.data.word;
      this.phoneticEl.textContent = word.data.phonetic || '';

      const wd = word.data;
      const chips = [];
      if (wd.prefix) chips.push(`<span class="chip prefix">${escapeHtml(wd.prefix)}<i>${escapeHtml(wd.prefixMeaning || '')}</i></span>`);
      chips.push(`<span class="chip root">${escapeHtml(root.data.root)}<i>${escapeHtml(root.data.meaning || '')}</i></span>`);
      if (wd.suffix) chips.push(`<span class="chip suffix">${escapeHtml(wd.suffix)}<i>${escapeHtml(wd.suffixMeaning || '')}</i></span>`);
      this.formsEl.innerHTML = chips.join('');

      this.renderDots();

      this.sceneEl.textContent = wd.passage.scene || '原创语段';
      const hasOwnBlank = /_{3,}/.test(q.question || '');
      const keepWordVisible = type === 'meaning' || (type === 'form' && hasOwnBlank);
      this.passageEl.innerHTML = passageHtml(wd.passage.text, keepWordVisible ? 'highlight' : 'blank');
      this.cnEl.textContent = wd.passage.cn || '';
      this.cnEl.hidden = true;
      this.cnToggle.setAttribute('aria-expanded', 'false');
      this.cnToggle.innerHTML = '显示中文翻译 <span>▾</span>';

      this.questionEl.innerHTML = ES.util.markup(q.question, 'hl');

      this.optionsEl.innerHTML = '';
      (q.options || []).forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option';
        btn.dataset.index = String(i);
        btn.innerHTML = `<span class="letter">${'ABCD'[i]}</span><span class="text">${escapeHtml(opt)}</span>`;
        btn.addEventListener('click', () => this.select(i));
        this.optionsEl.appendChild(btn);
      });

      this.feedbackEl.hidden = true;
      this.feedbackEl.className = 'feedback';
      this.submitEl.disabled = false;
      this.submitEl.textContent = '提交答案';

      if (this.solved) {
        this.applySolved();
      }
      this.footEl.textContent = `${meta.name} · 答对点亮这颗行星，词星随之变亮`;
    }

    renderDots() {
      const { word, planet } = this.current;
      this.dotsEl.innerHTML = word.planets.map((p) => {
        const lit = this.hooks.getLit(p.id);
        const cur = p.id === planet.id && !lit;
        const done = p.id === planet.id && lit;
        return `<span class="pdot ${lit ? 'lit' : ''} ${cur ? 'current' : ''} ${done ? 'lit' : ''}">${(TYPE[p.type] || TYPE.meaning).short}${lit ? ' ✦' : ''}</span>`;
      }).join('');
    }

    select(i) {
      if (this.solved) return;
      this.selected = i;
      const buttons = [...this.optionsEl.querySelectorAll('.option')];
      buttons.forEach((b, idx) => b.classList.toggle('selected', idx === i));
      this.submitEl.disabled = false;
    }

    submit() {
      if (!this.current) return;
      if (this.solved) { this.next(); return; }
      if (this.selected == null) {
        this.hooks.toast('先选一个答案，再提交');
        return;
      }
      const { word, planet } = this.current;
      const q = planet.question;
      const buttons = [...this.optionsEl.querySelectorAll('.option')];
      const correct = this.selected === q.answer;

      if (correct) {
        this.solved = true;
        buttons.forEach((b, idx) => {
          b.disabled = true;
          b.classList.remove('selected');
          if (idx === q.answer) b.classList.add('correct');
          else b.classList.add('faded');
        });
        this.showFeedback(true, '答对了，行星点亮 ✦', q.explanation);
        this.hooks.onAnswer(planet, true);
        this.renderDots();
        this.pendingNext = this.hooks.nextPlanet(word.id, planet.type);
        this.submitEl.textContent = this.pendingNext ? '下一颗行星 →' : '完成 · 继续探索';
        this.hooks.sound('correct');
      } else {
        this.wrongCount++;
        buttons.forEach((b, idx) => {
          if (idx === this.selected) { b.classList.add('wrong'); b.disabled = true; }
        });
        this.hooks.sound('wrong');
        if (this.wrongCount >= 2) {
          buttons.forEach((b, idx) => {
            if (idx === q.answer) b.classList.add('correct');
            b.disabled = true;
          });
          this.showFeedback(false, '正确答案已标出', q.explanation);
          this.submitEl.textContent = '再读一遍语段';
          this.submitEl.disabled = true;
        } else {
          this.showFeedback(false, '差一点，再读一遍语段', '提示：注意空缺处前后的搭配，以及这个词的构词方向。');
          this.selected = null;
        }
      }
    }

    applySolved() {
      const { planet } = this.current;
      const q = planet.question;
      const buttons = [...this.optionsEl.querySelectorAll('.option')];
      buttons.forEach((b, idx) => {
        b.disabled = true;
        if (idx === q.answer) b.classList.add('correct');
        else b.classList.add('faded');
      });
      this.showFeedback(true, '这颗行星已经点亮', q.explanation);
      this.pendingNext = this.hooks.nextPlanet(this.current.word.id, planet.type);
      this.submitEl.textContent = this.pendingNext ? '下一颗行星 →' : '完成 · 继续探索';
    }

    showFeedback(ok, title, explain) {
      this.feedbackEl.hidden = false;
      this.feedbackEl.className = 'feedback ' + (ok ? 'correct' : 'wrong');
      this.feedbackEl.innerHTML = `<b>${escapeHtml(title)}</b><span class="explain">${escapeHtml(explain || '')}</span>`;
      requestAnimationFrame(() => {
        if (this.inner) this.inner.scrollTo({ top: this.inner.scrollHeight, behavior: 'smooth' });
      });
    }

    next() {
      if (this.pendingNext) {
        this.hooks.openPlanet(this.pendingNext);
      } else {
        this.hooks.toast('这颗词星的三颗行星都点亮了 ✦');
        this.close();
      }
    }
  }

  ES.Panel = Panel;
})(window.ES = window.ES || {});
