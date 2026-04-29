/* =====================
   Firebase 설정
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
   방 목록
===================== */
const ROOMS = [
  { id: 1, name: '거실',   color: '#a0622a', desc: '최대 12인', maxPeople: 12 },
  { id: 2, name: '작은방', color: '#7a9e4a', desc: '최대 6인', maxPeople: 6 },
  { id: 3, name: '보컬방', color: '#c8854a', desc: '최대 2인 · 수요일 불가', maxPeople: 2 },
];

let bookings      = [];
let selectedRoom  = null;
let filterRoom    = 'all';
let selectedDate  = null;
let deleteTargetId = null;
let deleteTargetPw = '';

const MASTER_PASSWORD = '2323'; // 운영진 마스터 비밀번호

/* =====================
   공휴일
===================== */
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

/* =====================
   달력 상태
===================== */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

/* =====================
   헤더 날짜
===================== */
const now = new Date();
const todayStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
document.getElementById('headerDate').textContent = todayStr;
document.getElementById('homeDate').textContent   = todayStr;

/* =====================
   Firestore 실시간 구독
===================== */
db.collection('bookings')
  .orderBy('date').orderBy('start')
  .onSnapshot(snapshot => {
    bookings = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    renderRooms();
    if (document.getElementById('section-status').classList.contains('active')) {
      renderStatus();
    }
  }, err => {
    console.error('Firestore 오류:', err);
    showToast('데이터 불러오기 실패', '#b84a36');
  });

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
  today.setHours(0, 0, 0, 0);

  document.getElementById('calTitle').textContent =
    `${calYear}.${String(calMonth + 1).padStart(2, '0')}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
  const grid = document.getElementById('calGrid');

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= lastDate; d++) {
    const date    = new Date(calYear, calMonth, d);
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow     = date.getDay();
    const isPast  = date < today;
    const isToday = date.getTime() === today.getTime();
    const isSel   = selectedDate === dateStr;
    const holiday = HOLIDAYS[dateStr];

    let cls = 'cal-day';
    if (isPast)  cls += ' past';
    if (isToday) cls += ' today';
    if (isSel)   cls += ' selected';
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
  selectedRoom = null; // 날짜 바뀌면 방 선택 초기화
  renderCalendar();
  renderRooms();
  const [y, m, d] = dateStr.split('-');
  const disp = document.getElementById('selectedDateDisplay');
  disp.textContent = `📅 ${y}년 ${parseInt(m)}월 ${parseInt(d)}일 선택됨`;
  disp.classList.add('show');
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  renderCalendar();
}

/* =====================
   방 카드 렌더
===================== */
function renderRooms() {
  const grid = document.getElementById('roomGrid');
  grid.innerHTML = ROOMS.map(r => {
    const dateToCheck = selectedDate || new Date().toISOString().slice(0, 10);
    
    // 해당 날짜, 해당 방의 전체 인원수 합산
    const roomBookings = bookings.filter(b => b.roomId === r.id && b.date === dateToCheck);
    const totalPeople = roomBookings.reduce((sum, b) => sum + parseInt(b.people || 0), 0);

    const isSelected = selectedRoom === r.id;
    const clickHandler = `onclick="selectRoom(${r.id})"`;
    const cardClass = `room-card ${isSelected ? 'selected' : ''}`;

    return `
      <div class="${cardClass}" ${clickHandler}>
        <div class="room-dot" style="background:${r.color}"></div>
        <div class="room-info">
          <div class="room-name">${r.name}</div>
          <div class="room-count">오늘 총 ${totalPeople}명 예약 · ${r.desc}</div>
        </div>
        <div class="room-badge badge-available">예약 가능</div>
      </div>
    `;
  }).join('');
}

/* =====================
   방 선택 (동적 인원수 조절 포함)
===================== */
function selectRoom(id) {
  selectedRoom = id;
  const typeGroup = document.getElementById('typeGroup');
  const inputType = document.getElementById('inputType');
  const peopleSelect = document.getElementById('inputPeople'); // 인원수 선택창 가져오기
  
  const room = ROOMS.find(r => r.id === id); // 선택한 방의 정보 찾기

  // 1. 방의 최대 인원에 맞춰서 인원 선택 옵션(1~max) 새로 만들기
  if (peopleSelect && room) {
    let optionsHtml = '<option value="">인원 선택</option>';
    for (let i = 1; i <= room.maxPeople; i++) {
      optionsHtml += `<option value="${i}">${i}명</option>`;
    }
    peopleSelect.innerHTML = optionsHtml;
  }

  // 2. 예약 유형(팀/개인) 세팅하기
  if (typeGroup && inputType) {
    typeGroup.style.display = 'block';
    
    if (id === 3) {
      // 보컬방(id: 3)일 경우 '개인'으로 고정
      inputType.value = '개인';
      inputType.disabled = true;
    } else {
      // 다른 방은 기본값을 '팀'으로 세팅
      inputType.value = '팀';
      inputType.disabled = false;
    }
    
    // 예약 유형에 맞춰서 인원수(1명 고정 등) 처리 함수 실행
    handleTypeChange();
  }
  
  renderRooms();
}

/* =====================
   예약 유형 변경 시 인원수 조절
===================== */
function handleTypeChange() {
  const type = document.getElementById('inputType').value;
  const peopleSelect = document.getElementById('inputPeople');

  if (type === '개인') {
    peopleSelect.value = '1';       // 1명으로 자동 변경
    peopleSelect.disabled = true;   // 다른 인원 선택 못 하게 잠금
  } else {
    peopleSelect.disabled = false;  // 팀 연습일 때는 다시 잠금 해제
  }
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
   예약 제출 → Firestore 저장
===================== */
async function submitBooking() {
  const name     = document.getElementById('inputName').value.trim();
  const people   = document.getElementById('inputPeople').value; // 선택한 인원수 (1~5)
  const start    = document.getElementById('inputStart').value;
  const end      = document.getElementById('inputEnd').value;
  const password = document.getElementById('inputPassword').value.trim();
  
  // 모든 방에서 팀/개인 값 가져오기
  const practiceType = document.getElementById('inputType') ? document.getElementById('inputType').value : '';

  if (!selectedRoom)                    return showToast('방을 선택해주세요', '#b84a36');
  if (!selectedDate)                    return showToast('날짜를 선택해주세요', '#b84a36');
  if (!name)                            return showToast('이름을 입력해주세요', '#b84a36');
  if (!people)                          return showToast('인원을 선택해주세요', '#b84a36');
  if (!start || !end)                   return showToast('시간을 입력해주세요', '#b84a36');
  if (start >= end)                     return showToast('종료 시간을 확인해주세요', '#b84a36');
  if (!password || password.length < 4) return showToast('비밀번호 4자리를 입력해주세요', '#b84a36');

  // --- [핵심 로직] 예약하려는 시간과 겹치는 기존 예약들의 인원수 합산 ---
  const r = ROOMS.find(r => r.id === selectedRoom);
  const addPeople = parseInt(people); // 5명 이상은 5명으로 계산됨
  
  const overlappingBookings = bookings.filter(b => 
    b.roomId === selectedRoom &&
    b.date === selectedDate &&
    !(end <= b.start || start >= b.end) // 시간이 조금이라도 겹치면 포함
  );

  const overlappingPeople = overlappingBookings.reduce((sum, b) => sum + parseInt(b.people || 0), 0);

  // 현재 겹치는 시간에 새 인원을 추가했을 때 최대 인원을 초과하면 예약 차단
  if (overlappingPeople + addPeople > r.maxPeople) {
    return showToast(`해당 시간에는 남은 자리가 부족해요 (현재 ${overlappingPeople}명 예약됨 / 최대 ${r.maxPeople}명)`, '#c8762a');
  }
  // -----------------------------------------------------------

  try {
    const savedDate = selectedDate;
    const savedRoom = ROOMS.find(r => r.id === selectedRoom);

    await db.collection('bookings').add({
      roomId: selectedRoom,
      date:   selectedDate,
      name, people, start, end, password,
      practiceType, 
      createdAt: new Date().toISOString()
    });

    selectedRoom = null;
    selectedDate = null;
    document.getElementById('inputName').value     = '';
    document.getElementById('inputPeople').value   = '';
    document.getElementById('inputPassword').value = '';
    document.getElementById('selectedDateDisplay').classList.remove('show');
    
    const typeGroup = document.getElementById('typeGroup');
    if(typeGroup) {
      typeGroup.style.display = 'none';
      document.getElementById('inputType').disabled = false; // 👈 이 줄을 추가해서 잠금을 풀어줍니다.
      document.getElementById('inputPeople').disabled = false; // 👈 이 줄을 추가해서 인원수 잠금을 풀어줍니다.
    }

    renderCalendar();

    const [y, m, d] = savedDate.split('-');
    showToast(`예약 완료! ${savedRoom.name} ${parseInt(m)}/${parseInt(d)} ${start}~${end}`, '#4a8c4a');
  } catch (e) {
    console.error(e);
    showToast('예약 저장 실패. 다시 시도해주세요', '#b84a36');
  }
}

   

/* =====================
   현황 렌더 (요일 탭 뷰)
===================== */

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 로컬 날짜 기준 YYYY-MM-DD 반환 (UTC 버그 방지)
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let weekStart = getWeekStart(new Date());
let selectedDayIndex = (() => {
  const today = new Date().getDay();
  return today === 0 ? 6 : today - 1; // 월=0 ... 일=6
})();

function getWeekDates(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return toLocalDateStr(d);
  });
}

function formatWeekLabel(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = new Date(start);
  return `${s.getMonth()+1}/${s.getDate()} ~ ${end.getMonth()+1}/${end.getDate()}`;
}

function changeWeek(dir) {
  weekStart.setDate(weekStart.getDate() + dir * 7);
  selectedDayIndex = 0;
  renderStatus();
}

function selectDay(index) {
  selectedDayIndex = index;
  renderStatus();
}

function renderStatus() {
  const list = document.getElementById('bookingList');
  const weekDates = getWeekDates(weekStart);
  const today = toLocalDateStr(new Date());
  const DOW = ['월','화','수','목','금','토','일'];

 // document.getElementById('totalCount').textContent = bookings.length;
  document.getElementById('weekLabel').textContent = formatWeekLabel(weekStart);
  document.getElementById('btnPrevWeek').style.opacity = '1';
  document.getElementById('btnPrevWeek').disabled = false;

  // 요일 탭 렌더
  const filterEl = document.getElementById('roomFilter');
  filterEl.innerHTML = `
    <div class="day-tabs">
      ${weekDates.map((dateStr, i) => {
        const isToday = dateStr === today;
        const isPast = dateStr < today;
        const hasBk = bookings.some(b => b.date === dateStr);
        const [,m,day] = dateStr.split('-');
        return `
          <div class="day-tab ${selectedDayIndex === i ? 'active' : ''} ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}" onclick="selectDay(${i})">
            <div class="day-tab-dow">${DOW[i]}</div>
            <div class="day-tab-date">${parseInt(day)}</div>
            ${hasBk ? '<div class="day-tab-dot"></div>' : '<div class="day-tab-dot invisible"></div>'}
          </div>
        `;
      }).join('')}
    </div>
  `;

  // 선택된 날짜의 예약
  const selectedDate = weekDates[selectedDayIndex];
  const [,m,day] = selectedDate.split('-');
  const isToday = selectedDate === today;

  const dayBookings = bookings
    .filter(b => b.date === selectedDate && (filterRoom === 'all' || b.roomId === parseInt(filterRoom)))
    .sort((a, b) => a.start.localeCompare(b.start));

    // 👇 여기에 이 두 줄을 꼭 넣어주세요!
  const totalPeople = dayBookings.reduce((sum, b) => sum + parseInt(b.people || 0), 0);
  document.getElementById('totalCount').textContent = totalPeople;

  // 날짜 헤더
  const dateHeader = `
    <div class="selected-day-header ${isToday ? 'day-today' : ''}">
      ${parseInt(m)}월 ${parseInt(day)}일 (${DOW[selectedDayIndex]})
      ${isToday ? '<span class="today-tag">오늘</span>' : ''}
    </div>
  `;

  if (dayBookings.length === 0) {
    list.innerHTML = dateHeader + `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">이날 예약이 없어요</div>
      </div>`;
    return;
  }

  list.innerHTML = dateHeader + dayBookings.map(b => {
    const room = ROOMS.find(r => r.id === b.roomId);
    if (!room) return '';
    const peopleLabel = b.people === '5' ? '5명 이상' : b.people + '명';
    const endDateTime = new Date(`${b.date}T${b.end}:00`);
    const isPast = endDateTime < new Date();
    const pastClass = isPast ? 'past' : '';
    const endBadge = isPast ? `<span style="font-size:11px;font-weight:normal;color:#888;margin-left:4px;">(종료)</span>` : '';
    return `
      <div class="booking-item ${pastClass}">
        <div class="booking-dot" style="background:${room.color}"></div>
        <div class="booking-info">
          <div class="booking-top">
            <div class="booking-name">${b.name}${b.practiceType ? ` <span style="font-size:12px;font-weight:500;color:var(--accent);">[${b.practiceType}]</span>` : ''}${endBadge}</div>
            <div class="booking-room">${room.name}</div>
          </div>
          <div class="booking-meta">
            <span>🕐 ${b.start} ~ ${b.end}</span>
            <span>👥 ${peopleLabel}</span>
          </div>
        </div>
        <button class="booking-delete" onclick="deleteBooking('${b.firestoreId}', '${b.password}')" title="삭제">✕</button>
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
function deleteBooking(firestoreId, pw) {
  deleteTargetId = firestoreId;
  deleteTargetPw = pw;
  document.getElementById('modalPassword').value = '';
  document.getElementById('modalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('modalPassword').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  deleteTargetId = null;
  deleteTargetPw = '';
}

async function confirmDelete() {
  const input = document.getElementById('modalPassword').value.trim();

  if (input !== deleteTargetPw && input !== MASTER_PASSWORD) {
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalPassword').style.borderColor = '#b84a36';
    setTimeout(() => document.getElementById('modalPassword').style.borderColor = '', 1000);
    showToast('비밀번호가 틀렸어요', '#b84a36');
    return;
  }

  try {
    await db.collection('bookings').doc(deleteTargetId).delete();
    closeModal();
    showToast('예약이 취소됐어요', '#c8762a');
  } catch (e) {
    console.error(e);
    showToast('삭제 실패. 다시 시도해주세요', '#b84a36');
  }
}

/* =====================
   토스트
===================== */
function showToast(msg, color = '#4a8c4a') {
  const t = document.getElementById('toast');
  t.textContent      = msg;
  t.style.background = color;
  t.style.color      = '#fff';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* =====================
   초기 실행
===================== */
renderRooms();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}