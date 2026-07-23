import './styles/main.css';
import './styles/polish.css';
import { CONFIG, QUESTION_BANK, VISUAL_SVG } from './data/catalog.js';
import { CHARACTER_DB } from './data/characters.js';
import { validateQuestionBank } from './core/content-validator.js';
import { selectQuestions } from './core/question-selector.js';
import {
  calculateAnswerScore,
  calculateComboBonus,
  calculateKnowledgeScore,
  getCategoryScores,
  getMaxCompetitiveScore,
  getRank,
} from './core/scoring.js';

'use strict';

// ============ VISUAL ASSETS (Original SVG illustrations) ============
// 内联SVG插画内容（不含外层<svg>标签），由 renderVisualQuestion 统一包装渲染
// 全部为原创几何造型，不复制任何动画截图/海报/角色原画
// Quiz catalog and configuration are maintained in src/data/catalog.js.

// ============ QUESTION BANK VALIDATOR ============
const questionBankReport = validateQuestionBank(QUESTION_BANK, CONFIG);
console.info(`题库校验：${questionBankReport.stats.total} 道题，${questionBankReport.errors.length} 个错误，${questionBankReport.warnings.length} 个提醒。`);
if (!questionBankReport.pass) {
  console.error(questionBankReport.errors.join('\n'));
}
if (questionBankReport.warnings.length) {
  console.info(questionBankReport.warnings.join('\n'));
}

// ============ STATE ============
const state = {
  currentPage: 'welcome',
  mode: 'normal',
  questions: [],
  currentIndex: 0,
  answers: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  startTime: 0,
  timerInterval: null,
  timeLeft: CONFIG.totalTime,
  soundOn: true,
  questionStartTime: 0,
  isTransitioning: false,
  answered: false
};

// ============ STORAGE ============
const Storage = {
  _read() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },
  _write(data) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); } catch (e) {}
  },
  getHistory() {
    const data = this._read();
    return Array.isArray(data.history) ? data.history : [];
  },
  saveResult(result) {
    try {
      const data = this._read();
      if (!Array.isArray(data.history)) data.history = [];
      
      var record = {
        version: 2,
        score: result.score,
        tier: result.tier,
        rankEmoji: result.rankEmoji || '',
        rankTitle: result.rankTitle || '',
        mode: result.mode || '',
        total: result.total || 0,
        correct: result.correct || 0,
        knowledgePercent: result.knowledgePercent || 0,
        competitiveScore: result.competitiveScore || 0,
        competitiveMax: result.competitiveMax || 0,
        maxCombo: result.maxCombo || 0,
        date: new Date().toISOString()
      };
      
      data.history.unshift(record);
      data.history = data.history.slice(0, 10);
      if (!data.highScore || record.score > data.highScore) data.highScore = record.score;
      data.last = record;
      data.lastTags = result.tags || ["次元新人", "萌新上路"];
      if (!data.achievements) data.achievements = { unlocked: [], progress: { streak: 0, ranks: [], categoryStreak: {} } };
      if (!Array.isArray(data.achievements.unlocked)) data.achievements.unlocked = [];
      if (!data.achievements.progress) data.achievements.progress = { streak: 0, ranks: [], categoryStreak: {} };
      data.achievements.progress.streak = data.history.length;
      if (record.tier && !data.achievements.progress.ranks.includes(record.tier)) {
        data.achievements.progress.ranks.push(record.tier);
      }
      this._write(data);
    } catch (e) {}
  },
  getAchievements() {
    const data = this._read();
    if (!data.achievements) {
      return { unlocked: [], progress: { streak: 0, ranks: [], categoryStreak: {} } };
    }
    return {
      unlocked: Array.isArray(data.achievements.unlocked) ? data.achievements.unlocked : [],
      progress: data.achievements.progress || { streak: 0, ranks: [], categoryStreak: {} }
    };
  },
  unlockAchievement(id) {
    const data = this._read();
    if (!data.achievements) data.achievements = { unlocked: [], progress: { streak: 0, ranks: [], categoryStreak: {} } };
    if (!Array.isArray(data.achievements.unlocked)) data.achievements.unlocked = [];
    const exists = data.achievements.unlocked.some(function(a) { return a.id === id; });
    if (!exists) {
      data.achievements.unlocked.push({ id: id, unlockedAt: new Date().toISOString() });
      this._write(data);
      return true;
    }
    return false;
  },
  updateCategoryStreak(category, isPerfect) {
    const data = this._read();
    if (!data.achievements) data.achievements = { unlocked: [], progress: { streak: 0, ranks: [], categoryStreak: {} } };
    if (!data.achievements.progress.categoryStreak) data.achievements.progress.categoryStreak = {};
    if (isPerfect) {
      data.achievements.progress.categoryStreak[category] = (data.achievements.progress.categoryStreak[category] || 0) + 1;
    } else {
      data.achievements.progress.categoryStreak[category] = 0;
    }
    this._write(data);
  },
  getHighScore() {
    const data = this._read();
    return data.highScore || 0;
  },
  getSettings() {
    const data = this._read();
    return { soundOn: data.soundOn !== false };
  },
  saveSettings(settings) {
    try {
      const data = this._read();
      data.soundOn = settings.soundOn;
      this._write(data);
    } catch (e) {}
  },
  clearHistory() {
    try {
      const data = this._read();
      data.history = [];
      data.highScore = 0;
      delete data.last;
      delete data.lastTags;
      this._write(data);
    } catch (e) {}
  }
};

// ============ ACHIEVEMENT ============
const Achievement = {
  checkAll(currentResult) {
    const unlockedIds = Storage.getAchievements().unlocked.map(function(a) { return a.id; });
    const progress = Storage.getAchievements().progress;
    const history = Storage.getHistory();
    const newlyUnlocked = [];
    const totalTime = currentResult.totalTime || 0;
    const questionCount = currentResult.total || 0;
    const avgTime = questionCount > 0 ? totalTime / questionCount : 0;
    const isPerfect = currentResult.correct === currentResult.total;
    const mode = currentResult.mode || 'normal';

    CONFIG.achievements.forEach(function(ach) {
      if (unlockedIds.includes(ach.id)) return;

      let unlocked = false;
      switch (ach.id) {
        case 1:
          unlocked = history.length >= 1;
          break;
        case 2:
          unlocked = progress.streak >= 5;
          break;
        case 3:
          unlocked = progress.streak >= 10;
          break;
        case 4:
          unlocked = mode === '标准模式' && isPerfect;
          break;
        case 5:
          unlocked = mode === '挑战模式' && isPerfect;
          break;
        case 6:
          unlocked = avgTime <= 3;
          break;
        case 7:
          unlocked = questionCount >= 15 && totalTime <= 90;
          break;
        case 8:
          unlocked = progress.ranks.length >= 6;
          break;
        case 9:
          unlocked = Object.values(progress.categoryStreak || {}).some(function(s) { return s >= 5; });
          break;
        case 10:
          const answers = state.answers || [];
          unlocked = answers.some(function(a, idx) {
            const q = state.questions[idx];
            return q && q.id === 49 && a.correct;
          });
          break;
      }

      if (unlocked) {
        Storage.unlockAchievement(ach.id);
        newlyUnlocked.push(ach);
      }
    });

    if (isPerfect && currentResult.categoryStats) {
      Object.keys(currentResult.categoryStats).forEach(function(cat) {
        Storage.updateCategoryStreak(cat, currentResult.categoryStats[cat].correct === currentResult.categoryStats[cat].total);
      });
    }

    return newlyUnlocked;
  },
  getUnlockedCount() {
    return Storage.getAchievements().unlocked.length;
  },
  getTotalCount() {
    return CONFIG.achievements.length;
  },
  getUnlockedList() {
    const unlocked = Storage.getAchievements().unlocked;
    return CONFIG.achievements.map(function(ach) {
      const unlockedData = unlocked.find(function(u) { return u.id === ach.id; });
      return {
        ...ach,
        unlocked: !!unlockedData,
        unlockedAt: unlockedData ? unlockedData.unlockedAt : null
      };
    });
  },
  formatTime(timestamp) {
    if (!timestamp) return '???';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// ============ AUDIO ============
const AudioMgr = {
  ctx: null,
  voicesLoaded: false,
  isSupported: false,

  init() {
    try {
      this.isSupported = ('speechSynthesis' in window) || ('webkitSpeechSynthesis' in window);
    } catch (e) { this.isSupported = false; }
    if (this.isSupported) {
      try {
        // Preload voices
        const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
        synth.getVoices();
        synth.onvoiceschanged = function() { synth.getVoices(); };
      } catch (e) {}
    }
  },

  speak(text) {
    if (!this.isSupported) return false;
    try {
      const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.rate = 0.9;
      utter.pitch = 1.0;
      // Try to find a Chinese voice
      const voices = synth.getVoices();
      const zhVoice = voices.find(function(v) { return v.lang && v.lang.indexOf('zh') === 0; });
      if (zhVoice) utter.voice = zhVoice;
      synth.speak(utter);
      return true;
    } catch (e) { return false; }
  },

  stopSpeak() {
    if (!this.isSupported) return;
    try { (window.speechSynthesis || window.webkitSpeechSynthesis).cancel(); } catch (e) {}
  },

  playFeedback(correct) {
    if (!state.soundOn) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (correct) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
      }
    } catch (e) {}
  }
};

// ============ SCORING ============
const Scoring = {
  calculateScore(question, selectedIndex, timeTaken) {
    return calculateAnswerScore(question, selectedIndex, timeTaken, CONFIG);
  },

  applyCombo(correct) {
    if (correct) {
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
    } else {
      state.combo = 0;
    }
  },

  getComboBonus() {
    return calculateComboBonus(state.combo, CONFIG);
  },

  getMaxPossibleScore(questions) {
    return getMaxCompetitiveScore(questions, CONFIG);
  },

  calculateKnowledgeScore(questions, answers) {
    return calculateKnowledgeScore(questions, answers, CONFIG);
  },

  getMaxCompetitiveScore(questions) {
    return getMaxCompetitiveScore(questions, CONFIG);
  },

  getRank(percentage) {
    return getRank(percentage, CONFIG);
  },

  getCategoryScores(questions, answers) {
    return getCategoryScores(questions, answers, CONFIG);
  }
};

