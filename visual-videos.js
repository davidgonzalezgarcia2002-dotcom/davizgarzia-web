/* Motion backgrounds: load and play only as they enter the viewport. */
(() => {
  const videos = [...document.querySelectorAll('video[data-scroll-video]')];
  if (!videos.length) return;

  const play = (video) => {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.isIntersecting) play(video);
      else video.pause();
    }
  }, { threshold: 0.12, rootMargin: '80px 0px' });

  videos.forEach((video) => observer.observe(video));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach((video) => video.pause());
    else videos.forEach((video) => {
      const box = video.getBoundingClientRect();
      if (box.bottom > 0 && box.top < window.innerHeight) play(video);
    });
  });
})();