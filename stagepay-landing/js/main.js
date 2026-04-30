// Scroll reveal
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }});
}, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// Sticky bar
const stickyBar = document.getElementById('stickyBar');
let shown = false;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > 500 && !shown) { stickyBar.classList.add('show'); shown = true; }
  else if (y < 200 && shown) { stickyBar.classList.remove('show'); shown = false; }
}, { passive: true });

// Signup handler
function handleSignup(inputId) {
  const input = document.getElementById(inputId);
  const email = input ? input.value.trim() : '';
  if (!email || !email.includes('@')) {
    if (input) { input.focus(); input.style.borderColor = '#EF4444'; setTimeout(() => input.style.borderColor = '', 1500); }
    return;
  }
  // In production, POST to your backend here
  console.log('Signup:', email);
  showToast();
  if (input) { input.value = ''; }
  // Redirect to app after short delay
  setTimeout(() => { window.location = 'stagepay-app_6.html'; }, 1800);
}

function showToast() {
  const t = document.getElementById('toast');
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3000);
}

// Allow Enter key on inputs
document.querySelectorAll('input[type=email]').forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      handleSignup(input.id);
    }
  });
});
