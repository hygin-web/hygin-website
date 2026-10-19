/* ==========================================================
   1. ตัวแปรและข้อมูลจำลอง (ต้องอยู่บนสุดเพื่อป้องกัน Error)
   ========================================================== */
const socialMockAccounts = {
  Google: [
    { name: 'John Doe', email: 'john.google@gmail.com' },
    { name: 'Developer Test', email: 'dev.test@gmail.com' }
  ],
  Facebook: [
    { name: 'John Facebook', email: 'john.fb@hotmail.com' }
  ],
  X: [
    { name: '@JohnX_Official', email: 'john.x@twitter.com' }
  ]
};

let currentUsername = '';
let currentSocialProvider = '';
let selectedSocialAccount = null;
let pendingForgotOtp = '';
let pendingForgotUsername = '';
let otpCountdownInterval = null;
let otpExpiresAt = 0;


/* ==========================================================
   2. Global Helper Functions & Initial Load
   ========================================================== */
function getUsersDB() {
  const saved = localStorage.getItem('app_users_db');
  return saved ? JSON.parse(saved) : {};
}

document.addEventListener('DOMContentLoaded', () => {
  loadSavedCredentials();
  initCanvasEffect();
});

function loadSavedCredentials() {
  const isRemembered = localStorage.getItem('remember_me') === 'true';
  if (isRemembered) {
    const userEl = document.getElementById('username');
    const passEl = document.getElementById('login-pass');
    const remEl = document.getElementById('remember-me');
    if (userEl) userEl.value = localStorage.getItem('remember_user') || '';
    if (passEl) passEl.value = localStorage.getItem('remember_pass') || '';
    if (remEl) remEl.checked = true;
  }
}

function toggleVisibility(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    iconEl.textContent = '🙈';
  } else {
    input.type = 'password';
    iconEl.textContent = '👁️';
  }
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [localPart, domain] = email.trim().split('@');
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) return `${localPart[0] || ''}*@${domain}`;
  return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
}

function setEmailDisplay(email) {
  const emailInput = document.getElementById('email-input-profile');
  if (!emailInput) return;
  const fullEmail = (email || '').trim();
  emailInput.dataset.fullEmail = fullEmail;
  emailInput.value = fullEmail;
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen-section').forEach(s => s.classList.remove('active-screen'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active-screen');
}

function switchPage(pageId, pageTitle) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.page-nav-btn').forEach(b => b.classList.remove('active'));

  const selectedPage = document.getElementById('page-' + pageId);
  if (selectedPage) selectedPage.classList.add('active');

  const navBtn = document.querySelector(`.page-nav-btn[data-page="${pageId}"]`);
  if (navBtn) navBtn.classList.add('active');

  const titleDisplay = document.getElementById('page-title-display');
  if (titleDisplay) titleDisplay.textContent = pageTitle;
}

function toggleSecuritySection() {
  const content = document.getElementById('security-collapsible');
  const icon = document.getElementById('security-toggle-icon');
  if (!content || !icon) return;
  content.classList.toggle('open');
  icon.textContent = content.classList.contains('open') ? '▲ ซ่อน' : '▼ เปิดดู';
}


/* ==========================================================
   3. ระบบ Login ปกติ & Logout
   ========================================================== */
function handleLogin(e) {
  e.preventDefault();
  const usernameVal = document.getElementById('username').value.trim();
  const passVal = document.getElementById('login-pass').value;
  const rememberMe = document.getElementById('remember-me').checked;
  const errorMsgEl = document.getElementById('login-error');

  const usersDB = getUsersDB();
  let matchedUser = null;

  if (usersDB[usernameVal] && usersDB[usernameVal].password === passVal) {
    matchedUser = usersDB[usernameVal];
  } else if (usernameVal === 'google_user' && passVal === (localStorage.getItem('default_google_password') || '123456')) {
    matchedUser = {
      fullname: 'google_user',
      username: 'google_user',
      email: localStorage.getItem('default_google_email') || 'junjunbanana15@gmail.com'
    };
  }

  if (!matchedUser) {
    errorMsgEl.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง';
    errorMsgEl.className = 'alert-msg error';
    return;
  }

  errorMsgEl.textContent = '';
  errorMsgEl.className = 'alert-msg';

  if (rememberMe) {
    localStorage.setItem('remember_me', 'true');
    localStorage.setItem('remember_user', usernameVal);
    localStorage.setItem('remember_pass', passVal);
  } else {
    localStorage.removeItem('remember_me');
    localStorage.removeItem('remember_user');
    localStorage.removeItem('remember_pass');
  }

  currentUsername = usernameVal;
    document.getElementById('display-name').textContent = matchedUser.fullname || usernameVal;
  document.getElementById('display-username').textContent = usernameVal;
  setEmailDisplay(matchedUser.email || '');

  switchScreen('app-screen');
}

function handleLogout() {
  switchScreen('login-screen');
  currentUsername = '';
  
  const loginErr = document.getElementById('login-error');
  if (loginErr) {
    loginErr.textContent = '';
    loginErr.className = 'alert-msg';
  }

  const rememberedUsername = localStorage.getItem('remember_user') || document.getElementById('username').value;
  localStorage.removeItem('remember_pass');
  localStorage.setItem('remember_me', 'true');
  
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.reset();
  
  document.getElementById('username').value = rememberedUsername;
  document.getElementById('login-pass').value = '';
  document.getElementById('remember-me').checked = true;
}


/* ==========================================================
   4. ระบบ Social Login จำลองแบบสมบูรณ์ (พร้อมช่องพิมพ์อีเมลเอง)
   ========================================================== */
