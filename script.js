const ROOMS = [
  { id: 1, name: '거실', color: '#a0622a', desc: '최대 2팀' },
  { id: 2, name: '작은방', color: '#7a9e4a', desc: '최대 1팀' },
  { id: 3, name: '보컬방', color: '#c8854a', desc: '개인만 · 수요일 불가' },
];

let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
let selectedRoom = null;
let filterRoom = 'all';
let selectedDate = null;
let deleteTargetId = null; // 삭제 대상 예약 id

const MASTER_PASSWORD = '0000'; // 운영진 마스터 비밀번호 (원하는 번호로 바꾸기)

// 공휴일 (간단 버전)
const HOLIDAYS = {
  '2026-01-01': '신정',
  '2026-03-01': '삼일절',
  '2026-05-01': '노동절',
  '2026-05-05': '어린이날',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-10-03': '개천절',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',
};

// 달력 상태
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

// 날짜
const now = new Date();
const dateStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
document.getElementById('headerDate').textContent = dateStr;
document.getElementById('homeDate').textContent = dateStr;

/* =====================
   화면 전환
===================== */
function goToApp(tab) {
  document.getElementById('screen-home').style.display = 'none';
  document.getElementById('screen-app').classList.add('active');
  switchTab(tab);
  renderCalendar();
}

function goHome() {
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-home').style.display = 'flex';
}

