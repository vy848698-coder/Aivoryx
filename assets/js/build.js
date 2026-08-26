/* ============================================================
   THE BUILD PANEL

   The headline says the site was built line by line and never
   dragged and dropped. A decorative graphic asserts nothing, so
   this panel writes real markup and renders the result as each
   line lands — and everything it builds is something we sell:
   a WhatsApp quote button, a price card, a savings calculator.

   No dependency, no framework, which is also the argument. The
   whole thing pauses off-screen and out of tab, and a reader who
   asked for reduced motion gets the finished state immediately.
   ============================================================ */
AX.module(function build(){
  'use strict';
  var $ = AX.$;
  var root = $('#build');
  if(!root) return;

  var codeEl  = $('[data-build-code]', root);
  var outEl   = $('[data-build-out]', root);
  var fileEl  = $('[data-build-file]', root);
  var noteEl  = $('[data-build-note]', root);
  var countEl = $('[data-build-count]', root);
  var msEl    = $('[data-build-ms]', root);
  if(!codeEl || !outEl) return;

  /* Each step is one line of source. `out` marks the lines that
     complete a visible piece, so the preview grows in step with
     the code rather than appearing all at once at the end. */
  var BUILDS = [
    {
      file: 'quote-button.html',
      note: 'Hand-written. No builder.',
      ms:   '2.1 KB',
      lines: [
        { t: '<a class="btn" href="wa.me/919399593499">' },
        { t: '  <span class="btn__dot"></span>', out: true },
        { t: '  <span>Get a quote</span>', out: true },
        { t: '</a>' }
      ],
      preview:
        '<span class="pv pv--btn">' +
          '<i class="pv__dot"></i>' +
          '<b>Get a quote</b>' +
        '</span>'
    },
    {
      file: 'price-card.html',
      note: 'Your markup. Your repo.',
      ms:   '3.4 KB',
      lines: [
        { t: '<article class="tier tier--lead">' },
        { t: '  <span>Growth</span>', out: true },
        { t: '  <p class="price">&#8377;14,999</p>', out: true },
        { t: '  <small>Live in 2&ndash;3 weeks</small>', out: true },
        { t: '</article>' }
      ],
      preview:
        '<span class="pv pv--card">' +
          '<i class="pv__tag">Growth</i>' +
          '<b class="pv__price">&#8377;14,999</b>' +
          '<i class="pv__meta">Live in 2&ndash;3 weeks</i>' +
        '</span>'
    },
    {
      file: 'savings.js',
      note: 'The interactive bit, too.',
      ms:   '1.8 KB',
      lines: [
        { t: 'const bill  = 3200;' },
        { t: 'const saved = bill * 0.9 * 12;', out: true },
        { t: 'render(`&#8377;${saved} a year`);', out: true }
      ],
      preview:
        '<span class="pv pv--stat">' +
          '<i class="pv__k">Saved per year</i>' +
          '<b class="pv__v">&#8377;34,560</b>' +
        '</span>'
    }
  ];

  /* ---------------- Syntax colouring ----------------
     Deliberately small: tags, attribute names, strings, keywords
     and numbers. It has to read as code at a glance, not survive
     a language spec. Escaped first so a build can never inject. */
  function esc(s){
    return s.replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  /* One pass, left to right. Chained .replace() calls cannot work here:
     the second regex happily matches inside the <i class="t-str"> the
     first one just inserted, which is what turned `<a class="btn"` into
     nested garbage. Tokenise the raw line once, escape each piece as it
     is emitted, and never look at the output again. */
  var TOKEN = /("[^"]*")|(`[^`]*`)|(<\/?[a-zA-Z][\w-]*)|\b(const|let|return|function|render)\b|\b(\d[\d,._]*)\b|([a-zA-Z-]+)(?==)/g;

  function paint(line){
    var out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while((m = TOKEN.exec(line)) !== null){
      out += esc(line.slice(last, m.index));
      if(m[1] || m[2]){
        out += '<i class="t-str">' + esc(m[1] || m[2]) + '</i>';
      } else if(m[3]){
        var lead = m[3].replace(/[a-zA-Z][\w-]*$/, '');
        out += esc(lead) + '<i class="t-tag">' + esc(m[3].slice(lead.length)) + '</i>';
      } else if(m[4]){
        out += '<i class="t-key">' + esc(m[4]) + '</i>';
      } else if(m[5]){
        out += '<i class="t-num">' + esc(m[5]) + '</i>';
      } else if(m[6]){
        out += '<i class="t-attr">' + esc(m[6]) + '</i>';
      }
      last = m.index + m[0].length;
    }
    return out + esc(line.slice(last));
  }

  /* ---------------- Sequencer ---------------- */
  var CHAR_MS = 13, LINE_PAUSE = 130, HOLD_MS = 2100, WIPE_MS = 420;
  var bi = 0, timer = null, running = false;

  function clearTimer(){ if(timer){ clearTimeout(timer); timer = null; } }
  function wait(ms, fn){ clearTimer(); timer = setTimeout(fn, ms); }

  function mount(b){
    codeEl.innerHTML = '';
    outEl.innerHTML  = b.preview;
    if(fileEl)  fileEl.textContent  = b.file;
    if(noteEl)  noteEl.textContent  = b.note;
    if(msEl)    msEl.textContent    = b.ms;
    if(countEl) countEl.textContent = b.lines.length + ' lines';
    root.classList.remove('is-wiping');
  }

  /* the preview pieces revealed so far */
  function reveal(b, upto){
    var parts = outEl.querySelectorAll('.pv > *');
    var shown = 0;
    for(var i = 0; i <= upto && i < b.lines.length; i++) if(b.lines[i].out) shown++;
    for(var j = 0; j < parts.length; j++) parts[j].classList.toggle('is-on', j < shown);
    if(shown) outEl.firstChild.classList.add('is-on');
  }

  function typeLine(b, li, done){
    var text = b.lines[li].t;
    var row  = document.createElement('span');
    row.className = 'build__line';
    codeEl.appendChild(row);

    var i = 0;
    (function step(){
      if(!running) return;
      i++;
      row.innerHTML = paint(text.slice(0, i));
      row.className = "build__line is-typing";
      if(i < text.length){ wait(CHAR_MS, step); return; }
      row.innerHTML = paint(text);
      row.className = "build__line";
      reveal(b, li);
      wait(LINE_PAUSE, done);
    })();
  }

  function runBuild(){
    if(!running) return;
    var b = BUILDS[bi];
    mount(b);

    var li = 0;
    (function next(){
      if(!running) return;
      if(li >= b.lines.length){
        wait(HOLD_MS, function(){
          root.classList.add('is-wiping');
          wait(WIPE_MS, function(){
            bi = (bi + 1) % BUILDS.length;
            runBuild();
          });
        });
        return;
      }
      typeLine(b, li, function(){ li++; next(); });
    })();
  }

  /* ---------------- Finished state ----------------
     Used for reduced motion, and as the pre-animation paint so the
     panel is never an empty box while the reader waits. */
  function settle(b){
    codeEl.innerHTML = b.lines.map(function(l){
      return '<span class="build__line">' + paint(l.t) + '</span>';
    }).join('');
    outEl.innerHTML = b.preview;
    if(fileEl)  fileEl.textContent  = b.file;
    if(noteEl)  noteEl.textContent  = b.note;
    if(msEl)    msEl.textContent    = b.ms;
    if(countEl) countEl.textContent = b.lines.length + ' lines';
    var parts = outEl.querySelectorAll('.pv, .pv > *');
    for(var i = 0; i < parts.length; i++) parts[i].classList.add('is-on');
  }

  settle(BUILDS[0]);

  if(AX.reduce) return;

  function start(){ if(running) return; running = true; bi = 0; runBuild(); }
  function stop(){ running = false; clearTimer(); }

  /* only run while it is actually being looked at */
  if(window.IntersectionObserver){
    new IntersectionObserver(function(en){
      if(en[0].isIntersecting){ if(!document.hidden) start(); }
      else { stop(); settle(BUILDS[bi]); }
    }, {threshold:0.25}).observe(root);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function(){
    if(document.hidden) stop();
    else if(root.getBoundingClientRect().top < window.innerHeight) start();
  });
});