function loginWithSocial(provider) {
  currentSocialProvider = provider;
  const accounts = socialMockAccounts[provider] || [{ name: `${provider} User`, email: `user@${provider.toLowerCase()}.com` }];
  
  let modal = document.getElementById('social-auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'social-auth-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="background: #fff; max-width: 400px; width: 90%; margin: auto; padding: 24px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); text-align: left; box-sizing: border-box;">
      
      <!-- ขั้นตอนที่ 1: เลือกบัญชี หรือเพิ่มบัญชีใหม่ -->
      <div id="social-step-select-account">
        <h3 style="margin-bottom: 8px; font-size: 18px; color: #111;">ลงชื่อเข้าใช้ด้วย ${provider}</h3>
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">เลือกบัญชีที่มีอยู่หรือเพิ่มบัญชีใหม่</p>
        
        <div id="social-account-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          ${accounts.map((acc, idx) => `
            <div onclick="selectSocialAccount(${idx})" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
              <div style="width: 36px; height: 36px; background: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff;">${acc.name[0]}</div>
              <div>
                <div style="font-weight: 600; font-size: 14px; color: #333;">${acc.name}</div>
                <div style="font-size: 12px; color: #666;">${acc.email}</div>
              </div>
            </div>
          `).join('')}
          
          <!-- ตัวเลือกสำหรับพิมพ์อีเมลเอง -->
          <div onclick="showCustomEmailInput()" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px dashed #4f46e5; border-radius: 8px; cursor: pointer; color: #4f46e5; font-weight: 600; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='transparent'">
            <div style="width: 36px; height: 36px; background: #e0e7ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4f46e5;">+</div>
            <div>ใช้อีเมลอื่น / เพิ่มบัญชีใหม่</div>
          </div>
        </div>
        
        <button type="button" onclick="closeModal('social-auth-modal')" style="width: 100%; padding: 10px; background: #f1f1f1; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; color: #333;">ยกเลิก</button>
      </div>

      <!-- ขั้นตอนย่อย: สำหรับกรอกอีเมลเอง -->
      <div id="social-step-custom-email" style="display: none;">
        <h3 style="margin-bottom: 8px; font-size: 18px; color: #111;">ลงชื่อเข้าใช้</h3>
        <p style="color: #666; font-size: 14px; margin-bottom: 16px;">ป้อนอีเมลหรือเบอร์โทรศัพท์ของคุณสำหรับ ${provider}</p>
        <form onsubmit="handleCustomEmailSubmit(event)">
          <div style="margin-bottom: 16px;">
            <input type="email" id="social-input-custom-email" required placeholder="อีเมลของคุณ (เช่น user@gmail.com)" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;">
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" onclick="backToAccountList()" style="flex: 1; padding: 10px; background: #f1f1f1; border: none; border-radius: 6px; cursor: pointer;">ย้อนกลับ</button>
            <button type="submit" style="flex: 1; padding: 10px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">ถัดไป</button>
          </div>
        </form>
      </div>

      <!-- ขั้นตอนที่ 2: กรอกรหัสผ่าน -->
      <div id="social-step-password" style="display: none;">
        <h3 style="margin-bottom: 8px; font-size: 18px; color: #111;">ยืนยันตัวตน</h3>
        <p style="color: #666; font-size: 14px; margin-bottom: 16px;" id="social-pass-subtitle"></p>
        <form onsubmit="handleSocialPasswordSubmit(event)">
          <div style="margin-bottom: 16px;">
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px; color: #333;">รหัสผ่านบัญชี ${provider}</label>
            <input type="password" id="social-input-pass" required placeholder="กรอกรหัสผ่านของคุณ" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;">
          </div>
          <div id="social-pass-error" class="alert-msg error" style="margin-bottom: 12px; color: #dc2626; font-size: 13px;"></div>
          <div style="display: flex; gap: 10px;">
            <button type="button" onclick="backToAccountList()" style="flex: 1; padding: 10px; background: #f1f1f1; border: none; border-radius: 6px; cursor: pointer;">ย้อนกลับ</button>
            <button type="submit" id="social-submit-btn" style="flex: 1; padding: 10px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">เข้าสู่ระบบ</button>
          </div>
        </form>
      </div>

      <!-- หน้าจอโหลดจำลอง -->
      <div id="social-step-loading" style="display: none; text-align: center; padding: 20px;">
        <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #4f46e5; border-radius: 50%; width: 36px; height: 36px; animation: spin 1s linear infinite; margin: 0 auto 16px auto;"></div>
        <p style="font-size: 14px; color: #555;">กำลังเชื่อมต่อข้อมูลกับ ${provider} และตรวจสอบความปลอดภัย...</p>
      </div>

    </div>
  `;

  modal.classList.add('active');
}

function selectSocialAccount(index) {
  const accounts = socialMockAccounts[currentSocialProvider];
  selectedSocialAccount = accounts[index];
  goToPasswordStep();
}

function showCustomEmailInput() {
  document.getElementById('social-step-select-account').style.display = 'none';
  document.getElementById('social-step-custom-email').style.display = 'block';
  const customInput = document.getElementById('social-input-custom-email');
  if (customInput) {
    customInput.value = '';
    customInput.focus();
  }
}

function handleCustomEmailSubmit(e) {
  e.preventDefault();
  const customEmail = document.getElementById('social-input-custom-email').value.trim();
  const namePart = customEmail.split('@')[0];
  
  selectedSocialAccount = {
    name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
    email: customEmail
  };
  
  goToPasswordStep();
}

function goToPasswordStep() {
  document.getElementById('social-step-select-account').style.display = 'none';
  document.getElementById('social-step-custom-email').style.display = 'none';
  document.getElementById('social-step-password').style.display = 'block';
  document.getElementById('social-pass-subtitle').textContent = `ป้อนรหัสผ่านสำหรับ ${selectedSocialAccount.email}`;
  document.getElementById('social-input-pass').value = '';
  document.getElementById('social-pass-error').textContent = '';
  document.getElementById('social-input-pass').focus();
}

function backToAccountList() {
  document.getElementById('social-step-password').style.display = 'none';
  document.getElementById('social-step-custom-email').style.display = 'none';
  document.getElementById('social-step-select-account').style.display = 'block';
}

function handleSocialPasswordSubmit(e) {
  e.preventDefault();
  const pass = document.getElementById('social-input-pass').value;
  const errorEl = document.getElementById('social-pass-error');

  if (pass.length < 4) {
    errorEl.textContent = 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
    return;
  }
  errorEl.textContent = '';

  document.getElementById('social-step-password').style.display = 'none';
  document.getElementById('social-step-loading').style.display = 'block';

  setTimeout(() => {
    closeModal('social-auth-modal');

    const email = selectedSocialAccount.email;
    const usersDB = getUsersDB();
    const matchedUsername = Object.keys(usersDB).find(k => (usersDB[k].email || '').toLowerCase() === email.toLowerCase());

    if (matchedUsername) {
      alert(`[ระบบความปลอดภัย OAuth]: ตรวจพบว่าอีเมล ${email} มีบัญชีใช้งานในระบบอยู่แล้ว\nระบบได้ส่งลิงก์ยืนยันความปลอดภัยไปที่อีเมลเรียบร้อยแล้ว กรุณายืนยันการเชื่อมโยงบัญชี`);
    }

    currentUsername = `${currentSocialProvider.toLowerCase()}_user`;
    document.getElementById('display-name').textContent = selectedSocialAccount.name;
    document.getElementById('display-username').textContent = currentUsername;
    setEmailDisplay(email);

    switchScreen('app-screen');
  }, 1500);
}


/* ==========================================================
   5. Modal & Management Functions (Profile, Passwords, Register)
   ========================================================== */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
  if (modalId === 'modal-forgot-password') {
    stopOtpCountdown();
    pendingForgotOtp = '';
    document.getElementById('otp-toast').classList.remove('show');
  }
}

