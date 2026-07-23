(function () {
  var nav = document.querySelector('.article-site-nav');
  if (!nav) return;
  var button = nav.querySelector('.article-nav-toggle');
  var links = nav.querySelector('.article-site-links');
  if (!button || !links) return;
  button.addEventListener('click', function () {
    var open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    button.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
    links.classList.toggle('open', !open);
  });
}());
