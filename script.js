/* =====================
   🔥 파이어베이스 설정 및 연결
===================== */
const firebaseConfig = {
  apiKey: "AIzaSyCUkKpPXgF42UZU4BKkXgLNhoT5ZggOI-I",
  authDomain: "guitar-salon.firebaseapp.com",
  projectId: "guitar-salon",
  storageBucket: "guitar-salon.firebasestorage.app",
  messagingSenderId: "848655140555",
  appId: "1:848655140555:web:f6800e43f7676add0dbd4e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* =====================
   기본 데이터 세팅
===================== */
const ROOMS = [
  { id: 1, name: '1번 방', color: '#a0622a' },
  { id: 2, name: '2번 방', color: '#7a9e4a' },
  { id: 3, name: '3번 방', color: '#c8854a' },
  { id: 4, name: '4번 방', color: '#4a86a8' },
  { id: 5, name: '5번 방', color: '#8b6914' },
];

let bookings = []; // 이제 로컬스토리지가 아니라 빈 배열로 시작합니다.
let selectedRoom = null;
let filterRoom = 'all';
let selectedDate = null;

const HOLIDAYS = {
  '2026-01-01': '신정', '2026-03-01': '삼일절', '2026-05-01': '노동절',
  '2026-05-05': '어린이날', '2026-06-06': '현충일', '2026-08-15': '광복절',
  '2026-10-03': '개천절', '2026-10-09': '한글날', '2026-12-25': '성탄절',
};

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

const now = new Date();
const dateStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
document.getElementById('headerDate').textContent = dateStr;
document.getElementById('homeDate').textContent = dateStr;

/* =====================
   🔥 데이터베이스 실시간 동기화
===================== */
// 누군가 예약을 추가하거나 지우면, 모든 사람의 폰에서 자동으로 이 코드가 실행됩니다!
db.collection("bookings").onSnapshot((snapshot) => {
  bookings = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    data.dbId = doc.id; // 파이어베이스의 고유 문서 ID를 저장
    bookings.push(data);
  });
  
  renderRooms();
  if (document.getElementById('section-status').classList.contains('active')) {
    renderStatus();
  }
});

/* =====================
   화면 전환 및 달력
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

function renderCalendar() {
  const today = new Date();
  today.setHours(0,0,0,0);

  document.getElementById('calTitle').textContent = `${calYear}.${String(calMonth + 1).padStart(2, '0')}`;

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
  const disp = document.getElementById('selectedDateDisplay');
  disp.textContent = `📅 ${y}년 ${parseInt(m)}월 ${parseInt(d)}일 선택됨`;
  disp.classList.add('show');
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function renderRooms() {
  const grid = document.getElementById('roomGrid');
  grid.innerHTML = ROOMS.map(r => {
    const count = bookings.filter(b => b.roomId === r.id).length;
    return `
      <div class="room-card ${selectedRoom === r.id ? 'selected' : ''}" onclick="selectRoom(${r.id})">
        <div class="room-dot" style="background:${r.color}"></div>
        <div class="room-info">
          <div class="room-name">${r.name}</div>
          <div class="room-count">${count}팀 예약</div>
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

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'book') || (i === 1 && tab === 'status'));
  });
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + tab).classList.add('active');
  if (tab === 'status') renderStatus();
}

/* =====================
   🔥 파이어베이스에 예약 저장하기
===================== */
function submitBooking() {
  const name = document.getElementById('inputName').value.trim();
  const people = document.getElementById('inputPeople').value;
  const start = document.getElementById('inputStart').value;
  const end = document.getElementById('inputEnd').value;
  const password = document.getElementById('inputPassword').value.trim(); // 🟢 비밀번호 가져오기

  if (!selectedRoom) return showToast('방을 선택해주세요', '#b84a36');
  if (!selectedDate) return showToast('날짜를 선택해주세요', '#b84a36');
  if (!name) return showToast('이름을 입력해주세요', '#b84a36');
  if (!people) return showToast('인원을 선택해주세요', '#b84a36');
  if (!start || !end) return showToast('시간을 입력해주세요', '#b84a36');
  if (start >= end) return showToast('종료 시간을 확인해주세요', '#b84a36');
  if (!password) return showToast('비밀번호를 입력해주세요', '#b84a36'); // 🟢 비밀번호 안 쓰면 막기

  const conflict = bookings.find(b =>
    b.roomId === selectedRoom &&
    b.date === selectedDate &&
    !(end <= b.start || start >= b.end)
  );
  if (conflict) return showToast(`${ROOMS[selectedRoom-1].name}은 해당 시간에 이미 예약이 있어요`, '#c8762a');

  const booking = {
    roomId: selectedRoom,
    date: selectedDate,
    name,
    people,
    start,
    end,
    password, // 🟢 파이어베이스에 비밀번호도 같이 저장!
    createdAt: new Date().toISOString()
  };

  db.collection("bookings").add(booking).then(() => {
    selectedRoom = null;
    selectedDate = null;
    document.getElementById('inputName').value = '';
    document.getElementById('inputPeople').value = '';
    document.getElementById('inputPassword').value = ''; // 🟢 입력칸 초기화
    document.getElementById('selectedDateDisplay').classList.remove('show');
    renderCalendar();
    
    const [y, m, d] = booking.date.split('-');
    showToast(`예약 완료! ${ROOMS[booking.roomId-1].name} ${parseInt(m)}/${parseInt(d)} ${start}~${end}`, '#4a8c4a');
  }).catch((error) => {
    showToast('예약 저장 실패!', '#b84a36');
    console.error(error);
  });
}

/* =====================
   🔥 파이어베이스에서 예약 삭제하기
===================== */
function deleteBooking(dbId) {
  // 1. 삭제하려는 예약 데이터 찾기
  const targetBooking = bookings.find(b => b.dbId === dbId);
  if (!targetBooking) return;

  // 2. 팝업창으로 비밀번호 물어보기
  const inputPw = prompt('예약을 삭제하려면 비밀번호 4자리를 입력해주세요.\n(운영진은 마스터 비밀번호 입력)');
  if (inputPw === null) return; // 사용자가 취소 버튼을 누른 경우

  // 3. 비밀번호 확인하기 (🟢 "0000" 부분을 원하는 마스터 비밀번호로 바꾸세요!)
  const MASTER_PW = "0000"; 
  
  if (inputPw !== targetBooking.password && inputPw !== MASTER_PW) {
    return showToast('비밀번호가 일치하지 않습니다.', '#b84a36');
  }

  // 4. 비밀번호가 맞으면 파이어베이스에서 삭제!
  db.collection("bookings").doc(dbId).delete().then(() => {
    showToast('예약이 취소됐어요', '#fb923c');
  }).catch((error) => {
    showToast('삭제 실패!', '#b84a36');
  });
}

function showToast(msg, color = '#4ade80') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color;
  t.style.color = color === '#4ade80' ? '#000' : '#fff';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// 초기 렌더링
renderRooms();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}