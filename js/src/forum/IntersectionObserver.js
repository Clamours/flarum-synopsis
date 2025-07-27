// 客户端JavaScript代码
export default function observeImages() {
document.addEventListener('DOMContentLoaded', () => {
    const adjustImageHeight = (img) => {
      if (img.complete && img.naturalHeight) {
        img.parentElement.style.height = `${img.offsetHeight}px`;
      } else {
        img.onload = () => {
          img.parentElement.style.height = `${img.offsetHeight}px`;
        };
      }
    };
  
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          adjustImageHeight(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px', threshold: 0.1 });
  
    document.querySelectorAll('.ianm-syno-imgs img').forEach(img => {
      observer.observe(img);
    });
  });
}