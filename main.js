/* Ardito. Opens the airplay video in a pop-up when someone presses play. */
(function () {
  var triggers = document.querySelectorAll('[data-video]');
  if (!triggers.length || typeof HTMLDialogElement === 'undefined') return;

  var dialog = document.createElement('dialog');
  dialog.className = 'video-dialog';
  dialog.setAttribute('aria-label', 'Video');
  dialog.innerHTML = '<button class="video-close" type="button">Close</button><video controls playsinline></video>';
  document.body.appendChild(dialog);

  var video = dialog.querySelector('video');
  var last = null;

  function close() {
    video.pause();
    if (dialog.open) dialog.close();
  }

  triggers.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      last = el;
      video.src = el.getAttribute('data-video');
      video.poster = el.getAttribute('data-poster') || '';
      dialog.showModal();
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    });
  });

  dialog.querySelector('.video-close').addEventListener('click', close);
  dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
  dialog.addEventListener('close', function () {
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (last) last.focus();
  });
})();
