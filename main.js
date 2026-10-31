// Ardito. Shared script for every page. No frameworks.
(function () {
  // Leave a plain empty frame when an image or video file is not there yet.
  function markMissing(el) {
    var frame = el.closest('.frame');
    if (frame) frame.classList.add('is-missing');
  }
  document.querySelectorAll('.frame img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    img.addEventListener('error', function () { markMissing(img); });
  });
  document.querySelectorAll('.frame video source').forEach(function (source) {
    source.addEventListener('error', function () { markMissing(source.parentElement); });
  });

  // Pause and play button for the Played on strip.
  document.querySelectorAll('.ticker-toggle').forEach(function (btn) {
    var ticker = document.getElementById(btn.getAttribute('aria-controls'));
    if (!ticker) return;
    btn.addEventListener('click', function () {
      var paused = ticker.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.textContent = paused ? 'Play' : 'Pause';
    });
  });

  // Only one video plays at a time.
  var videos = document.querySelectorAll('video');
  videos.forEach(function (v) {
    v.addEventListener('play', function () {
      videos.forEach(function (other) { if (other !== v) other.pause(); });
    });
  });
})();