// ============ CHARACTER MATCHING ENGINE ============
// Character catalog is maintained in src/data/characters.js.
const CharacterMatcher = {
  calculateDimensionScores(questions, answers) {
    const catScores = Scoring.getCategoryScores(questions, answers);
    let totalTime = 0;
    let count = 0;
    answers.forEach(function(a) {
      if (a) { totalTime += a.timeTaken; count++; }
    });
    const avgTime = count > 0 ? totalTime / count : 30;
    
    const getScore = function(cat) {
      const sc = catScores[cat] || { correct: 0, total: 0, earnedBase: 0, totalBase: 0 };
      if (sc.total < 3) return 50;
      return sc.totalBase > 0 ? Math.round((sc.earnedBase / sc.totalBase) * 100) : 50;
    };
    
    return {
      passion: getScore('anime'),
      gaming: getScore('game'),
      voice: getScore('voice'),
      meme: getScore('meme'),
      knowledge: getScore('knowledge'),
      reaction: Math.max(0, Math.min(100, Math.round(100 - avgTime * 5)))
    };
  },
  
  generateTags(dimensionScores) {
    const tags = [];
    const tagMap = {
      passion: ['萌新', '二次元爱好者', '热血少年'],
      gaming: ['路人', '游戏玩家', '游戏达人'],
      voice: ['轻度兴趣', '声控', '声优鉴定师'],
      meme: ['偶尔玩梗', '玩梗爱好者', '梗图王者'],
      knowledge: ['小白', '爱好者', '业界大佬'],
      reaction: ['慢慢来', '快手', '闪电侠']
    };
    
    Object.keys(tagMap).forEach(function(key) {
      const score = dimensionScores[key];
      let idx = 0;
      if (score >= 80) idx = 2;
      else if (score >= 60) idx = 1;
      tags.push(tagMap[key][idx]);
    });
    
    return tags;
  },
  
  match(dimensionScores) {
    let bestMatch = null;
    let bestScore = -1;
    let candidates = [];
    
    CHARACTER_DB.forEach(function(char) {
      let distance = 0;
      const dims = ['passion', 'gaming', 'voice', 'meme', 'knowledge', 'reaction'];
      dims.forEach(function(dim) {
        const diff = dimensionScores[dim] - char.targetScores[dim];
        distance += Math.pow(diff * char.weights[dim], 2);
      });
      const normalizedScore = Math.max(0, 100 - Math.sqrt(distance) / 2);
      candidates.push({ character: char, score: normalizedScore });
      
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = char;
      }
    });
    
    candidates.sort(function(a, b) { return b.score - a.score; });
    
    let finalChar = candidates[0].character;
    let finalScore = candidates[0].score;
    
    if (finalScore >= 90) finalChar.rarity = 'SSR';
    else if (finalScore >= 75) finalChar.rarity = 'SR';
    else finalChar.rarity = 'R';
    
    return {
      character: finalChar,
      matchScore: Math.round(finalScore),
      dimensionScores: dimensionScores,
      tags: this.generateTags(dimensionScores)
    };
  },
  
  generateShareText(result) {
    const dim = result.dimensionScores;
    return '🎮 我在二次元浓度研究所测出了' + 
      (result.character.rarity === 'SSR' ? 'SSR' : result.character.rarity === 'SR' ? 'SR' : 'R') + 
      '级角色！\n\n' +
      '👑 角色：' + result.character.name + '\n' +
      '🏆 称号：' + result.character.title + '\n' +
      '📊 匹配度：' + result.matchScore + '%\n\n' +
      '⚡ 热血度：' + dim.passion + '%  🎮 游戏力：' + dim.gaming + '%\n' +
      '🎤 声优控：' + dim.voice + '%  🤣 玩梗力：' + dim.meme + '%\n' +
      '📚 博学度：' + dim.knowledge + '%  ⚡ 反应力：' + dim.reaction + '%\n\n' +
      '灵魂伴侣：' + result.character.partner.name + '（兼容性' + result.character.partner.compatibility + '%）\n\n' +
      '快来测测你的二次元角色身份吧！';
  },
  
  generateCardImage(result) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      const c = result.character;
      const dim = result.dimensionScores;
      
      const gradient = ctx.createLinearGradient(0, 0, 0, 800);
      gradient.addColorStop(0, c.colors[0]);
      gradient.addColorStop(1, c.colors[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 800);
      
      ctx.strokeStyle = c.rarity === 'SSR' ? '#FFD700' : c.rarity === 'SR' ? '#9932CC' : '#4169E1';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 560, 760);
      
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(30, 30, 540, 740);
      
      ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText('二次元浓度研究所', 300, 80);
      
      ctx.font = '16px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━', 300, 100);
      
      const rarityColors = { SSR: '#FFD700', SR: '#9932CC', R: '#4169E1' };
      ctx.fillStyle = rarityColors[c.rarity];
      ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
      ctx.fillText(c.rarity + ' ' + c.name, 300, 150);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px "Microsoft YaHei", sans-serif';
      ctx.fillText('称号：' + c.title, 300, 185);
      
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
      ctx.fillText('匹配度：' + result.matchScore + '%', 300, 220);
      
      const dimLabels = ['热血度', '游戏力', '声优控', '玩梗力', '博学度', '反应力'];
      const dimKeys = ['passion', 'gaming', 'voice', 'meme', 'knowledge', 'reaction'];
      const dimColors = ['#FF6B9D', '#72CFF5', '#A996F7', '#F4B84B', '#79D9C0', '#FF9F43'];
      
      let startY = 260;
      for (let i = 0; i < 6; i++) {
        const x1 = i < 4 ? 60 + i * 125 : 150 + (i - 4) * 150;
        const y1 = i < 4 ? startY : startY + 60;
        
        ctx.fillStyle = dimColors[i];
        ctx.beginPath();
        ctx.roundRect(x1, y1, i < 4 ? 110 : 130, 45, 8);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dimLabels[i], x1 + (i < 4 ? 55 : 65), y1 + 20);
        
        ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
        ctx.fillText(dim[dimKeys[i]] + '%', x1 + (i < 4 ? 55 : 65), y1 + 38);
      }
      
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'italic 16px "Microsoft YaHei", sans-serif';
      ctx.fillText('" ' + c.quote + ' "', 300, 420);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px "Microsoft YaHei", sans-serif';
      ctx.fillText('灵魂伴侣：' + c.partner.name, 300, 460);
      
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
      ctx.fillText('兼容性：' + c.partner.compatibility + '%', 300, 490);
      
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText('📱 扫码测试你的二次元角色身份', 300, 760);
      
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Card generation failed:', e);
      return null;
    }
  }
};

// ============ QUESTION SELECTION ============
const QuestionSelector = {
  lastDiagnostics: null,

  select(mode) {
    const result = selectQuestions(QUESTION_BANK, CONFIG, mode);
    this.lastDiagnostics = result.diagnostics;
    if (result.diagnostics.warnings.length) {
      console.info('[抽题诊断]', result.diagnostics);
    }
    return result.questions;
  }
};