function stopOtpCountdown() {
  if (otpCountdownInterval) {
    clearInterval(otpCountdownInterval);
    otpCountdownInterval = null;
  }
}

function startOtpCountdown() {
  stopOtpCountdown();
  otpExpiresAt = Date.now() + 90 * 1000;
  const resendButton = document.getElementById('resend-otp-btn');
  if (resendButton) resendButton.disabled = true;

  const updateCountdown = () => {
    const secondsLeft = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
    const timeText = `0${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
    document.getElementById('forgot-otp-countdown').textContent = timeText;
    document.getElementById('otp-toast-countdown').textContent = `เหลือเวลา ${timeText}`;

    if (secondsLeft === 0) {
      stopOtpCountdown();
      pendingForgotOtp = '';
      document.getElementById('otp-toast').classList.remove('show');
      document.getElementById('forgot-otp-alert').textContent = 'รหัส OTP หมดอายุแล้ว กรุณากดขอ OTP ใหม่';
      document.getElementById('forgot-otp-alert').className = 'alert-msg error';
      if (resendButton) resendButton.disabled = false;
    }
  };

  updateCountdown();
  otpCountdownInterval = setInterval(updateCountdown, 1000);
}

function editProfile() {
  document.getElementById('edit-name').value = document.getElementById('display-name').textContent;
  const deptEl = document.getElementById('display-dept');
  const phoneEl = document.getElementById('display-phone');
  if (deptEl) document.getElementById('edit-dept').value = deptEl.textContent;
  if (phoneEl) document.getElementById('edit-phone').value = phoneEl.textContent;
  openModal('modal-edit-profile');
}

function saveProfileEdit(e) {
  e.preventDefault();
  document.getElementById('display-name').textContent = document.getElementById('edit-name').value;
  const deptEl = document.getElementById('display-dept');
  const phoneEl = document.getElementById('display-phone');
  if (deptEl) deptEl.textContent = document.getElementById('edit-dept').value;
  if (phoneEl) phoneEl.textContent = document.getElementById('edit-phone').value;
  closeModal('modal-edit-profile');
}

function openPasswordModal() {
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  const alertEl = document.getElementById('change-password-alert');
  if (alertEl) {
    alertEl.textContent = '';
    alertEl.className = 'alert-msg';
  }
  openModal('modal-change-pass');
}

function savePasswordChange(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const alertEl = document.getElementById('change-password-alert');
  const usersDB = getUsersDB();
  const storedPassword = currentUsername === 'google_user'
    ? (localStorage.getItem('default_google_password') || '123456')
    : usersDB[currentUsername]?.password;

  if (!storedPassword || currentPassword !== storedPassword) {
    alertEl.textContent = 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
    alertEl.className = 'alert-msg error';
    return;
  }
  if (newPassword.length < 6) {
    alertEl.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
    alertEl.className = 'alert-msg error';
    return;
  }
  if (newPassword !== confirmPassword) {
    alertEl.textContent = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
    alertEl.className = 'alert-msg error';
    return;
  }

  if (currentUsername === 'google_user') {
    localStorage.setItem('default_google_password', newPassword);
  } else if (usersDB[currentUsername]) {
    usersDB[currentUsername].password = newPassword;
    localStorage.setItem('app_users_db', JSON.stringify(usersDB));
  }

  localStorage.removeItem('remember_pass');
  localStorage.setItem('remember_me', 'true');
  closeModal('modal-change-pass');
  switchScreen('login-screen');
  document.getElementById('username').value = currentUsername;
  document.getElementById('login-pass').value = '';
  document.getElementById('remember-me').checked = true;
  const loginErr = document.getElementById('login-error');
  if (loginErr) {
    loginErr.textContent = 'เปลี่ยนรหัสผ่านสำเร็จ กรุณากรอกรหัสผ่านใหม่เพื่อเข้าสู่ระบบ';
    loginErr.className = 'alert-msg success';
  }
  currentUsername = '';
}

function openRegisterModal() {
  openModal('modal-register');
}

function handleRegister(e) {
  e.preventDefault();
  const fullname = document.getElementById('reg-fullname').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pass').value;

  if (!username || !password) return;

  const usersDB = getUsersDB();
  usersDB[username] = {
    fullname: fullname || username,
    username: username,
    email: email,
    password: password
  };

  localStorage.setItem('app_users_db', JSON.stringify(usersDB));
  alert('ลงทะเบียนเรียบร้อยแล้ว! สามารถใช้ชื่อผู้ใช้และรหัสผ่านนี้ในการเข้าสู่ระบบได้ทันที');
  closeModal('modal-register');

  document.getElementById('username').value = username;
  document.getElementById('login-pass').value = password;
}

function updateEmail() {
  const emailInput = document.getElementById('email-input-profile');
  const emailVal = emailInput?.value.trim() || '';
  const alertEl = document.getElementById('email-alert');
  if (emailVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    saveCurrentAccountEmail(emailVal);
    setEmailDisplay(emailVal);
    alertEl.className = 'alert-msg success';
    alertEl.textContent = 'บันทึกอีเมลสำเร็จเรียบร้อยแล้ว';
  } else {
    alertEl.className = 'alert-msg error';
    alertEl.textContent = 'กรุณากรอกอีเมลให้ถูกต้อง';
  }
  setTimeout(() => { if(alertEl) { alertEl.textContent = ''; alertEl.className = 'alert-msg'; } }, 3000);
}

function saveCurrentAccountEmail(email) {
  if (!currentUsername) return;
  const usersDB = getUsersDB();
  if (usersDB[currentUsername]) {
    usersDB[currentUsername].email = email;
    localStorage.setItem('app_users_db', JSON.stringify(usersDB));
  } else if (currentUsername === 'google_user') {
    localStorage.setItem('default_google_email', email);
  }
}


/* ==========================================================
   6. Hero Canvas Particle Effect
   ========================================================== */
function initCanvasEffect() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = canvas.offsetWidth;
  let height = canvas.height = canvas.offsetHeight;

  window.addEventListener('resize', () => {
    if (canvas) {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }
  });

  const particles = Array.from({ length: 25 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 2 + 1,
    dx: (Math.random() - 0.5) * 0.5,
    dy: (Math.random() - 0.5) * 0.5,
    alpha: Math.random() * 0.5 + 0.2
  }));

  function animateCanvas() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > width) p.dx *= -1;
      if (p.y < 0 || p.y > height) p.dy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(165, 180, 252, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(animateCanvas);
  }
  animateCanvas();
}

// เพิ่ม Spinner Keyframe CSS อัตโนมัติป้องกันดีไซน์พัง
if (!document.getElementById('dynamic-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'dynamic-spinner-style';
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

// เปิด Modal แก้ไขอีเมล
function openEditEmailModal() {
  const modal = document.getElementById('modal-edit-email');
  if (modal) {
    modal.classList.add('active'); // หรือใช้ modal.style.display = 'flex' ตามระบบ CSS ของคุณ
    modal.style.display = 'flex';
  }
  const emailInput = document.getElementById('new-email-input');
  if (emailInput) {
    emailInput.value = '';
  }
  const alertBox = document.getElementById('edit-email-alert');
  if (alertBox) {
    alertBox.style.display = 'none';
  }
}

// บันทึกการเปลี่ยนอีเมล
function saveEmailChange(event) {
  event.preventDefault();
  const newEmailInput = document.getElementById('new-email-input');
  if (!newEmailInput) return;

  const newEmail = newEmailInput.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return;

  saveCurrentAccountEmail(newEmail);
  setEmailDisplay(newEmail);
  closeModal('modal-edit-email');
  alert('เปลี่ยนอีเมลติดต่อระบบเรียบร้อยแล้ว');
}

/* ==========================================================
   7. ระบบลืมรหัสผ่าน (Forgot Password & OTP System)
   ========================================================== */
function openForgotPasswordModal() {
  // รีเซ็ตค่าฟอร์มลืมรหัสผ่านทุกครั้งที่เปิด
  const userStep = document.getElementById('forgot-step-username');
  const otpStep = document.getElementById('forgot-step-otp');
  const newPassStep = document.getElementById('forgot-step-newpass');

  if (userStep) userStep.style.display = 'block';
  if (otpStep) otpStep.style.display = 'none';
  if (newPassStep) newPassStep.style.display = 'none';

  const userField = document.getElementById('forgot-username');
  if (userField) userField.value = '';

  const errEl = document.getElementById('forgot-error');
  if (errEl) {
    errEl.textContent = '';
    errEl.className = 'alert-msg';
  }

  openModal('modal-forgot-pass');
}

function handleForgotUsernameSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('forgot-username').value.trim();
  const errEl = document.getElementById('forgot-error');
  const usersDB = getUsersDB();

  // ตรวจสอบว่ามีชื่อผู้ใช้นี้ในระบบไหม (รองรับ google_user ด้วย)
  if (!usersDB[usernameInput] && usernameInput !== 'google_user') {
    errEl.textContent = 'ไม่พบชื่อผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีกครั้ง';
    errEl.className = 'alert-msg error';
    return;
  }

  errEl.textContent = '';
  pendingForgotUsername = usernameInput;
  
  // สุ่มรหัส OTP 6 หลักจำลอง
  pendingForgotOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // แสดงกล่อง OTP และจำลองการแจ้งเตือน OTP (เพื่อให้ทดสอบได้สะดวกรวดเร็ว)
  document.getElementById('forgot-step-username').style.display = 'none';
  document.getElementById('forgot-step-otp').style.display = 'block';

  const otpInfo = document.getElementById('forgot-otp-info');
  if (otpInfo) {
    otpInfo.innerHTML = `ระบบได้ส่งรหัส OTP ไปยังอีเมลที่ผูกไว้กับบัญชี <b>${usernameInput}</b><br><span style="color: #4f46e5; font-weight: bold;">(รหัส OTP จำลองสำหรับการทดสอบของคุณคือ: ${pendingForgotOtp})</span>`;
  }
}

function handleForgotOtpSubmit(e) {
  e.preventDefault();
  const enteredOtp = document.getElementById('forgot-otp-code').value.trim();
  const errEl = document.getElementById('forgot-otp-error');

  if (enteredOtp !== pendingForgotOtp) {
    errEl.textContent = 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
    return;
  }

  errEl.textContent = '';
  document.getElementById('forgot-step-otp').style.display = 'none';
  document.getElementById('forgot-step-newpass').style.display = 'block';
  
  // เคลียร์ช่องกรอกรหัสผ่านใหม่
  document.getElementById('forgot-new-pass').value = '';
  document.getElementById('forgot-confirm-pass').value = '';
}

function handleForgotNewPassSubmit(e) {
  e.preventDefault();
  const newPass = document.getElementById('forgot-new-pass').value;
  const confirmPass = document.getElementById('forgot-confirm-pass').value;
  const errEl = document.getElementById('forgot-newpass-error');

  if (newPass.length < 6) {
    errEl.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
    return;
  }

  if (newPass !== confirmPass) {
    errEl.textContent = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
    return;
  }

  errEl.textContent = '';
  const usersDB = getUsersDB();

  if (pendingForgotUsername === 'google_user') {
    localStorage.setItem('default_google_password', newPass);
  } else if (usersDB[pendingForgotUsername]) {
    usersDB[pendingForgotUsername].password = newPass;
    localStorage.setItem('app_users_db', JSON.stringify(usersDB));
  }

  alert('รีเซ็ตรหัสผ่านใหม่สำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
  closeModal('modal-forgot-pass');

  // นำชื่อผู้ใช้ไปใส่รอไว้ที่หน้า Login เพื่อความสะดวก
  const loginUserEl = document.getElementById('username');
  if (loginUserEl) loginUserEl.value = pendingForgotUsername;
}

/* ==========================================================
   7. ระบบลืมรหัสผ่าน (Forgot Password & OTP System - Safe Version)
   ========================================================== */
function openForgotPasswordModal() {
  const userStep = document.getElementById('forgot-step-username');
  const otpStep = document.getElementById('forgot-step-otp');
  const newPassStep = document.getElementById('forgot-step-newpass');

  if (userStep) userStep.style.display = 'block';
  if (otpStep) otpStep.style.display = 'none';
  if (newPassStep) newPassStep.style.display = 'none';

  const userField = document.getElementById('forgot-username');
  if (userField) userField.value = '';

  const errEl = document.getElementById('forgot-error');
  if (errEl) {
    errEl.textContent = '';
    errEl.className = 'alert-msg';
  }

  // เรียกใช้ฟังก์ชันเปิด Modal พื้นฐานที่มีอยู่เดิม
  if (typeof openModal === 'function') {
    openModal('modal-forgot-pass');
  } else {
    const modal = document.getElementById('modal-forgot-pass');
    if (modal) modal.classList.add('active');
  }
}

function handleForgotUsernameSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('forgot-username').value.trim();
  const errEl = document.getElementById('forgot-error');
  const usersDB = getUsersDB();

  if (!usersDB[usernameInput] && usernameInput !== 'google_user') {
    if (errEl) {
      errEl.textContent = 'ไม่พบชื่อผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีกครั้ง';
      errEl.className = 'alert-msg error';
    }
    return;
  }

  if (errEl) {
    errEl.textContent = '';
    errEl.className = 'alert-msg';
  }
  
  pendingForgotUsername = usernameInput;
  pendingForgotOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const stepUser = document.getElementById('forgot-step-username');
  const stepOtp = document.getElementById('forgot-step-otp');
  if (stepUser) stepUser.style.display = 'none';
  if (stepOtp) stepOtp.style.display = 'block';

  const otpInfo = document.getElementById('forgot-otp-info');
  if (otpInfo) {
    otpInfo.innerHTML = `ระบบได้ส่งรหัส OTP ไปยังอีเมลที่ผูกไว้กับบัญชี <b>${usernameInput}</b><br><span style="color: #4f46e5; font-weight: bold;">(รหัส OTP จำลองของคุณคือ: ${pendingForgotOtp})</span>`;
  }
}

function handleForgotOtpSubmit(e) {
  e.preventDefault();
  const enteredOtp = document.getElementById('forgot-otp-code').value.trim();
  const errEl = document.getElementById('forgot-otp-error');

  if (enteredOtp !== pendingForgotOtp) {
    if (errEl) errEl.textContent = 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
    return;
  }

  if (errEl) errEl.textContent = '';
  
  const stepOtp = document.getElementById('forgot-step-otp');
  const stepNewPass = document.getElementById('forgot-step-newpass');
  if (stepOtp) stepOtp.style.display = 'none';
  if (stepNewPass) stepNewPass.style.display = 'block';
  
  const newPassEl = document.getElementById('forgot-new-pass');
  const confirmPassEl = document.getElementById('forgot-confirm-pass');
  if (newPassEl) newPassEl.value = '';
  if (confirmPassEl) confirmPassEl.value = '';
}

function handleForgotNewPassSubmit(e) {
  e.preventDefault();
  const newPass = document.getElementById('forgot-new-pass').value;
  const confirmPass = document.getElementById('forgot-confirm-pass').value;
  const errEl = document.getElementById('forgot-newpass-error');

  if (newPass.length < 6) {
    if (errEl) errEl.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
    return;
  }

  if (newPass !== confirmPass) {
    if (errEl) errEl.textContent = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
    return;
  }

  if (errEl) errEl.textContent = '';
  const usersDB = getUsersDB();

  if (pendingForgotUsername === 'google_user') {
    localStorage.setItem('default_google_password', newPass);
  } else if (usersDB[pendingForgotUsername]) {
    usersDB[pendingForgotUsername].password = newPass;
    localStorage.setItem('app_users_db', JSON.stringify(usersDB));
  }

  alert('รีเซ็ตรหัสผ่านใหม่สำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
  
    if (typeof closeModal === 'function') {
    closeModal('modal-forgot-pass');
  } else {
    const modal = document.getElementById('modal-forgot-pass');
    if (modal) modal.classList.remove('active');
  }

  const loginUserEl = document.getElementById('username');
  if (loginUserEl) loginUserEl.value = pendingForgotUsername;
}

/* Forgot-password flow used by the current HTML modal. */
function openForgotPasswordModal() {
  stopOtpCountdown();
  pendingForgotOtp = '';
  pendingForgotUsername = '';
  document.getElementById('otp-toast').classList.remove('show');
  document.getElementById('resend-otp-btn').disabled = true;
  document.getElementById('forgot-email-step').style.display = 'block';
  document.getElementById('forgot-otp-step').style.display = 'none';
  document.getElementById('forgot-reset-step').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-otp').value = '';

  ['forgot-email-alert', 'forgot-otp-alert', 'forgot-reset-alert'].forEach(id => {
    const alertEl = document.getElementById(id);
    alertEl.textContent = '';
    alertEl.className = 'alert-msg';
  });
  openModal('modal-forgot-password');
}

function triggerOtp() {
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  const otpAlert = document.getElementById('forgot-email-alert');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    otpAlert.textContent = 'กรุณากรอก Gmail ให้ถูกต้อง';
    otpAlert.className = 'alert-msg error';
    return;
  }

  const usersDB = getUsersDB();
  const account = Object.entries(usersDB).find(([, user]) => (user.email || '').trim().toLowerCase() === email);
  const defaultEmail = (localStorage.getItem('default_google_email') || 'junjunbanana15@gmail.com').toLowerCase();
  const isDefaultAccount = email === defaultEmail;
  if (!account && !isDefaultAccount) {
    otpAlert.textContent = 'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบหรือใช้อีเมลที่ลงทะเบียนไว้';
    otpAlert.className = 'alert-msg error';
    return;
  }

  pendingForgotUsername = account ? account[0] : 'google_user';
  pendingForgotOtp = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById('toast-otp-code').textContent = pendingForgotOtp;
  document.getElementById('otp-toast').classList.add('show');
  startOtpCountdown();

  otpAlert.textContent = '';
  otpAlert.className = 'alert-msg';
  document.getElementById('forgot-otp').value = '';
  const otpAlertBox = document.getElementById('forgot-otp-alert');
  otpAlertBox.textContent = '';
  otpAlertBox.className = 'alert-msg';
  document.getElementById('forgot-email-step').style.display = 'none';
  document.getElementById('forgot-otp-step').style.display = 'block';
  document.getElementById('forgot-otp').focus();
}

function backToForgotEmail() {
  stopOtpCountdown();
  pendingForgotOtp = '';
  document.getElementById('otp-toast').classList.remove('show');
  document.getElementById('forgot-otp-step').style.display = 'none';
  document.getElementById('forgot-email-step').style.display = 'block';
  const alertEl = document.getElementById('forgot-otp-alert');
  alertEl.textContent = '';
  alertEl.className = 'alert-msg';
}

function verifyOtp() {
  const enteredOtp = document.getElementById('forgot-otp').value.trim();
  const alertEl = document.getElementById('forgot-otp-alert');
  if (Date.now() >= otpExpiresAt || !pendingForgotOtp) {
    stopOtpCountdown();
    pendingForgotOtp = '';
    document.getElementById('otp-toast').classList.remove('show');
    document.getElementById('resend-otp-btn').disabled = false;
    document.getElementById('forgot-otp-countdown').textContent = 'หมดอายุ';
    document.getElementById('otp-toast-countdown').textContent = 'หมดอายุ';
    alertEl.textContent = 'รหัส OTP หมดอายุแล้ว กรุณากดขอ OTP ใหม่';
    alertEl.className = 'alert-msg error';
    return;
  }
  if (!/^\d{6}$/.test(enteredOtp) || enteredOtp !== pendingForgotOtp) {
    alertEl.textContent = 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบรหัส 6 หลักแล้วลองอีกครั้ง';
    alertEl.className = 'alert-msg error';
    return;
  }

  alertEl.textContent = '';
  alertEl.className = 'alert-msg';
  stopOtpCountdown();
  pendingForgotOtp = '';
  document.getElementById('otp-toast').classList.remove('show');
  document.getElementById('forgot-otp-step').style.display = 'none';
  document.getElementById('forgot-reset-step').style.display = 'block';
  document.getElementById('forgot-new-password').value = '';
  document.getElementById('forgot-confirm-password').value = '';
  document.getElementById('forgot-new-password').focus();
}

function resetForgottenPassword() {
  const newPassword = document.getElementById('forgot-new-password').value;
  const confirmPassword = document.getElementById('forgot-confirm-password').value;
  const alertEl = document.getElementById('forgot-reset-alert');

  if (newPassword.length < 6) {
    alertEl.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
    alertEl.className = 'alert-msg error';
    return;
  }
  if (newPassword !== confirmPassword) {
    alertEl.textContent = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
    alertEl.className = 'alert-msg error';
    return;
  }

  if (pendingForgotUsername === 'google_user') {
    localStorage.setItem('default_google_password', newPassword);
  } else {
    const usersDB = getUsersDB();
    if (!usersDB[pendingForgotUsername]) {
      alertEl.textContent = 'ไม่พบบัญชีผู้ใช้ กรุณาเริ่มขั้นตอนกู้คืนใหม่';
      alertEl.className = 'alert-msg error';
      return;
    }
    usersDB[pendingForgotUsername].password = newPassword;
    localStorage.setItem('app_users_db', JSON.stringify(usersDB));
  }

  if (localStorage.getItem('remember_user') === pendingForgotUsername) {
    localStorage.removeItem('remember_pass');
  }
  const loginUser = document.getElementById('username');
  if (loginUser) loginUser.value = pendingForgotUsername;
  document.getElementById('otp-toast').classList.remove('show');
  closeModal('modal-forgot-password');
  alert('ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
    pendingForgotOtp = '';
}

/* Equipment catalog, cart, and borrowing request */
let borrowCart = [];
let selectedCategory = 'all';
let selectedAvailability = 'all';

function filterEquipmentCatalog(query) {
  const searchText = String(query || '').trim().toLowerCase();
  const cards = [...document.querySelectorAll('#equipment-grid .product-card')];
  let visibleCount = 0;

  cards.forEach(card => {
    const matchesCategory = selectedCategory === 'all' || card.dataset.category === selectedCategory;
    const matchesAvailability = selectedAvailability === 'all' || card.dataset.status === selectedAvailability;
    const searchableText = `${card.dataset.name || ''} ${card.dataset.id || ''} ${card.textContent}`.toLowerCase();
    const visible = matchesCategory && matchesAvailability && searchableText.includes(searchText);
    card.hidden = !visible;
    if (visible) visibleCount++;
  });

  const resultCount = document.getElementById('catalog-result-count');
  if (resultCount) resultCount.textContent = visibleCount ? `แสดง ${visibleCount} รายการ` : 'ไม่พบอุปกรณ์ที่ตรงกับการค้นหา';
}

function filterCategory(category, button) {
  selectedCategory = category;
  document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
  if (button) button.classList.add('active');
  filterEquipmentCatalog(document.getElementById('global-search')?.value || '');
}

function filterAvailability(status) {
  selectedAvailability = status;
  filterEquipmentCatalog(document.getElementById('global-search')?.value || '');
}

function addToCart(id, name, icon) {
  if (borrowCart.some(item => item.id === id)) {
    showBorrowMessage('อุปกรณ์รายการนี้อยู่ในตะกร้าแล้ว', 'error');
    return;
  }
  borrowCart.push({ id, name, icon });
  renderBorrowCart();
  showBorrowMessage('', '');
}

function removeFromCart(id) {
  borrowCart = borrowCart.filter(item => item.id !== id);
  renderBorrowCart();
}

function renderBorrowCart() {
  const list = document.getElementById('cart-items-container');
  const countBadge = document.getElementById('cart-count-badge');
  const submitButton = document.getElementById('confirm-borrow-btn');
  if (!list || !countBadge || !submitButton) return;

  countBadge.textContent = `${borrowCart.length} รายการ`;
  submitButton.disabled = false;
  list.replaceChildren();

  if (borrowCart.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-cart-text';
    emptyMessage.textContent = 'ยังไม่ได้เลือกอุปกรณ์ กรุณาเพิ่มรายการจากแคตตาล็อก';
    list.appendChild(emptyMessage);
    return;
  }

  borrowCart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-line';
    const icon = document.createElement('span');
    icon.className = 'cart-line-icon';
    icon.textContent = item.icon;
    const info = document.createElement('div');
    info.className = 'cart-line-info';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const code = document.createElement('span');
    code.textContent = item.id;
    info.append(name, code);
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'cart-remove';
    removeButton.setAttribute('aria-label', `นำ ${item.name} ออกจากตะกร้า`);
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => removeFromCart(item.id));
    row.append(icon, info, removeButton);
    list.appendChild(row);
  });
}

function showBorrowMessage(message, kind) {
  const messageEl = document.getElementById('borrow-success');
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.className = `alert-msg${kind ? ` ${kind}` : ''}`;
}

function openDatePicker(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Open the browser's native calendar directly from the button click.
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch (error) {
      // Fall back to the native date input interaction.
    }
  }
  input.focus();
  input.click();
}

function submitBorrowForm(event) {
  event.preventDefault();
  const form = document.getElementById('borrow-submit-form');
  if (!borrowCart.length) {
    showBorrowMessage('กรุณาเพิ่มอุปกรณ์ลงตะกร้าก่อนยืนยันการยืม', 'error');
    return;
  }

  const requiredField = [...form.querySelectorAll('[required]')].find(field => !field.value.trim());
  if (requiredField) {
    const fieldLabel = form.querySelector(`label[for="${requiredField.id}"]`)?.textContent
      || requiredField.closest('.form-group')?.querySelector('label')?.textContent
      || 'ข้อมูลที่จำเป็น';
    showBorrowMessage(`กรุณากรอก${fieldLabel.trim()}ให้ครบถ้วน`, 'error');
    requiredField.focus();
    return;
  }

  const borrowDateValue = document.getElementById('borrower-startdate').value;
  const dueDateValue = document.getElementById('borrower-duedate').value;
  const borrowDate = new Date(`${borrowDateValue}T00:00:00`);
  const dueDate = new Date(`${dueDateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!borrowDateValue || Number.isNaN(borrowDate.getTime()) || borrowDate < today) {
    showBorrowMessage('วันที่ยืมต้องเป็นวันนี้หรือวันในอนาคต', 'error');
    return;
  }
  if (!dueDateValue || Number.isNaN(dueDate.getTime()) || dueDate <= borrowDate) {
    showBorrowMessage('วันที่คืนต้องอยู่หลังวันที่ยืม', 'error');
    return;
  }

  const borrowerId = document.getElementById('borrower-id').value.trim();
  const borrowerName = document.getElementById('borrower-name').value.trim();
  const dateFormat = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const borrowDateText = dateFormat.format(borrowDate);
  const dueDateText = dateFormat.format(dueDate);
  const transactionId = `BR-${today.getFullYear()}-${String(Date.now()).slice(-5)}`;
  const row = document.createElement('tr');
  row.dataset.status = 'borrowed';
  const values = [
    `#${transactionId}`,
    `${borrowerName} (${borrowerId})`,
    borrowCart.map(item => `${item.name} (${item.id})`).join(', '),
    borrowDateText,
    dueDateText
  ];
  const labels = ['เลขที่ทำรายการ', 'ผู้ยืม', 'รายการอุปกรณ์', 'วันที่ยืม', 'กำหนดคืน'];
  values.forEach((value, index) => {
    const cell = document.createElement('td');
    cell.dataset.label = labels[index];
    if (index === 0) {
      const strong = document.createElement('strong');
      strong.textContent = value;
      cell.appendChild(strong);
    } else {
      cell.textContent = value;
    }
    row.appendChild(cell);
  });
  const statusCell = document.createElement('td');
  statusCell.dataset.label = 'สถานะ';
  row.appendChild(statusCell);
  const actionCell = document.createElement('td');
  actionCell.dataset.label = 'จัดการ / ตรวจสอบสภาพ';
  row.appendChild(actionCell);
  renderHistoryStatus(row, 'borrowed');
  document.getElementById('history-table-body').prepend(row);
  filterHistory('all');

  borrowCart = [];
  renderBorrowCart();
  event.target.reset();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  document.getElementById('borrower-startdate').min = todayValue;
  document.getElementById('borrower-duedate').min = todayValue;
  showBorrowMessage(`ส่งคำขอยืม ${transactionId} สำเร็จ — ตรวจสอบรายการได้ที่ประวัติการยืม`, 'success');
  switchPage('history', 'ประวัติการยืม-คืน');
}

function openReturnModal(transactionId, itemName) {
  const modal = document.getElementById('modal-return-inspect');
  if (!modal) return;
  modal.dataset.transactionId = transactionId;
  document.getElementById('return-modal-title').textContent = `รายการ: ${itemName}`;
  document.getElementById('return-condition').value = 'normal';
  document.getElementById('damage-note').value = '';
  toggleDamageReason('normal');
  openModal('modal-return-inspect');
}

function toggleDamageReason(condition) {
  const noteGroup = document.getElementById('damage-note-group');
  if (noteGroup) noteGroup.style.display = condition === 'normal' ? 'none' : 'block';
}

const historyStatusLabels = {
  borrowed: 'กำลังยืม',
  returned: 'คืนแล้ว',
  damaged: 'ชำรุด',
  lost: 'สูญหาย'
};
let activeHistoryFilter = 'all';

function renderHistoryStatus(row, status, note = '') {
  if (!row || !historyStatusLabels[status]) return;
  row.dataset.status = status;
  row.dataset.statusNote = note;

  const statusCell = row.cells[5];
  const actionCell = row.cells[6];
  if (!statusCell || !actionCell) return;

  let badge = statusCell.querySelector('.history-status-badge');
  if (!badge) badge = document.createElement('span');
  badge.className = `status-badge history-status-badge history-status-${status}${status === 'borrowed' ? ' active' : ''}`;
  badge.textContent = historyStatusLabels[status];

  let selector = statusCell.querySelector('.history-status-select');
  if (!selector) {
    selector = document.createElement('select');
    selector.className = 'history-status-select';
    selector.setAttribute('aria-label', `เปลี่ยนสถานะรายการ ${row.cells[0].textContent.replace('#', '').trim()}`);
    selector.addEventListener('change', () => updateHistoryStatus(selector));
  }
  selector.replaceChildren();
  Object.entries(historyStatusLabels).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    selector.appendChild(option);
  });
  selector.value = status;
  statusCell.replaceChildren(badge, selector);

  actionCell.replaceChildren();
  if (status === 'borrowed') {
    const transactionId = row.cells[0].textContent.replace('#', '').trim();
    const itemName = row.cells[2].textContent.trim();
    const returnButton = document.createElement('button');
    returnButton.type = 'button';
    returnButton.className = 'btn-secondary';
    returnButton.textContent = 'รับคืน / ตรวจสภาพ';
    returnButton.addEventListener('click', () => openReturnModal(transactionId, itemName));
    actionCell.appendChild(returnButton);
  } else {
    const noteText = document.createElement('span');
    noteText.className = 'history-action-note';
    const defaultNotes = { returned: 'ตรวจสอบแล้ว (ปกติ)', damaged: 'ส่งตรวจซ่อม', lost: 'บันทึกสูญหาย' };
    noteText.textContent = `${defaultNotes[status]}${note ? `: ${note}` : ''}`;
    actionCell.appendChild(noteText);
  }
}