/* =====================
   달력
===================== */
function renderCalendar() {
  const today = new Date();
  today.setHours(0,0,0,0);

  document.getElementById('calTitle').textContent =
    `${calYear}.${String(calMonth + 1).padStart(2, '0')}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
  const grid = document.getElementById('calGrid');

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(calYear, calMonth, d);
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = date.getDay();
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();
    const isSelected = selectedDate === dateStr;
    const holiday = HOLIDAYS[dateStr];

    let cls = 'cal-day';
    if (isPast) cls += ' past';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    if (holiday) cls += ' holiday';
    else if (dow === 0) cls += ' sun';
    else if (dow === 6) cls += ' sat';

    const holidayTag = holiday ? `<span class="holiday-name">${holiday}</span>` : '';
    const click = isPast ? '' : `onclick="selectDate('${dateStr}')"`;
    html += `<div class="${cls}" ${click}>${d}${holidayTag}</div>`;
  }

  grid.innerHTML = html;
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  renderCalendar();

  const [y, m, d] = dateStr.split('-');
  const label = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
  const disp = document.getElementById('selectedDateDisplay');
  disp.textContent = `📅 ${label} 선택됨`;
  disp.classList.add('show');
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

/* =====================
   방 카드 렌더
===================== */
function renderRooms() {
  const grid = document.getElementById('roomGrid');
  grid.innerHTML = ROOMS.map(r => {
    const count = bookings.filter(b => b.roomId === r.id).length;
    return `
      <div class="room-card ${selectedRoom === r.id ? 'selected' : ''}" onclick="selectRoom(${r.id})">
        <div class="room-dot" style="background:${r.color}"></div>
        <div class="room-info">
          <div class="room-name">${r.name}</div>
          <div class="room-count">${count}팀 예약 · ${r.desc}</div>
        </div>
        <div class="room-badge badge-available">예약 가능</div>
      </div>
    `;
  }).join('');
}

function selectRoom(id) {
  selectedRoom = id;
  renderRooms();
}

/* =====================
   탭 전환
===================== */
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'book') || (i === 1 && tab === 'status'));
  });
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + tab).classList.add('active');
  if (tab === 'status') renderStatus();
}

/* =====================
   예약 제출
===================== */
function submitBooking() {
  const name = document.getElementById('inputName').value.trim();
  const people = document.getElementById('inputPeople').value;
  const start = document.getElementById('inputStart').value;
  const end = document.getElementById('inputEnd').value;
  const password = document.getElementById('inputPassword').value.trim();

  if (!selectedRoom) return showToast('방을 선택해주세요', '#b84a36');
  if (!selectedDate) return showToast('날짜를 선택해주세요', '#b84a36');
  if (!name) return showToast('이름을 입력해주세요', '#b84a36');
  if (!people) return showToast('인원을 선택해주세요', '#b84a36');
  if (!start || !end) return showToast('시간을 입력해주세요', '#b84a36');
  if (start >= end) return showToast('종료 시간을 확인해주세요', '#b84a36');
  if (!password || password.length < 4) return showToast('비밀번호 4자리를 입력해주세요', '#b84a36');

  const conflict = bookings.find(b =>
    b.roomId === selectedRoom &&
    b.date === selectedDate &&
    !(end <= b.start || start >= b.end)
  );
  if (conflict) return showToast(`${ROOMS[selectedRoom-1].name}은 해당 시간에 이미 예약이 있어요`, '#c8762a');

  const booking = {
    id: Date.now(),
    roomId: selectedRoom,
    date: selectedDate,
    name,
    people,
    start,
    end,
    password,
    createdAt: new Date().toISOString()
  };
  bookings.push(booking);
  localStorage.setItem('bookings', JSON.stringify(bookings));

  selectedRoom = null;
  selectedDate = null;
  document.getElementById('inputName').value = '';
  document.getElementById('inputPeople').value = '';
  document.getElementById('inputPassword').value = '';
  document.getElementById('selectedDateDisplay').classList.remove('show');
  renderCalendar();
  renderRooms();

  const [y, m, d] = booking.date.split('-');
  showToast(`예약 완료! ${ROOMS[booking.roomId-1].name} ${parseInt(m)}/${parseInt(d)} ${start}~${end}`, '#4a8c4a');
}

/* =====================
   현황 렌더
===================== */
function renderStatus() {
  const list = document.getElementById('bookingList');
  const filtered = filterRoom === 'all' ? bookings : bookings.filter(b => b.roomId === parseInt(filterRoom));
  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.start.localeCompare(b.start);
  });

  document.getElementById('totalCount').textContent = bookings.length;

  // 필터 버튼
  const filterEl = document.getElementById('roomFilter');
  filterEl.innerHTML = `
    <button class="filter-btn ${filterRoom === 'all' ? 'active' : ''}" onclick="setFilter('all')">전체 (${bookings.length})</button>
    ${ROOMS.map(r => {
      const cnt = bookings.filter(b => b.roomId === r.id).length;
      return `<button class="filter-btn ${filterRoom == r.id ? 'active' : ''}" onclick="setFilter(${r.id})">${r.name} (${cnt})</button>`;
    }).join('')}
  `;

  if (sorted.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">예약이 없어요</div>
      </div>`;
    return;
  }

  list.innerHTML = sorted.map(b => {
    const room = ROOMS.find(r => r.id === b.roomId);
    const peopleLabel = b.people === '5' ? '5명 이상' : b.people + '명';
    const dateLabel = b.date ? (() => { const [y,m,d] = b.date.split('-'); return `${parseInt(m)}/${parseInt(d)}`; })() : '';
    return `
      <div class="booking-item">
        <div class="booking-dot" style="background:${room.color}"></div>
        <div class="booking-info">
          <div class="booking-top">
            <div class="booking-name">${b.name}</div>
            <div class="booking-room">${room.name}</div>
          </div>
          <div class="booking-meta">
            ${dateLabel ? `<span>📅 ${dateLabel}</span>` : ''}
            <span>🕐 ${b.start} ~ ${b.end}</span>
            <span>👥 ${peopleLabel}</span>
          </div>
        </div>
        <button class="booking-delete" onclick="deleteBooking(${b.id})" title="삭제">✕</button>
      </div>
    `;
  }).join('');
}

function setFilter(val) {
  filterRoom = val;
  renderStatus();
}

/* =====================
   예약 삭제 (비밀번호 확인)
===================== */
function deleteBooking(id) {
  deleteTargetId = id;
  document.getElementById('modalPassword').value = '';
  document.getElementById('modalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('modalPassword').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  deleteTargetId = null;
}

function confirmDelete() {
  const input = document.getElementById('modalPassword').value.trim();
  const target = bookings.find(b => b.id === deleteTargetId);
  if (!target) return closeModal();

  if (input !== target.password && input !== MASTER_PASSWORD) {
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalPassword').style.borderColor = '#b84a36';
    setTimeout(() => document.getElementById('modalPassword').style.borderColor = '', 1000);
    showToast('비밀번호가 틀렸어요', '#b84a36');
    return;
  }

  bookings = bookings.filter(b => b.id !== deleteTargetId);
  localStorage.setItem('bookings', JSON.stringify(bookings));
  closeModal();
  renderRooms();
  renderStatus();
  showToast('예약이 취소됐어요', '#c8762a');
}

/* =====================
   토스트
===================== */
function showToast(msg, color = '#4ade80') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color;
  t.style.color = color === '#4ade80' ? '#000' : '#fff';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// 초기 실행
renderRooms();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}