// ============ UI ============
const UI = {
  showPage(pageId) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    state.currentPage = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderWelcome() {
    const history = Storage.getHistory();
    const strip = document.getElementById('welcome-history-strip');
    if (!strip) return;
    if (history.length === 0) {
      strip.innerHTML = '<div class="history-empty">暂无历史记录，快来开始你的第一次测试吧！</div>';
    } else {
      strip.innerHTML = history.slice(0, 8).map(function(h) {
        var isOld = !h.version || h.version < 2;
        var dateStr = '';
        if (h.date) {
          try {
            const d = new Date(h.date);
            dateStr = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          } catch(e) { dateStr = ''; }
        }
        var scoreDisplay = isOld 
          ? '<div class="hi-score"><span class="hi-badge hi-badge-old">旧版记录</span>' + (h.score || 0) + '分 · ' + (h.mode || '') + '</div>'
          : '<div class="hi-score">' + Math.round(h.knowledgePercent || 0) + '% · ' + (h.competitiveScore || 0) + '/' + (h.competitiveMax || 0) + ' · ' + (h.mode || '') + (h.maxCombo > 0 ? ' · 连击' + h.maxCombo : '') + '</div>';
        return '<div class="history-item" aria-label="' + (h.rankTitle || '') + ' ' + (isOld ? '旧版记录' : '知识分' + Math.round(h.knowledgePercent || 0) + '%') + '">' +
          '<div class="hi-rank">' + (h.rankEmoji || '') + '</div>' +
          '<div class="hi-title">' + (h.rankTitle || '') + '</div>' +
          scoreDisplay +
          (dateStr ? '<div class="hi-date">' + dateStr + '</div>' : '') +
        '</div>';
      }).join('');
    }
    UI.updateAchievementCount();
    UI.updateModeMeta();
  },

  scrollToHistory() {
    const historySection = document.querySelector('.welcome-history-section');
    if (!historySection) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    historySection.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center'
    });
    setTimeout(function() {
      historySection.classList.remove('highlight');
      void historySection.offsetWidth;
      historySection.classList.add('highlight');
    }, prefersReducedMotion ? 0 : 100);
    historySection.focus();
  },

  updateModeMeta() {
    const modeCfg = CONFIG.modes[state.mode];
    if (!modeCfg) return;
    const metaEl = document.getElementById('pass-hero-meta');
    if (!metaEl) return;
    
    const count = modeCfg.count;
    const estimatedTime = Math.round(count * 1.5);
    const labels = { easy: '轻松', normal: '标准', hard: '挑战' };
    
    metaEl.innerHTML = 
      '<span class="meta-item">🎯 ' + modeCfg.label + '</span>' +
      '<span class="meta-item">📝 ' + count + '题</span>' +
      '<span class="meta-item">⏱️ 约' + estimatedTime + '分钟</span>' +
      '<span class="meta-item">🏆 生成通行证</span>';
  },

  renderModeSelect() {
    // Mode cards handled by event delegation; ensure selected reflects state
    document.querySelectorAll('.mode-card').forEach(function(card) {
      const isSel = card.dataset.mode === state.mode;
      card.classList.toggle('selected', isSel);
      card.setAttribute('aria-checked', isSel ? 'true' : 'false');
    });
    const settings = Storage.getSettings();
    state.soundOn = settings.soundOn;
    this.updateSoundToggle();
  },

  updateSoundToggle() {
    const tog = document.getElementById('sound-toggle');
    if (!tog) return;
    tog.classList.toggle('on', state.soundOn);
    tog.setAttribute('aria-checked', state.soundOn ? 'true' : 'false');
  },

  renderQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) return;
    const container = document.getElementById('question-container');
    state.answered = false;

    const catLabel = CONFIG.categories[q.category].label;
    const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
    const typeLabels = { choice: '选择题', audio: '语音题', scene: '场景题', character: '角色题' };

    let mediaHtml = '';
    if (q.type === 'audio') {
      const canPlay = AudioMgr.isSupported;
      mediaHtml = '<div class="media-area">' +
        '<div class="audio-player" id="audio-player">' +
          '<div class="ap-icon">💿</div>' +
          '<div class="audio-wave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>' +
          '<div class="ap-status" id="audio-status">点击下方按钮播放语音</div>' +
          '<button class="audio-play-btn" id="audio-play-btn" aria-label="播放语音"><span id="ap-btn-text">▶ 播放台词</span></button>' +
          (canPlay ? '' : '<div class="ap-hint">💡 提示：' + (q.voiceText || '') + '</div>') +
        '</div>' +
      '</div>';
    } else if (q.type === 'scene' || q.type === 'character') {
      mediaHtml = this.renderVisualQuestion(q);
    }

    const questionText = (q.type === 'scene' || q.type === 'character')
      ? '根据上方画面与描述，选出正确答案：'
      : q.question;

    let html = '<div class="question-card" id="q-card" data-type="' + q.type + '">' +
      '<div class="q-meta">' +
        '<span class="badge badge-type">' + typeLabels[q.type] + '</span>' +
        '<span class="badge badge-cat-' + q.category + '">' + catLabel + '</span>' +
        '<span class="badge badge-diff-' + q.difficulty + '">' + diffLabels[q.difficulty] + '</span>' +
      '</div>';

    if (q.type !== 'scene' && q.type !== 'character') {
      html += '<div class="q-text">' + this.escapeHtml(questionText) + '</div>';
    }

    html += mediaHtml;

    html += '<div class="options" id="options" role="group" aria-label="选项">';
    const keys = ['A', 'B', 'C', 'D'];
    q.options.forEach(function(opt, i) {
      html += '<button class="option-btn" data-index="' + i + '" role="radio" aria-checked="false" ' +
        'aria-label="选项 ' + keys[i] + '：' + opt + '" tabindex="0">' +
        '<span class="option-key">' + keys[i] + '</span>' +
        '<span class="option-text">' + UI.escapeHtml(opt) + '</span>' +
      '</button>';
    });
    html += '</div>';

    html += '<div class="feedback" id="feedback" role="alert" aria-live="assertive"></div>';
    html += '</div>';

    container.innerHTML = html;

    // Bind audio button
    if (q.type === 'audio') {
      const playBtn = document.getElementById('audio-play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', function() { UI.handleAudioPlay(); });
      }
    }

    // Bind option buttons
    container.querySelectorAll('.option-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(btn.dataset.index, 10);
        UI.handleAnswer(idx);
      });
    });

    // Reset next button
    const nextBtn = document.getElementById('btn-next');
    nextBtn.style.display = 'none';

    // Update progress
    this.updateProgress();
    state.questionStartTime = Date.now();
  },

  handleAudioPlay() {
    const q = state.questions[state.currentIndex];
    if (!q || q.type !== 'audio') return;
    const playBtn = document.getElementById('audio-play-btn');
    const status = document.getElementById('audio-status');
    const btnText = document.getElementById('ap-btn-text');
    const audioPlayer = document.getElementById('audio-player');

    if (!AudioMgr.isSupported) {
      if (status) status.textContent = '当前浏览器不支持语音合成';
      return;
    }

    playBtn.disabled = true;
    playBtn.classList.add('playing');
    if (audioPlayer) audioPlayer.classList.add('playing');
    if (btnText) btnText.textContent = '⏸ 播放中';
    if (status) status.textContent = '正在播放语音...';

    const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
    try { synth.cancel(); } catch (e) {}

    const utter = new SpeechSynthesisUtterance(q.voiceText);
    utter.lang = 'zh-CN';
    utter.rate = 0.9;
    utter.pitch = 1.0;
    const voices = synth.getVoices();
    const zhVoice = voices.find(function(v) { return v.lang && v.lang.indexOf('zh') === 0; });
    if (zhVoice) utter.voice = zhVoice;

    utter.onend = function() {
      playBtn.disabled = false;
      playBtn.classList.remove('playing');
      if (audioPlayer) audioPlayer.classList.remove('playing');
      if (btnText) btnText.textContent = '▶ 重新播放';
      if (status) status.textContent = '播放完毕，可重新播放';
    };
    utter.onerror = function() {
      playBtn.disabled = false;
      playBtn.classList.remove('playing');
      if (audioPlayer) audioPlayer.classList.remove('playing');
      if (btnText) btnText.textContent = '▶ 重新播放';
      if (status) status.textContent = '播放出错，可重试';
    };

    // Fallback: if onend doesn't fire within 5s, re-enable
    setTimeout(function() {
      if (playBtn.disabled) {
        playBtn.disabled = false;
        playBtn.classList.remove('playing');
        if (btnText) btnText.textContent = '▶ 重新播放';
        if (status) status.textContent = '点击重新播放';
      }
    }, 6000);

    try {
      synth.speak(utter);
    } catch (e) {
      playBtn.disabled = false;
      playBtn.classList.remove('playing');
      if (status) status.textContent = '播放失败';
    }
  },

  handleAnswer(selectedIndex) {
    if (state.answered || state.isTransitioning) return;
    state.answered = true;

    const q = state.questions[state.currentIndex];
    const correct = selectedIndex === q.answer;
    const timeTaken = (Date.now() - state.questionStartTime) / 1000;

    const result = Scoring.calculateScore(q, selectedIndex, timeTaken);
    Scoring.applyCombo(correct);

    let earnedPoints = 0;
    if (correct) {
      earnedPoints = result.points + Scoring.getComboBonus();
      state.score += earnedPoints;
    }

    // Record answer
    state.answers[state.currentIndex] = {
      selectedIndex: selectedIndex,
      correct: correct,
      earnedPoints: earnedPoints,
      basePoints: result.basePoints || 0,
      timeTaken: timeTaken
    };

    // Update UI: mark options
    const optionBtns = document.querySelectorAll('#options .option-btn');
    optionBtns.forEach(function(btn, i) {
      btn.disabled = true;
      if (i === q.answer) {
        btn.classList.add('correct');
        btn.setAttribute('aria-checked', 'true');
      } else if (i === selectedIndex && !correct) {
        btn.classList.add('wrong');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.add('faded');
      }
    });

    // Feedback
    const feedback = document.getElementById('feedback');
    const comboTxt = state.combo >= 2 ? ' · 连击 +' + Scoring.getComboBonus() : '';
    const timeTxt = correct && timeTaken <= CONFIG.timeBonusThreshold ? ' · 速度 +' + CONFIG.timeBonus : '';
    feedback.className = 'feedback show ' + (correct ? 'correct' : 'wrong');
    feedback.innerHTML =
      '<div class="fb-label">' + (correct ? '✅ 回答正确' : '❌ 回答错误') + '</div>' +
      '<div class="fb-exp">' + UI.escapeHtml(q.explanation) + '</div>' +
      (correct ? '<div class="fb-points">+' + earnedPoints + comboTxt + timeTxt + '</div>' : '');

    // Audio feedback
    AudioMgr.playFeedback(correct);

    // Combo indicator
    this.updateCombo();

    // Running score
    document.getElementById('running-score').textContent = state.score;

    // Show next button
    const nextBtn = document.getElementById('btn-next');
    const isLast = state.currentIndex >= state.questions.length - 1;
    nextBtn.textContent = isLast ? '查看结果 →' : '下一题 →';
    nextBtn.style.display = 'inline-flex';
  },

  updateCombo() {
    const ind = document.getElementById('combo-indicator');
    const count = document.getElementById('combo-count');
    if (state.combo >= 2) {
      ind.classList.add('show');
      count.textContent = state.combo;
      ind.classList.add('pulse');
      setTimeout(function() { ind.classList.remove('pulse'); }, 500);
    } else {
      ind.classList.remove('show');
    }
  },

  updateProgress() {
    const total = state.questions.length;
    const current = state.currentIndex + 1;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = ((current / total) * 100) + '%';
  },

  updateTimer() {
    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    const display = document.getElementById('timer');
    const text = document.getElementById('timer-text');
    if (text) text.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    if (display) {
      display.classList.remove('warning', 'danger');
      if (state.timeLeft <= 60) display.classList.add('danger');
      else if (state.timeLeft <= 180) display.classList.add('warning');
    }
  },

  updateQuizMeta() {
    const modeLabel = document.getElementById('mode-label');
    const questionCounter = document.getElementById('question-counter');
    if (modeLabel) {
      modeLabel.textContent = CONFIG.modes[state.mode].label;
    }
    if (questionCounter && state.questions) {
      questionCounter.textContent = (state.currentIndex + 1) + '/' + state.questions.length;
    }
  },

  renderResult() {
    const questions = state.questions;
    const answers = state.answers;
    const total = questions.length;
    let correctCount = 0;
    let totalEarned = 0;
    let totalTime = 0;

    questions.forEach(function(q, i) {
      if (answers[i] && answers[i].correct) {
        correctCount++;
        totalEarned += answers[i].earnedPoints;
      }
      if (answers[i]) totalTime += answers[i].timeTaken;
    });

    state.score = totalEarned;
    
    const knowledgePercent = Scoring.calculateKnowledgeScore(questions, answers);
    const competitiveMax = Scoring.getMaxCompetitiveScore(questions);
    const rank = Scoring.getRank(knowledgePercent);

    state.knowledgePercent = knowledgePercent;
    state.competitiveScore = totalEarned;
    state.competitiveMax = competitiveMax;

    // Rank display
    document.getElementById('rank-emoji').textContent = rank.emoji;
    document.getElementById('rank-title').textContent = rank.title;
    document.getElementById('rank-desc').textContent = rank.desc;
    
    const knowledgePercentRounded = Math.round(knowledgePercent);
    const knowledgeEl = document.getElementById('metric-knowledge');
    if (knowledgeEl) {
      knowledgeEl.textContent = knowledgePercentRounded + '%';
    }
    const knowledgeBar = document.getElementById('metric-bar-knowledge');
    if (knowledgeBar) {
      knowledgeBar.style.width = knowledgePercentRounded + '%';
    }
    
    const competitiveEl = document.getElementById('metric-competitive');
    if (competitiveEl) {
      competitiveEl.textContent = totalEarned + '/' + competitiveMax;
    }
    const competitiveBar = document.getElementById('metric-bar-competitive');
    if (competitiveBar) {
      const competitivePct = competitiveMax > 0 ? Math.round((totalEarned / competitiveMax) * 100) : 0;
      competitiveBar.style.width = competitivePct + '%';
    }

    // Kanban comment
    const kanbanEl = document.getElementById('kanban-text');
    if (kanbanEl) {
      let comment = '';
      if (knowledgePercent >= 90) comment = '哇！你是真正的次元大师！小星对你佩服得五体投地～ 🌟';
      else if (knowledgePercent >= 75) comment = '好厉害！你的二次元知识相当渊博呢，继续加油！✨';
      else if (knowledgePercent >= 60) comment = '不错哦！已经有不错的基础了，再多看看番吧～ 💪';
      else if (knowledgePercent >= 40) comment = '还需要继续修行呢！推荐几部经典番剧补一补～ 📺';
      else comment = '欢迎来到二次元世界！从热门番剧开始入门吧～ 🌱';
      kanbanEl.textContent = comment;
    }

    // Stats grid
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const avgTime = total > 0 ? Math.round(totalTime / total) : 0;
    const statsHtml =
      '<div class="stat-item"><div class="si-value">' + correctCount + '/' + total + '</div><div class="si-label">正确数</div></div>' +
      '<div class="stat-item"><div class="si-value">' + accuracy + '%</div><div class="si-label">正确率</div></div>' +
      '<div class="stat-item"><div class="si-value">' + state.maxCombo + '</div><div class="si-label">最高连击</div></div>' +
      '<div class="stat-item"><div class="si-value">' + avgTime + 's</div><div class="si-label">平均用时</div></div>';
    document.getElementById('stats-grid').innerHTML = statsHtml;

    // Category breakdown
    const catScores = Scoring.getCategoryScores(questions, answers);
    let hasReliableCategory = false;
    const catHtml = Object.keys(CONFIG.categories).map(function(cat) {
      const info = CONFIG.categories[cat];
      const sc = catScores[cat] || { correct: 0, total: 0, earnedBase: 0, totalBase: 0 };
      
      if (sc.total === 0) {
        return '<div class="cat-row">' +
          '<span class="cat-dot" style="background:' + info.color + '"></span>' +
          '<span class="cat-name">' + info.label + '</span>' +
          '<span class="cat-status cat-insufficient">未覆盖</span>' +
        '</div>';
      } else if (sc.total <= 2) {
        return '<div class="cat-row">' +
          '<span class="cat-dot" style="background:' + info.color + '"></span>' +
          '<span class="cat-name">' + info.label + '</span>' +
          '<span class="cat-status cat-insufficient">样本不足 · ' + sc.correct + '/' + sc.total + '</span>' +
        '</div>';
      } else {
        hasReliableCategory = true;
        const pct = sc.totalBase > 0 ? Math.round((sc.earnedBase / sc.totalBase) * 100) : 0;
        return '<div class="cat-row">' +
          '<span class="cat-dot" style="background:' + info.color + '"></span>' +
          '<span class="cat-name">' + info.label + '</span>' +
          '<div class="cat-bar"><div class="cat-bar-fill" style="width:' + pct + '%;background:' + info.gradient + '"></div></div>' +
          '<span class="cat-pct">' + pct + '% · ' + sc.correct + '/' + sc.total + '</span>' +
        '</div>';
      }
    }).join('');
    document.getElementById('cat-breakdown').innerHTML = catHtml;
    
    if (!hasReliableCategory) {
      document.getElementById('cat-breakdown').innerHTML += '<div class="cat-no-reliable">💡 完成更多同类题目后生成可靠画像</div>';
    }

    // Review list
    this.renderReview(questions, answers);

    // Radar chart
    this.drawRadar(catScores);

    // Generate tags based on performance
    const tags = [];
    tags.push(rank.title);
    let bestCat = '';
    let bestPct = 0;
    Object.keys(catScores).forEach(function(cat) {
      const sc = catScores[cat];
      if (sc.total < 3) return;
      const pct = sc.totalBase > 0 ? Math.round((sc.earnedBase / sc.totalBase) * 100) : 0;
      if (pct > bestPct) {
        bestPct = pct;
        bestCat = CONFIG.categories[cat].label;
      }
    });
    if (bestCat) tags.push(bestCat + '达人');
    if (correctCount === total) tags.push('全对大神');
    else if (accuracy >= 80) tags.push('准度惊人');
    else if (accuracy >= 60) tags.push('稳扎稳打');
    if (state.maxCombo >= 5) tags.push('连击王者');
    if (avgTime <= 5) tags.push('神速通关');

    // Save result
    const result = {
      score: totalEarned,
      percentage: knowledgePercent,
      knowledgePercent: knowledgePercent,
      competitiveScore: totalEarned,
      competitiveMax: competitiveMax,
      rankEmoji: rank.emoji,
      rankTitle: rank.title,
      tier: rank.title,
      mode: CONFIG.modes[state.mode].label,
      correct: correctCount,
      total: total,
      tags: tags.slice(0, 6),
      date: new Date().toISOString(),
      totalTime: CONFIG.totalTime - state.timeLeft,
      categoryStats: catScores
    };
    Storage.saveResult(result);

    // Character matching
    const dimScores = CharacterMatcher.calculateDimensionScores(questions, answers);
    const matchResult = CharacterMatcher.match(dimScores);
    state.characterResult = matchResult;
    
    this.renderCharacterCard(matchResult);

    // Check achievements
    const newlyUnlocked = Achievement.checkAll(result);
    UI.renderResultAchievements(newlyUnlocked);
  },
  
  renderCharacterCard(result) {
    const c = result.character;
    const dim = result.dimensionScores;
    
    const rarityColors = { SSR: '#FFD700', SR: '#9932CC', R: '#4169E1' };
    const rarityGlow = { SSR: '0 0 30px rgba(255,215,0,0.6)', SR: '0 0 30px rgba(153,50,204,0.6)', R: '0 0 20px rgba(65,105,225,0.4)' };
    
    const avatarEmojis = {
      '战术大师·鲁路修型': '👑',
      '究极生物·DIO型': '🦇',
      '最强咒术师·五条悟型': '👓',
      '进击巨人·艾伦型': '⚔️',
      '骑士王·Saber型': '⚔️',
      '超能力少女·阿尼亚型': '🧠',
      '鬼族少女·祢豆子型': '🌸',
      '女仆恶魔·蕾姆型': '🧹',
      '龙女仆·康娜型': '🐉',
      '黑衣剑士·桐人型': '⚔️',
      '嘴平少年·炭治郎型': '🔥',
      '爆裂魔法·惠惠型': '💥',
      '万事屋老板·银时型': '🍬',
      '普通二次元爱好者': '🎮',
      '轻度宅': '🍵',
      '硬核考据党': '🔍',
      '梗图大师': '😂',
      '声优控': '🎤',
      '游戏肝帝': '🎯',
      '动画收藏家': '📺'
    };
    
    const emoji = avatarEmojis[c.name] || '🎭';
    
    const dimDisplay = {};
    Object.keys(dim).forEach(function(key) {
      dimDisplay[key] = dim[key] > 0 ? dim[key] : Math.floor(Math.random() * 11) + 10;
    });
    
    const cardHtml = 
      '<div class="character-card-container" style="background: linear-gradient(135deg, ' + c.colors[0] + '20, ' + c.colors[1] + '20);">' +
        '<div class="character-card" style="border-color: ' + rarityColors[c.rarity] + '; box-shadow: ' + rarityGlow[c.rarity] + ';">' +
          '<div class="character-rarity" style="background: ' + rarityColors[c.rarity] + ';">' + c.rarity + '</div>' +
          '<div class="character-header">' +
            '<div class="character-avatar">' +
              '<div class="avatar-bg" style="background: linear-gradient(180deg, ' + c.colors[0] + ', ' + c.colors[1] + ');"></div>' +
              '<span class="avatar-emoji">' + emoji + '</span>' +
            '</div>' +
            '<div class="character-info">' +
              '<h3 class="character-name">' + c.name + '</h3>' +
              '<p class="character-title">' + c.title + '</p>' +
              '<div class="match-score" style="color: ' + rarityColors[c.rarity] + ';">匹配度 ' + result.matchScore + '%</div>' +
            '</div>' +
          '</div>' +
          '<div class="dimension-grid">' +
            '<div class="dim-item"><div class="dim-bar" style="width:' + dimDisplay.passion + '%;background:#FF6B9D"></div><span>热血度</span><span class="dim-val">' + dimDisplay.passion + '%</span></div>' +
            '<div class="dim-item"><div class="dim-bar" style="width:' + dimDisplay.gaming + '%;background:#72CFF5"></div><span>游戏力</span><span class="dim-val">' + dimDisplay.gaming + '%</span></div>' +
            '<div class="dim-item"><div class="dim-bar" style="width:' + dimDisplay.voice + '%;background:#A996F7"></div><span>声优控</span><span class="dim-val">' + dimDisplay.voice + '%</span></div>' +
            '<div class="dim-item"><div class="dim-bar" style="width:' + dimDisplay.meme + '%;background:#F4B84B"></div><span>玩梗力</span><span class="dim-val">' + dimDisplay.meme + '%</span></div>' +
            '<div class="dim-item"><div class="dim-bar" style="width:' + dimDisplay.knowledge + '%;background:#79D9C0"></div><span>博学度</span><span class="dim-val">' + dimDisplay.knowledge + '%</span></div>' +
            '<div class="dim-item"><div class="dim-bar" style="width:' + dimDisplay.reaction + '%;background:#FF9F43"></div><span>反应力</span><span class="dim-val">' + dimDisplay.reaction + '%</span></div>' +
          '</div>' +
          '<div class="character-quote">"' + c.quote + '"</div>' +
          '<div class="character-partner">' +
            '<span class="partner-label">💝 灵魂伴侣</span>' +
            '<span class="partner-name">' + c.partner.name + '</span>' +
            '<span class="partner-compat">兼容性 ' + c.partner.compatibility + '%</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    
    const container = document.getElementById('character-card-container');
    if (container) {
      container.innerHTML = cardHtml;
    } else {
      const resultPage = document.getElementById('page-result');
      const kanban = document.querySelector('.kanban-comment');
      const newContainer = document.createElement('div');
      newContainer.id = 'character-card-container';
      newContainer.innerHTML = cardHtml;
      kanban.insertAdjacentElement('afterend', newContainer);
    }
  },

  renderReview(questions, answers) {
    const wrongQuestions = questions.filter(function(q, i) {
      const ans = answers[i] || {};
      return !ans.correct;
    });
    const wrongAnswers = answers.filter(function(a) { return !a.correct; });
    const wrongIndices = questions.map(function(q, i) {
      const ans = answers[i] || {};
      return ans.correct ? -1 : i;
    }).filter(function(i) { return i >= 0; });

    if (wrongQuestions.length === 0) {
      document.getElementById('review-list').innerHTML = '<div class="review-empty">🎉 太棒了！你全部答对了，没有错题需要回顾～</div>';
      return;
    }

    const html = wrongQuestions.map(function(q, idx) {
      const originalIndex = wrongIndices[idx];
      const ans = wrongAnswers[idx] || {};
      const userAns = ans.selectedIndex !== undefined ? q.options[ans.selectedIndex] : '未作答';
      const correctAns = q.options[q.answer];
      return '<div class="review-item wrong">' +
        '<div class="ri-q">' + (originalIndex + 1) + '. ' + UI.escapeHtml(q.question) + '</div>' +
        '<div class="ri-ans">' +
          '<span class="ri-tag user-wrong">你的：' + UI.escapeHtml(userAns) + '</span>' +
          '<span class="ri-tag correct-ans">正确：' + UI.escapeHtml(correctAns) + '</span>' +
        '</div>' +
        '<div class="ri-exp">' + UI.escapeHtml(q.explanation) + '</div>' +
      '</div>';
    }).join('');
    document.getElementById('review-list').innerHTML = html;
  },
  updateAchievementCount() {
    const unlocked = Achievement.getUnlockedCount();
    const total = Achievement.getTotalCount();
    const el = document.getElementById('achievement-count');
    if (el) el.textContent = unlocked + '/' + total;
  },
  renderAchievementPanel() {
    const achievements = Achievement.getUnlockedList();
    const unlocked = Achievement.getUnlockedCount();
    const total = Achievement.getTotalCount();

    document.getElementById('achievement-panel-progress').textContent = '已解锁 ' + unlocked + '/' + total;

    const html = achievements.map(function(ach) {
      const rarityClass = 'rarity-' + ach.rarity;
      const statusClass = ach.unlocked ? 'unlocked' : 'locked';
      const icon = ach.unlocked ? ach.icon : '❓';
      const time = ach.unlocked ? Achievement.formatTime(ach.unlockedAt) : '未解锁';
      return '<div class="achievement-card ' + rarityClass + ' ' + statusClass + '">' +
        '<div class="achievement-icon">' + icon + '</div>' +
        '<div class="achievement-card-name">' + ach.name + '</div>' +
        '<div class="achievement-card-desc">' + ach.description + '</div>' +
        '<div class="achievement-card-time">' + time + '</div>' +
        '<div class="achievement-badge">' + (ach.rarity === 1 ? 'S' : ach.rarity === 2 ? 'SS' : 'SSS') + '</div>' +
      '</div>';
    }).join('');

    document.getElementById('achievement-grid').innerHTML = html;
    document.getElementById('achievement-modal').classList.add('active');
  },
  hideAchievementPanel() {
    document.getElementById('achievement-modal').classList.remove('active');
  },
  renderResultAchievements(newlyUnlocked) {
    const el = document.getElementById('result-achievements');
    const listEl = document.getElementById('result-achievements-list');

    if (!newlyUnlocked || newlyUnlocked.length === 0) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    const html = newlyUnlocked.map(function(ach, idx) {
      const rarityClass = 'rarity-' + ach.rarity;
      return '<div class="result-achievement-card achievement-card ' + rarityClass + ' unlocked" style="animation-delay: ' + (idx * 0.15) + 's">' +
        '<div class="achievement-icon">' + ach.icon + '</div>' +
        '<div class="achievement-card-name">' + ach.name + '</div>' +
        '<div class="achievement-card-desc">' + ach.description + '</div>' +
      '</div>';
    }).join('');
    listEl.innerHTML = html;

    newlyUnlocked.forEach(function(ach, idx) {
      setTimeout(function() { UI.showAchievementUnlockToast(ach); }, idx * 1000);
    });
  },
  showAchievementUnlockToast(ach) {
    const toast = document.getElementById('achievement-unlock-toast');
    const icon = document.getElementById('achievement-unlock-icon');
    const title = document.getElementById('achievement-unlock-title');
    const desc = document.getElementById('achievement-unlock-desc');
    const badge = document.getElementById('achievement-unlock-badge');

    toast.className = 'achievement-unlock-toast rarity-' + ach.rarity;
    icon.textContent = ach.icon;
    title.textContent = '🎉 ' + ach.name;
    desc.textContent = ach.description;
    badge.textContent = ach.rarity === 1 ? '普通' : ach.rarity === 2 ? '稀有' : '传奇';

    toast.classList.add('show');

    setTimeout(function() {
      toast.classList.remove('show');
    }, 2500);
  },

  drawRadar(catScores) {
    const area = document.getElementById('radarArea');
    const svg = document.getElementById('radarSvg');
    
    if (!area || !svg) return;
    
    const cats = Object.keys(CONFIG.categories);
    const n = cats.length;
    const labels = cats.map(function(c) { return CONFIG.categories[c].label; });
    const colors = cats.map(function(c) { return CONFIG.categories[c].color; });
    
    const values = cats.map(function(c) {
      const sc = catScores[c] || { correct: 0, total: 0, earnedBase: 0, totalBase: 0 };
      if (sc.total < 3) return 0;
      return sc.totalBase > 0 ? sc.earnedBase / sc.totalBase : 0;
    });
    
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = 90;
    
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    
    svg.innerHTML = `
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,248,250,0.9)" />
          <stop offset="100%" stop-color="rgba(248,250,255,0.5)" />
        </radialGradient>
        <radialGradient id="dataGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,143,163,0.3)" />
          <stop offset="50%" stop-color="rgba(179,136,235,0.18)" />
          <stop offset="100%" stop-color="rgba(126,212,245,0.06)" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${maxRadius + 8}" fill="url(#bgGrad)" />
    `;
    
    const levels = 4;
    for (let lv = 1; lv <= levels; lv++) {
      const r = (maxRadius / levels) * lv;
      let pts = '';
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        pts += (cx + Math.cos(angle) * r) + ',' + (cy + Math.sin(angle) * r) + ' ';
      }
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', pts.trim());
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', lv === levels ? '#FFD4E0' : '#E8E8E8');
      poly.setAttribute('stroke-width', lv === levels ? '1.5' : '1');
      svg.appendChild(poly);
    }
    
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * maxRadius;
      const y = cy + Math.sin(angle) * maxRadius;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', x); line.setAttribute('y2', y);
      line.setAttribute('stroke', 'rgba(255,143,163,0.12)');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    
    const dataPts = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      const r = Math.max(maxRadius * values[i], maxRadius * 0.1);
      dataPts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        color: colors[i]
      });
    }
    
    const ptsStr = dataPts.map(function(p) { return p.x + ',' + p.y; }).join(' ');
    const dataPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    dataPoly.setAttribute('points', ptsStr);
    dataPoly.setAttribute('fill', 'url(#dataGrad)');
    dataPoly.setAttribute('stroke', '#FF8FA3');
    dataPoly.setAttribute('stroke-width', '2');
    dataPoly.setAttribute('filter', 'url(#glow)');
    dataPoly.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(dataPoly);
    
    dataPts.forEach(function(p) {
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outer.setAttribute('cx', p.x); outer.setAttribute('cy', p.y);
      outer.setAttribute('r', '5');
      outer.setAttribute('fill', p.color);
      svg.appendChild(outer);
      
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('cx', p.x); inner.setAttribute('cy', p.y);
      inner.setAttribute('r', '2.5');
      inner.setAttribute('fill', '#FFFFFF');
      svg.appendChild(inner);
    });
    
    const existingLabels = area.querySelectorAll('.cat-label');
    existingLabels.forEach(function(el) { el.remove(); });
    
    const labelR = maxRadius + 25;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      const x = (cx + Math.cos(angle) * labelR) / size * 100;
      const y = (cy + Math.sin(angle) * labelR) / size * 100;
      const pct = Math.round(values[i] * 100);
      const color = colors[i];
      
      const div = document.createElement('div');
      div.className = 'cat-label';
      div.style.left = x + '%';
      div.style.top = y + '%';
      div.style.transform = 'translate(-50%, -50%)';
      div.innerHTML = 
        '<div class="cat-name" style="border-color: ' + color + '; color: ' + color + ';">' + 
          labels[i] + 
        '</div>' +
        '<div class="cat-pct" style="border-color: ' + color + '; color: ' + color + ';">' + 
          pct + '%' + 
        '</div>';
      area.appendChild(div);
    }
    
    this.renderCommentary(catScores);
  },
  
  renderCommentary(catScores) {
    const container = document.getElementById('radar-commentary');
    if (!container) return;
    
    const cats = Object.keys(CONFIG.categories);
    const catPcts = cats.map(function(c) {
      const sc = catScores[c] || { correct: 0, total: 0 };
      return sc.total > 0 ? Math.round((sc.correct / sc.total) * 100) : 0;
    });
    
    const totalCorrect = Object.values(catScores).reduce(function(sum, sc) {
      return sum + sc.correct;
    }, 0);
    const total = Object.values(catScores).reduce(function(sum, sc) {
      return sum + sc.total;
    }, 0);
    const overallPct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
    
    const maxPct = Math.max.apply(null, catPcts);
    const minPct = Math.min.apply(null, catPcts);
    const avgPct = catPcts.reduce(function(a, b) { return a + b; }, 0) / catPcts.length;
    const range = maxPct - minPct;
    
    const bestCat = cats[catPcts.indexOf(maxPct)];
    const worstCat = cats[catPcts.indexOf(minPct)];
    
    let typeStr;
    if (range >= 60) typeStr = '偏科型';
    else if (range >= 40) typeStr = '特长型';
    else typeStr = '全能型';
    
    let levelStr;
    if (avgPct >= 80) levelStr = '大佬级';
    else if (avgPct >= 60) levelStr = '资深型';
    else if (avgPct >= 40) levelStr = '进阶型';
    else levelStr = '萌新型';
    
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    
    const openings = [
      '呐呐，雷达图分析好啦的说！(≡^∇^≡)',
      '喏，数据算完啦～ ฅ(＾・ω・＾ฅ)',
      '嘛，让本喵看看你的成绩单呐～',
      '哒哒！分析报告新鲜出炉啦喵～',
      '呜哇～主人的雷达图好有趣喵！(*°▽°*)',
      '锵锵！本喵分析完啦的说～✧',
      '嘿嘿，让本喵来解读一下呐～',
      '叮咚！你的专属分析来啦喵～'
    ];
    
    const typeDescs = {
      '偏科型': [
        '主人的雷达图像个尖尖的星星呢，有一项特别突出喵！',
        '哇哦，偏科偏得好明显呐！不过这就是主人的特色哒～',
        '雷达图歪歪的，不过歪得好可爱喵！(◉ω◉)'
      ],
      '特长型': [
        '主人的雷达图有个小角角凸出来啦，很有个性的说～',
        '嗯嗯，有一项特别擅长呢，雷达图都鼓起来了喵！',
        '看得出来主人有明确的擅长领域呐，不错的说！(๑•̀ㅂ•́)و✧'
      ],
      '全能型': [
        '主人的雷达图好圆润呐，各项能力都很均衡喵～',
        '哇，雷达图几乎是正多边形呢，全能选手的说！(✧ω✧)',
        '每条边都差不多长呢，主人很稳哒～'
      ]
    };
    
    const levelDescs = {
      '大佬级': [
        '这个水平已经是二次元老司机啦喵！膜拜～',
        '大佬大佬！请收下本喵的膝盖呐！(>ω<)',
        '这浓度已经爆表了喵，二次元灵魂认证哒！'
      ],
      '资深型': [
        '看得出主人是有功底的呐，继续磨练会更强喵～',
        '基础扎实，假以时日一定能成为大佬的说！(ง •̀_•́)ง',
        '嗯嗯，资深玩家的气息感受到了喵～'
      ],
      '进阶型': [
        '正在成长的路上呐，势头很好的说喵！',
        '萌新进阶中～ 再努力一把就能升级啦哒！(๑˃̵ᴗ˂̵)و',
        '有潜力的说！二次元之路才刚开始呐喵～'
      ],
      '萌新型': [
        '没关系喵，每个大佬都是从萌新开始的哒～',
        '萌新也有萌新的可爱呐，慢慢来就好啦！(｡•̀ᴗ-)✧',
        '起步阶段不要急喵，享受过程最重要哒～'
      ]
    };
    
    const bestPraise = {
      anime: [
        '番剧知识超厉害的呐！各种热门番剧都逃不过主人的眼睛哒～',
        '追番量好惊人喵！经典新番全都装进脑子里了呢(≧∇≦)',
        '番剧这块拿捏得死死的喵，看来是老追番人了的说！'
      ],
      game: [
        '游戏方面简直是百科全书喵！手游主机都难不倒的说！(≧∇≦)',
        '游戏知识满分呐！看来主人没少肝游戏的说～🎮',
        '游戏领域好强喵！各种类型都涉猎了呐，佩服哒！'
      ],
      voice: [
        '声优鉴定能力好强喵！光听声音就能认出来，耳朵好灵的说～',
        '声优知识了得呐！那些声优的声线都刻进DNA了吧喵！🎧',
        '声优方面超灵敏的说～简直是行走的声优图鉴喵！'
      ],
      meme: [
        '网络梗全部拿下喵！冲浪达人的说的呢～🌊',
        '梗文化掌握得好透彻呐，张口就是老梗王了喵！😂',
        '网络流行语一个不落喵，5G冲浪选手认证哒！'
      ],
      knowledge: [
        '综合知识储备惊人喵！动漫文化什么都难不倒哒！(✧ω✧)',
        '知识面好广呐！看来主人是博览群番的说～📚',
        '综合常识好扎实喵，二次元学霸无疑了哒！'
      ]
    };
    
    const worstAdvice = {
      anime: [
        '不过番剧方面还要多补补呐，多看看新番就会进步的哒～',
        '番剧知识还要加油喵，补番列表安排起来的说！📺',
        '番剧这块再努努力呐，好番还有很多等着主人发现喵～'
      ],
      game: [
        '游戏知识还有提升空间喵，多玩玩不同类型就好啦呐！',
        '游戏方面可以多试试新类型哦，会发现新世界的喵～🎮',
        '游戏储备再加加油呐，每款游戏都有它的魅力哒！'
      ],
      voice: [
        '声优方面要多听多记哦，下次一定能认出来更多的喵～',
        '声优知识慢慢来呐，多关注声优事务所的信息就好哒！',
        '声优这块多积累喵，听得多了自然就记住的说～🎧'
      ],
      meme: [
        '网络梗还要多关注呐，跟上时代的步伐哒！(ง •_•)ง',
        '梗文化需要多冲浪喵，贴吧微博逛起来呐～',
        '网络流行语要时时更新哒，不然就out了喵！'
      ],
      knowledge: [
        '综合知识慢慢积累就好喵，多看看动漫资料的说～',
        '综合常识可以多读多看呐，知识就是力量的喵！📖',
        '综合方面别着急哒，日积月累就能变强喵～'
      ]
    };
    
    const endingsHigh = [
      '继续保持下去，主人就是二次元世界的王者啦喵！★▽★',
      '这个实力已经可以横着走了呐，本喵好崇拜哒～(>ω<)',
      '二次元浓度拉满喵！请务必收下本喵的敬意呐！✧*。٩(ˊᗜˋ*)و✧*。',
      '太强了喵！主人就是传说中的六边形战士哒～🌟'
    ];
    
    const endingsMedium = [
      '继续加油呐，下次一定能更厉害的喵！加油加油～(ง •̀_•́)ง',
      '还有上升空间哒，本喵相信主人下次能突破的喵！(๑˃̵ᴗ˂̵)و',
      '稳扎稳打就好呐，进步是一点点积累的说～💪',
      '不要停下脚步喵，二次元之路还长着呐哒～✨'
    ];
    
    const endingsLow = [
      '不要灰心喵，多多学习下次一定能突破的哒！✧( • ̀ω•́ )✧',
      '萌新也有无限可能呐，每个大佬都从这里出发哒～(｡•̀ᴗ-)✧',
      '慢慢来不着急喵，享受二次元的过程最重要呐！💫',
      '加油加油喵！本喵会一直给主人应援的说的！₍₍ ◝(●˙꒳˙●)◜ ₎₎'
    ];
    
    let endings;
    if (overallPct >= 80) endings = endingsHigh;
    else if (overallPct >= 50) endings = endingsMedium;
    else endings = endingsLow;
    
    const openingText = pick(openings);
    const typeDesc = pick(typeDescs[typeStr]);
    const levelDesc = pick(levelDescs[levelStr]);
    const praiseText = pick(bestPraise[bestCat] || bestPraise.anime);
    const adviceText = worstCat !== bestCat ? pick(worstAdvice[worstCat] || worstAdvice.anime) : '';
    const endingText = pick(endings);
    
    let fullText = openingText + '主人是<strong>' + typeStr + ' · ' + levelStr + '</strong>选手喵！';
    fullText += typeDesc + levelDesc;
    fullText += praiseText;
    if (adviceText) fullText += adviceText;
    fullText += endingText;
    
    container.innerHTML = fullText;
  },

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 2500);
  },

  renderVisualQuestion(q) {
    var svgContent = VISUAL_SVG[q.id];
    var typeLabel = q.type === 'scene' ? '场景档案' : '角色档案';
    var typeIcon = q.type === 'scene' ? '🎬' : '👤';
    var ariaLabel = q.type === 'scene' ? '原创场景示意图，根据画面与文字选出答案' : '原创角色特征图，根据画面与文字选出答案';
    var visualHtml = '';
    if (svgContent) {
      visualHtml = '<div class="visual-panel">' +
        '<div class="vp-header">' +
          '<span class="vp-badge">' + typeIcon + ' ' + typeLabel + '</span>' +
          '<span class="vp-tag">原创插画</span>' +
        '</div>' +
        '<div class="vp-canvas">' +
          '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" ' +
          'aria-label="' + ariaLabel + '" class="vp-svg" preserveAspectRatio="xMidYMid meet">' +
          svgContent +
          '</svg>' +
        '</div>' +
        '<div class="vp-desc">' + UI.escapeHtml(q.question) + '</div>' +
      '</div>';
    } else {
      visualHtml = '<div class="visual-panel">' +
        '<div class="vp-header"><span class="vp-badge">' + typeIcon + ' ' + typeLabel + '</span></div>' +
        '<div class="vp-desc">' + UI.escapeHtml(q.question) + '</div>' +
      '</div>';
    }
    return '<div class="media-area">' + visualHtml + '</div>';
  },

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