function updateHistoryStatus(selector) {
  const row = selector.closest('tr');
  if (!row) return;
  renderHistoryStatus(row, selector.value);
  filterHistory(activeHistoryFilter);
}

function confirmReturnItem(event) {
  event.preventDefault();
  const modal = document.getElementById('modal-return-inspect');
  const transactionId = modal?.dataset.transactionId;
  const row = [...document.querySelectorAll('#history-table-body tr')].find(item =>
    item.cells[0]?.textContent.includes(transactionId)
  );
  if (!row) return;

  const condition = document.getElementById('return-condition').value;
  const status = condition === 'normal' ? 'returned' : condition;
  const note = document.getElementById('damage-note').value.trim();
  renderHistoryStatus(row, status, note);
  filterHistory(activeHistoryFilter);
  closeModal('modal-return-inspect');
}

function filterHistory(status) {
  activeHistoryFilter = status;
  document.querySelectorAll('#history-table-body tr').forEach(row => {
    row.hidden = status !== 'all' && row.dataset.status !== status;
  });
}

function initializeHistoryTable() {
  document.querySelectorAll('#history-table-body tr').forEach(row => {
    const initialStatus = row.dataset.status || 'borrowed';
    const existingNote = row.cells[6]?.textContent.trim() || '';
    const note = initialStatus === 'returned' && existingNote.includes('ปกติ') ? '' : existingNote;
    renderHistoryStatus(row, initialStatus, note);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const borrowDateInput = document.getElementById('borrower-startdate');
  const dueDateInput = document.getElementById('borrower-duedate');
  const getLocalDateString = date => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  };

  if (borrowDateInput && dueDateInput) {
    const today = getLocalDateString(new Date());
    borrowDateInput.min = today;
    dueDateInput.min = today;

    const updateDueDateMinimum = () => {
      dueDateInput.min = borrowDateInput.value || today;
      if (dueDateInput.value && dueDateInput.value <= dueDateInput.min) {
        dueDateInput.value = '';
      }
    };
    borrowDateInput.addEventListener('input', updateDueDateMinimum);
    borrowDateInput.addEventListener('change', updateDueDateMinimum);
    updateDueDateMinimum();
  }

  initializeHistoryTable();
  filterEquipmentCatalog('');
});


