// Forms (Kit signup and reader feedback) post to their service inside a
// hidden iframe, then a message is shown without leaving the page.
document.querySelectorAll('form[data-ajax]').forEach(function (form) {
  var frame = document.querySelector('iframe[name="' + form.target + '"]');
  var msg = form.querySelector('.msg');
  var waiting = false;
  form.addEventListener('submit', function () {
    waiting = true;
    if (msg) msg.textContent = 'Sending...';
  });
  if (frame) {
    frame.addEventListener('load', function () {
      if (!waiting) return;
      waiting = false;
      if (msg) msg.textContent = form.getAttribute('data-success');
      form.reset();
    });
  }
});

// Reader reviews: the manual list in js/reviews.js, plus approved rows from
// the Google Sheet when REVIEWS_URL is set in js/config.js.
(function () {
  var url = window.BACKEND_URL || window.REVIEWS_URL || '';
  var form = document.querySelector('form[data-reviews-form]');
  if (form && url) {
    form.action = url;
    ['access_key', 'subject', 'from_name'].forEach(function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      if (el) el.remove();
    });
  }

  function render(data) {
    document.querySelectorAll('[data-reviews]').forEach(function (box) {
      box.innerHTML = '';
      if (!data.length) return;
      var limit = parseInt(box.getAttribute('data-limit'), 10) || data.length;
      var empty = box.parentNode.querySelector('[data-empty]');
      if (empty) empty.hidden = true;
      data.slice(0, limit).forEach(function (r) {
        var q = document.createElement('blockquote');
        q.className = 'review';
        var p = document.createElement('p');
        p.textContent = '\u201C' + r.text + '\u201D';
        var w = document.createElement('div');
        w.className = 'who';
        w.textContent = '\u2014 ' + (r.name || 'A reader');
        q.appendChild(p);
        q.appendChild(w);
        box.appendChild(q);
      });
    });
  }

  var local = window.REVIEWS || [];
  render(local);
  if (url) {
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (rows) { render((rows || []).concat(local)); })
      .catch(function () {});
  }
})();

// Referral program (needs BACKEND_URL in js/config.js).
(function () {
  var base = window.BACKEND_URL || window.REVIEWS_URL || '';
  var params = new URLSearchParams(location.search);

  // Signup form on read-free.html
  var join = document.querySelector('form[data-join]');
  if (join && base) {
    join.action = base;
    var ref = (params.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (ref) {
      var h = document.createElement('input');
      h.type = 'hidden'; h.name = 'ref'; h.value = ref;
      join.appendChild(h);
      var note = document.querySelector('[data-ref-note]');
      if (note) note.hidden = false;
    }
    join.setAttribute('data-success', 'Check your email! Open the link we sent to confirm and get Chapter 1 and your personal share link.');
    document.querySelectorAll('[data-join-only]').forEach(function (el) { el.hidden = false; });
  }

  // Star page (stars.html)
  var box = document.querySelector('[data-stars]');
  if (!box) return;
  var state = box.querySelector('[data-state]');
  var content = box.querySelector('[data-content]');
  var t = params.get('t') || '';
  if (!base) { state.textContent = 'This page is not set up yet.'; return; }
  if (!t) { state.textContent = 'Open the link from your email to see your stars.'; return; }
  fetch(base + '?action=verify&t=' + encodeURIComponent(t))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) {
        state.textContent = 'This link is not valid. Sign up again on the Read Chapter 1 Free page and we will email you a new one.';
        return;
      }
      state.hidden = true;
      content.hidden = false;
      box.querySelector('[data-count]').textContent = d.stars;
      box.querySelector('[data-needed]').textContent = d.needed;
      box.querySelector('[data-bar]').style.width = Math.min(100, d.stars / d.needed * 100) + '%';
      var input = box.querySelector('[data-link]');
      input.value = d.link;
      box.querySelector('[data-copy]').addEventListener('click', function () {
        input.select();
        if (navigator.clipboard) navigator.clipboard.writeText(d.link); else document.execCommand('copy');
        this.textContent = 'Copied!';
      });
      box.querySelector('[data-wa]').href = 'https://wa.me/?text=' + encodeURIComponent(
        'I am reading "The Hidden Secret of the Young Village Girls", a Belizean novel. Read Chapter 1 free here: ' + d.link);
      if (d.stars >= d.needed) box.querySelector('[data-unlocked]').hidden = false;
    })
    .catch(function () { state.textContent = 'Something went wrong. Please try again in a moment.'; });
})();