// ============ EVENTS & FLOW ============
function startQuiz() {
  state.questions = QuestionSelector.select(state.mode);
  state.currentIndex = 0;
  state.answers = [];
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.timeLeft = CONFIG.totalTime;
  state.startTime = Date.now();
  state.answered = false;
  state.isTransitioning = false;

  UI.showPage('quiz');
  UI.renderQuestion();
  UI.updateTimer();
  UI.updateQuizMeta();

  // Start timer
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(function() {
    state.timeLeft--;
    UI.updateTimer();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      UI.showToast('时间到！自动提交');
      finishQuiz();
    }
  }, 1000);
}

function nextQuestion() {
  if (state.isTransitioning) return;
  state.isTransitioning = true;
  setTimeout(function() {
    state.isTransitioning = false;
  }, 300);

  if (state.currentIndex >= state.questions.length - 1) {
    finishQuiz();
    return;
  }
  state.currentIndex++;
  UI.renderQuestion();
  UI.updateQuizMeta();
  document.getElementById('running-score').textContent = state.score;
}

function finishQuiz() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  AudioMgr.stopSpeak();
  UI.showPage('result');
  UI.renderResult();
}

function shareResult() {
  const questions = state.questions;
  let correctCount = 0;
  questions.forEach(function(q, i) {
    if (state.answers[i] && state.answers[i].correct) correctCount++;
  });
  const total = questions.length;
  const rankTitle = document.getElementById('rank-title').textContent;
  const rankEmoji = document.getElementById('rank-emoji').textContent;
  const modeLabel = CONFIG.modes[state.mode].label;
  const knowledgePct = Math.round(state.knowledgePercent || 0);
  const competitiveScore = Math.round(state.competitiveScore || 0);
  const competitiveMax = Math.round(state.competitiveMax || 0);
  
  let charText = '';
  if (state.characterResult) {
    const c = state.characterResult.character;
    const dim = state.characterResult.dimensionScores;
    charText = '\n🎭 角色身份：' + c.name + '\n' +
      '🏆 称号：' + c.title + '\n' +
      '⭐ 稀有度：' + c.rarity + '\n' +
      '📊 匹配度：' + state.characterResult.matchScore + '%\n' +
      '💝 灵魂伴侣：' + c.partner.name + '（兼容性' + c.partner.compatibility + '%）\n';
  }
  
  const text = '【二次元浓度测试】\n' +
    rankEmoji + ' ' + rankTitle + '\n' +
    '📚 知识得分：' + knowledgePct + '%\n' +
    '⚡ 竞技得分：' + competitiveScore + '/' + competitiveMax + '\n' +
    '✓ 正确：' + correctCount + '/' + total + '\n' +
    '🔥 最高连击：' + state.maxCombo + '\n' +
    '🎮 模式：' + modeLabel + '\n' +
    charText +
    '快来测测你的二次元浓度吧！';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      UI.showToast('成绩已复制到剪贴板！');
    }).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    UI.showToast('成绩已复制到剪贴板！');
  } catch (e) {
    UI.showToast('复制失败，请手动截图分享');
  }
}

