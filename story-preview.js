// Keep the original four-panel story readable in the standalone preview.
const story = document.querySelector('#story');
const track = story?.querySelector('.w-max');
const runway = story?.firstElementChild;
function updateStory() {
  if (!track || !runway || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const progress = Math.max(0, Math.min(1, -runway.getBoundingClientRect().top / (runway.offsetHeight - innerHeight)));
  track.style.transform = `translateX(${-progress * (track.scrollWidth - innerWidth)}px)`;
  const counter = story.querySelector('p span');
  if (counter) counter.textContent = String(Math.min(4, 1 + Math.floor(progress * 4))).padStart(2, '0');
}
addEventListener('scroll', updateStory, {passive:true});
addEventListener('resize', updateStory);
updateStory();
