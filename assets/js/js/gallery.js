
document.addEventListener('DOMContentLoaded', function(){
  const items = Array.from(document.querySelectorAll('.gallery-item'));
  const lightbox = document.querySelector('.lightbox');
  if(!lightbox || !items.length) return;

  const lightboxImg = lightbox.querySelector('img');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  let currentIndex = 0;

  function openAt(index){
    currentIndex = index;
    lightboxImg.src = items[currentIndex].getAttribute('href');
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeBox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showNext(step){
    currentIndex = (currentIndex + step + items.length) % items.length;
    lightboxImg.src = items[currentIndex].getAttribute('href');
  }

  items.forEach((item, index) => {
    item.addEventListener('click', function(e){
      e.preventDefault();
      openAt(index);
    });
  });

  prevBtn.addEventListener('click', function(){ showNext(-1); });
  nextBtn.addEventListener('click', function(){ showNext(1); });
  closeBtn.addEventListener('click', closeBox);

  lightbox.addEventListener('click', function(e){
    if(e.target === lightbox) closeBox();
  });

  document.addEventListener('keydown', function(e){
    if(!lightbox.classList.contains('open')) return;
    if(e.key === 'Escape') closeBox();
    if(e.key === 'ArrowLeft') showNext(1);
    if(e.key === 'ArrowRight') showNext(-1);
  });
});