function restartQuiz() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  AudioMgr.stopSpeak();
  state.questions = [];
  state.currentIndex = 0;
  state.answers = [];
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.timeLeft = CONFIG.totalTime;
  state.startTime = null;
  state.answered = false;
  state.isTransitioning = false;
  state.knowledgePercent = 0;
  state.competitiveScore = 0;
  state.competitiveMax = 0;
  UI.showPage('mode');
  UI.renderModeSelect();
}

function backToHome() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  AudioMgr.stopSpeak();
  state.questions = [];
  state.currentIndex = 0;
  state.answers = [];
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.timeLeft = CONFIG.totalTime;
  state.startTime = null;
  state.answered = false;
  state.isTransitioning = false;
  state.knowledgePercent = 0;
  state.competitiveScore = 0;
  state.competitiveMax = 0;
  UI.showPage('welcome');
  UI.renderWelcome();
}

function selectMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-card').forEach(function(card) {
    const isSel = card.dataset.mode === mode;
    card.classList.toggle('selected', isSel);
    card.setAttribute('aria-checked', isSel ? 'true' : 'false');
  });
  UI.updateModeMeta();
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  Storage.saveSettings({ soundOn: state.soundOn });
  UI.updateSoundToggle();
}

// ============ KEYBOARD ============
function handleKeyboard(e) {
  if (state.currentPage !== 'quiz') {
    if (e.key === 'Escape') {
      backToHome();
      e.preventDefault();
      return;
    }
    const activeEl = document.activeElement;
    if (activeEl && (e.key === 'Enter' || e.key === ' ')) {
      if (activeEl.tagName === 'BUTTON' || activeEl.classList.contains('btn') || activeEl.classList.contains('mode-card')) {
        activeEl.click();
        e.preventDefault();
      }
    }
    return;
  }

  // 1-4 select option (only if not answered)
  if (!state.answered && !state.isTransitioning) {
    if (e.key >= '1' && e.key <= '4') {
      const idx = parseInt(e.key, 10) - 1;
      const q = state.questions[state.currentIndex];
      if (q && idx < q.options.length) {
        UI.handleAnswer(idx);
        e.preventDefault();
      }
    }
  }

  // Enter for next
  if (e.key === 'Enter' && state.answered) {
    nextQuestion();
    e.preventDefault();
  }

  // Escape to go back
  if (e.key === 'Escape') {
    if (confirm('确定要退出本次测试吗？当前进度将丢失。')) {
      backToHome();
    }
    e.preventDefault();
  }
}

// ============ INIT ============
function bindEvents() {
  // Welcome page
  document.getElementById('btn-start-welcome').addEventListener('click', function() {
    UI.showPage('mode');
    UI.renderModeSelect();
  });
  document.getElementById('btn-show-history').addEventListener('click', function() {
    UI.showPage('welcome');
    UI.renderWelcome();
    UI.scrollToHistory();
  });
  document.getElementById('btn-mode-choose').addEventListener('click', function() {
    UI.showPage('mode');
    UI.renderModeSelect();
  });
  document.getElementById('btn-reset-data').addEventListener('click', function() {
    document.getElementById('reset-modal').style.display = 'flex';
    document.getElementById('btn-cancel-reset').focus();
  });
  document.getElementById('btn-cancel-reset').addEventListener('click', function() {
    document.getElementById('reset-modal').style.display = 'none';
  });
  document.getElementById('btn-confirm-reset').addEventListener('click', function() {
    document.getElementById('reset-modal').style.display = 'none';
    localStorage.removeItem('anime-test-data-v1');
    alert('历史记录已清除');
    UI.renderWelcome();
  });
  document.getElementById('reset-modal').addEventListener('click', function(e) {
    if (e.target.id === 'reset-modal') {
      document.getElementById('reset-modal').style.display = 'none';
    }
  });
  document.getElementById('btn-achievements').addEventListener('click', function() {
    UI.renderAchievementPanel();
  });
  document.getElementById('achievement-close').addEventListener('click', function() {
    UI.hideAchievementPanel();
  });
  document.getElementById('achievement-modal').addEventListener('click', function(e) {
    if (e.target.id === 'achievement-modal') {
      UI.hideAchievementPanel();
    }
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      UI.hideAchievementPanel();
      document.getElementById('reset-modal').style.display = 'none';
      document.getElementById('leave-modal').style.display = 'none';
    }
  });

  // Mode select
  document.querySelectorAll('.mode-card').forEach(function(card) {
    card.addEventListener('click', function() { selectMode(card.dataset.mode); });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        selectMode(card.dataset.mode);
        e.preventDefault();
      }
    });
  });
  document.getElementById('btn-start-quiz').addEventListener('click', startQuiz);
  document.getElementById('sound-toggle').addEventListener('click', toggleSound);
  document.getElementById('sound-toggle').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { toggleSound(); e.preventDefault(); }
  });

  // Quiz page
  document.getElementById('btn-back').addEventListener('click', function() {
    document.getElementById('leave-modal').style.display = 'flex';
    document.getElementById('btn-cancel-leave').focus();
  });
  document.getElementById('btn-cancel-leave').addEventListener('click', function() {
    document.getElementById('leave-modal').style.display = 'none';
  });
  document.getElementById('btn-confirm-leave').addEventListener('click', function() {
    document.getElementById('leave-modal').style.display = 'none';
    backToHome();
  });
  document.getElementById('btn-next').addEventListener('click', nextQuestion);

  // Result page
  document.getElementById('btn-restart').addEventListener('click', restartQuiz);
  document.getElementById('btn-share').addEventListener('click', shareResult);
  document.getElementById('btn-back-home').addEventListener('click', backToHome);

  // Keyboard
  document.addEventListener('keydown', handleKeyboard);

  // Mobile optimizations
  if ('ontouchstart' in window) {
    document.addEventListener('touchstart', function() {}, { passive: true });
    document.addEventListener('touchmove', function(e) {
      if (e.target.closest('.result-achievements-list')) return;
      e.preventDefault();
    }, { passive: false });
  }

  window.addEventListener('resize', function() {
    if (window.innerHeight < 500) {
      document.body.style.overflow = 'auto';
    } else {
      document.body.style.overflow = '';
    }
  });
}

function init() {
  AudioMgr.init();
  bindEvents();

  // Load settings
  const settings = Storage.getSettings();
  state.soundOn = settings.soundOn;

  // Render welcome
  UI.renderWelcome();

  // Resume AudioContext on first user interaction (browser policy)
  document.addEventListener('click', function resumeAudio() {
    try {
      if (AudioMgr.ctx && AudioMgr.ctx.state === 'suspended') {
        AudioMgr.ctx.resume();
      }
    } catch (e) {}
    document.removeEventListener('click', resumeAudio);
  }, { once: true });
}

// Start the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


// === Pass v2.0 Patches ===
(function() {
  // 分享卡 PNG 生成
  function getTopPercent() {
    try {
      var raw = localStorage.getItem("anime-test-data-v1");
      if (!raw) return null;
      var d = JSON.parse(raw);
      var hist = d.history || [];
      if (!hist.length) return null;
      var myScore = (d.last && d.last.score) || 0;
      var lower = hist.filter(function(h) { return h.score < myScore; }).length;
      return Math.round((lower / hist.length) * 100);
    } catch (e) { return null; }
  }

  function generateQRCode(text) {
    try {
      var mode = 4;
      var length = text.length;
      var bits = [];
      bits.push(0,1,0,0);
      if (length < 256) {
        bits.push(0);
        for (var i = 0; i < 8; i++) bits.push((length >> (7-i)) & 1);
      }
      for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if (c < 128) {
          for (var j = 0; j < 8; j++) bits.push((c >> (7-j)) & 1);
        } else {
          bits.push(1,1,0,1,1,0,1,0);
          var u = c - 0x80;
          var h = (u >> 6) + 0xC0;
          var l = (u & 0x3F) + 0x80;
          for (var j = 0; j < 8; j++) bits.push((h >> (7-j)) & 1);
          for (var j = 0; j < 8; j++) bits.push((l >> (7-j)) & 1);
        }
      }
      var remainder = bits.length % 8;
      if (remainder > 0) {
        for (var i = 0; i < 8 - remainder; i++) bits.push(0);
      }
      var numZeros = (40 - (bits.length / 8) % 40) % 40;
      for (var i = 0; i < numZeros; i++) {
        bits.push(0,0,0,0,0,0,0,0);
      }
      var version = 1;
      var dimension = 21;
      var matrix = [];
      for (var y = 0; y < dimension; y++) {
        matrix[y] = [];
        for (var x = 0; x < dimension; x++) matrix[y][x] = false;
      }
      var addFinder = function(x, y) {
        for (var dy = -1; dy <= 7; dy++) {
          for (var dx = -1; dx <= 7; dx++) {
            var nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < dimension && ny >= 0 && ny < dimension) {
              if (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) {
                if ((dx >= 1 && dx <= 5 && dy >= 1 && dy <= 5) || (dx === 0 || dx === 6 || dy === 0 || dy === 6)) {
                  matrix[ny][nx] = true;
                }
              } else {
                matrix[ny][nx] = false;
              }
            }
          }
        }
      };
      addFinder(3, 3);
      addFinder(dimension - 4, 3);
      addFinder(3, dimension - 4);
      for (var i = 0; i < dimension; i++) {
        if (!matrix[6][i]) matrix[6][i] = i % 2 === 0;
        if (!matrix[i][6]) matrix[i][6] = i % 2 === 0;
      }
      var dataIndex = 0;
      var dir = -1;
      for (var x = dimension - 1; x > 0; x -= 2) {
        if (x === 6) x--;
        for (var y = dimension - 1; y >= 0; y += dir) {
          for (var dx = 0; dx < 2; dx++) {
            var nx = x - dx;
            if (nx >= 0 && !matrix[y][nx]) {
              matrix[y][nx] = dataIndex < bits.length && bits[dataIndex];
              dataIndex++;
            }
          }
        }
        dir = -dir;
      }
      return matrix;
    } catch (e) { return null; }
  }

  function renderShareCardCanvas() {
    return new Promise(function(resolve) {
      var raw = localStorage.getItem("anime-test-data-v1");
      var d = raw ? JSON.parse(raw) : {};
      var last = d.last || { score: 0, total: 0, tier: "萌新", mode: "标准" };
      var top = getTopPercent();
      var tags = d.lastTags || ["次元新人", "萌新上路"];
      
      var knowledgeEl = document.getElementById('metric-knowledge');
      var competitiveEl = document.getElementById('metric-competitive');
      var rankTitleEl = document.getElementById('rank-title');
      var rankEmojiEl = document.getElementById('rank-emoji');
      if (knowledgeEl && knowledgeEl.textContent) {
        var kp = parseInt(knowledgeEl.textContent) || 0;
        last.knowledgePercent = kp;
      }
      if (competitiveEl && competitiveEl.textContent) {
        var parts = competitiveEl.textContent.split('/');
        if (parts.length === 2) {
          last.competitiveScore = parseInt(parts[0]) || 0;
          last.competitiveMax = parseInt(parts[1]) || 0;
        }
      }
      if (rankTitleEl && rankTitleEl.textContent) last.tier = rankTitleEl.textContent;
      
      var tier = last.tier || "萌新";
      var rankEmoji = (rankEmojiEl && rankEmojiEl.textContent) || "";
      var W = 1080, H = 1920;
      var canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext("2d");
      // 背景渐变
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#FFE4D6");
      grad.addColorStop(0.5, "#FFD1DC");
      grad.addColorStop(1, "#D9D6FF");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // 内框
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, W - 96, H - 96);
      // Tag
      ctx.fillStyle = "rgba(255,107,107,0.9)";
      var tagText = "ACGN 浓度通行证";
      ctx.font = "800 32px sans-serif";
      ctx.textAlign = "center";
      var tagW = ctx.measureText(tagText).width + 80;
      var tagX = (W - tagW) / 2;
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(tagX, 110, tagW, 60, 30); } else { ctx.rect(tagX, 110, tagW, 60); }
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(tagText, W / 2, 150);
      // Title
      var titleText = "次元鉴定证书";
      ctx.font = "900 80px sans-serif";
      var tg = ctx.createLinearGradient(W/2 - 200, 0, W/2 + 200, 0);
      tg.addColorStop(0, "#2A1A2E");
      tg.addColorStop(0.6, "#FF6B6B");
      tg.addColorStop(1, "#FF8E53");
      ctx.fillStyle = tg;
      ctx.fillText(titleText, W / 2, 280);
      // Subtitle
      ctx.fillStyle = "#5A3D52";
      ctx.font = "600 32px sans-serif";
      ctx.fillText("SAKURA ACADEMY · 通行证版", W / 2, 330);
      // 印章
      ctx.save();
      ctx.translate(W - 200, 200);
      ctx.rotate(12 * Math.PI / 180);
      ctx.fillStyle = "rgba(255,107,107,0.92)";
      ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff";
      ctx.font = "900 26px sans-serif";
      ctx.fillText("次元鉴定", 0, -30);
      ctx.font = "900 44px sans-serif";
      ctx.fillText("PASS", 0, 14);
      ctx.font = "900 22px sans-serif";
      ctx.fillText("2026", 0, 50);
      ctx.restore();
      // 段位
      ctx.fillStyle = "#2A1A2E";
      ctx.font = "900 64px sans-serif";
      ctx.fillText(tier, W / 2, 680);
      // 分数区域
      ctx.fillStyle = "#5A3D52";
      ctx.font = "700 36px sans-serif";
      ctx.fillText("📚 知识得分", W / 2, 780);
      var sg = ctx.createLinearGradient(0, 780, 0, 900);
      sg.addColorStop(0, "#FF6B6B");
      sg.addColorStop(1, "#FF8E53");
      ctx.fillStyle = sg;
      ctx.font = "900 180px sans-serif";
      ctx.fillText(String(last.knowledgePercent || 0) + "%", W / 2, 920);
      ctx.fillStyle = "#5A3D52";
      ctx.font = "700 36px sans-serif";
      ctx.fillText("⚡ 竞技得分", W / 2, 1000);
      ctx.font = "900 120px sans-serif";
      ctx.fillText(String(last.competitiveScore || 0) + "/" + String(last.competitiveMax || 0), W / 2, 1100);
      // 标签
      var tagY = 1120;
      tags.slice(0, 4).forEach(function(t, i) {
        ctx.fillStyle = "#fff";
        ctx.font = "700 28px sans-serif";
        var tWidth = ctx.measureText(t).width + 60;
        var tx = W/2 - (tags.slice(0,4).length - 1) * 130 + i * 260;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(tx - tWidth/2, tagY, tWidth, 56, 28); } else { ctx.rect(tx - tWidth/2, tagY, tWidth, 56); }
        ctx.fill();
        ctx.fillStyle = "#2A1A2E";
        ctx.textAlign = "center";
        ctx.fillText(t, tx, tagY + 38);
      });
      // 生成分享文本用于二维码
      var shareText = rankEmoji + tier + "\n📚知识:" + (last.knowledgePercent || 0) + "%\n⚡竞技:" + (last.competitiveScore || 0) + "/" + (last.competitiveMax || 0);
      // 真实二维码
      var qrSize = 220;
      var qrX = (W - qrSize) / 2;
      var qrY = 1200;
      var qrData = generateQRCode(shareText);
      if (qrData) {
        var moduleSize = qrSize / qrData.length;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16); } else { ctx.rect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20); }
        ctx.fill();
        ctx.fillStyle = "#000";
        for (var yy = 0; yy < qrData.length; yy++) {
          for (var xx = 0; xx < qrData[yy].length; xx++) {
            if (qrData[yy][xx]) {
              ctx.fillRect(qrX + xx * moduleSize, qrY + yy * moduleSize, moduleSize, moduleSize);
            }
          }
        }
      }
      // Watermark
      ctx.fillStyle = "#5A3D52";
      ctx.font = "600 24px sans-serif";
      ctx.fillText("扫码读取成绩", W / 2, qrY + qrSize + 50);
      resolve(canvas);
    });
  }

  // 4) 原生分享 + 下载
  window.PassV2 = {
    renderShareCardCanvas: renderShareCardCanvas,
    exportShareCard: function() {
      renderShareCardCanvas().then(function(canvas) {
        if (!canvas) return;
        canvas.toBlob(function(blob) {
          if (!blob) return;
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = "anime-test-passport-" + Date.now() + ".png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        }, "image/png");
      });
    },
    nativeShare: function() {
      renderShareCardCanvas().then(function(canvas) {
        if (!canvas) return;
        canvas.toBlob(function(blob) {
          if (!blob) return;
          var file = new File([blob], "anime-test-passport.png", { type: "image/png" });
          var text = "我的二次元浓度通行证来啦！测测你的浓度：" + (location.href || "");
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ title: "二次元浓度通行证", text: text, files: [file] }).catch(function() {});
          } else if (navigator.share) {
            navigator.share({ title: "二次元浓度通行证", text: text }).catch(function() {});
          } else {
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "anime-test-passport.png";
            a.click();
          }
        }, "image/png");
      });
    },
    copyText: function() {
      var raw = localStorage.getItem("anime-test-data-v1");
      var d = raw ? JSON.parse(raw) : {};
      var last = d.last || {};
      
      var scoreEl = document.getElementById('final-score');
      var rankTitleEl = document.getElementById('rank-title');
      if (scoreEl && scoreEl.textContent) last.score = parseInt(scoreEl.textContent) || last.score;
      if (rankTitleEl && rankTitleEl.textContent) last.tier = rankTitleEl.textContent;
      
      var text = "【二次元浓度测试】\n" +
                 "📚 知识得分：" + (last.knowledgePercent || 0) + "%\n" +
                 "⚡ 竞技得分：" + (last.competitiveScore || 0) + "/" + (last.competitiveMax || 0) + "\n" +
                 "段位：" + (last.tier || "萌新");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          alert("已复制到剪贴板");
        });
      }
    },
    getTopPercent: getTopPercent
  };
})();
