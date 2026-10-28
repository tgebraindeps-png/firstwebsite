// ============================================
// НАСТРОЙКИ API
// ============================================
const API_BASE = 'https://localhost:7264/api';

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================
let cart = [];
let currentUser = null;
let currentSort = { field: 'date', direction: 'desc' };
let filters = { dateFrom: '', dateTo: '', nameSearch: '', serviceSearch: '' };
let pendingCodes = { email: null, password: null };
let cooldowns = { email: false, password: false };
const validOperators = ['29', '33', '25', '44', '17'];
let trainersFromDb = [];

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
const $ = id => document.getElementById(id);

function extractPrice(name) {
    const m = name.match(/(\d+)\s*BYN/);
    return m ? parseInt(m[1]) : 0;
}

function orderTotal(services) {
    if (!services) return 0;
    return services.split(', ').reduce((s, i) => s + extractPrice(i), 0);
}

function validatePhone(p) {
    const nums = p.replace(/[^0-9]/g, '');
    return nums.length === 12 && validOperators.includes(nums.substring(3, 5));
}

function validateRussianName(n) {
    return /^[а-яА-ЯёЁ\s\-]+$/.test(n.trim()) && n.trim().length > 0;
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

function formatDate(d) {
    if (!d) return '';
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : d;
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// ============================================
// РАБОТА С МАСКОЙ ТЕЛЕФОНА
// ============================================
function setupPhoneMask(input) {
    if (!input) return;
    const format = raw => {
        if (raw.startsWith('375')) raw = raw.slice(3);
        raw = raw.slice(0, 9);
        let f = '+375';
        if (!raw) return '+375 (__) ___ - __ - __';
        if (raw.length <= 2) return `${f} (${raw}`;
        f += ` (${raw.slice(0, 2)}) ${raw.slice(2, 5)}`;
        if (raw.length > 5) f += `-${raw.slice(5, 7)}`;
        if (raw.length > 7) f += `-${raw.slice(7, 9)}`;
        return f;
    };
    input.addEventListener('input', () => {
        input.value = format(input.value.replace(/[^0-9]/g, ''));
    });
    if (!input.value) input.value = '+375 (__) ___ - __ - __';
    input.addEventListener('focus', () => {
        if (input.value.includes('__')) input.value = '+375';
    });
    input.addEventListener('blur', () => {
        if (input.value.replace(/[^0-9]/g, '').length < 12)
            input.value = '+375 (__) ___ - __ - __';
    });
}

function onlyRussianInput(e) {
    e.target.value = e.target.value.replace(/[^а-яА-ЯёЁ\s\-]/g, '');
}

// ============================================
// РАБОТА С МОДАЛКАМИ
// ============================================
function openModal(id) {
    const m = $(id);
    if (!m) return;
    m.style.display = 'flex';
    document.body.classList.add('modal-open');

    if (id === 'adminModal') {
        // Активируем вкладку "Заказы" по умолчанию
        const tabs = document.querySelectorAll('.admin-tabs .tab-btn');
        tabs.forEach(t => t.classList.remove('active'));

        const ordersTab = document.querySelector('.admin-tabs .tab-btn[data-tab="orders"]');
        if (ordersTab) ordersTab.classList.add('active');

        document.querySelectorAll('#adminModal .tab-content').forEach(t => t.classList.remove('active'));
        const ordersContent = $('#ordersTab');
        if (ordersContent) ordersContent.classList.add('active');

        loadOrders();
        loadSupportRequests();
    }
    if (id === 'cartModal') showCheckoutForm();
}

function closeModal(id) {
    const m = typeof id === 'string' ? $(id) : id;
    if (m) {
        m.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.body.classList.remove('modal-open');
}

// ============================================
// НАСТРОЙКА ВКЛАДОК АДМИНКИ
// ============================================
function setupAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tabs .tab-btn');

    tabs.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();

            tabs.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const tabName = this.dataset.tab;

            document.querySelectorAll('#adminModal .tab-content').forEach(tab => {
                tab.classList.remove('active');
            });

            if (tabName === 'orders') {
                const ordersTab = $('#ordersTab');
                if (ordersTab) ordersTab.classList.add('active');
                loadOrders();
            } else if (tabName === 'requests') {
                const requestsTab = $('#requestsTab');
                if (requestsTab) requestsTab.classList.add('active');
                loadSupportRequests();
            }
        });
    });
}

// ============================================
// РАБОТА С ТРЕНЕРАМИ (ИЗ БД)
// ============================================
async function loadTrainers() {
    try {
        const response = await fetch(`${API_BASE}/trainers`);
        if (!response.ok) throw new Error('Ошибка загрузки тренеров');
        const result = await response.json();
        if (result.success && result.data) {
            trainersFromDb = result.data;
        } else {
            trainersFromDb = [];
        }
        renderTrainersPreview();
    } catch (error) {
        console.error('Ошибка загрузки тренеров:', error);
        trainersFromDb = [];
        renderTrainersPreview();
        alert('Ошибка загрузки тренеров из базы данных');
    }
}

function renderTrainersPreview() {
    const grid = $('trainersPreview');
    if (!grid) return;

    if (!trainersFromDb.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">Нет тренеров в базе данных</div>';
        return;
    }

    grid.innerHTML = trainersFromDb.slice(0, 4).map((t, i) => `
        <div class="trainer-preview-card" data-index="${i}">
            <img src="${t.photo}" alt="${escapeHtml(t.name)}" loading="lazy">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.spec)}</p>
        </div>
    `).join('');

    grid.querySelectorAll('.trainer-preview-card').forEach(c => {
        const idx = parseInt(c.dataset.index);
        c.addEventListener('click', () => showTrainerInfo(trainersFromDb[idx]));
    });
}

function renderTrainers() {
    const grid = $('trainersList');
    if (!grid) return;

    if (!trainersFromDb.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">Нет тренеров в базе данных</div>';
        return;
    }

    grid.innerHTML = trainersFromDb.map((t, i) => `
        <div class="trainer-card" data-index="${i}">
            <img src="${t.photo}" alt="${escapeHtml(t.name)}" loading="lazy">
            <div class="trainer-card-body">
                <div>
                    <h4>${escapeHtml(t.name)}</h4>
                    <p style="color:#999;font-size:13px;">${escapeHtml(t.spec)}</p>
                </div>
                <div class="trainer-price">35 BYN</div>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.trainer-card').forEach(c => {
        const idx = parseInt(c.dataset.index);
        c.addEventListener('click', () => showTrainerInfo(trainersFromDb[idx]));
    });
}

function showTrainerInfo(t) {
    const content = $('trainerInfoContent');
    if (!content) return;
    content.innerHTML = `
        <img src="${t.photo}" alt="${escapeHtml(t.name)}" class="trainer-info-modal-img">
        <h3 style="color:var(--orange);font-size:22px;margin-bottom:4px;">${escapeHtml(t.name)}</h3>
        <p style="color:#999;font-size:14px;margin-bottom:12px;">${escapeHtml(t.spec)}</p>
        <div style="margin-bottom:10px;padding:8px 12px;background:#1a1a1a;border-radius:4px;border-left:3px solid var(--orange);">
            <strong>Опыт:</strong> ${t.experience}
        </div>
        <div style="margin-bottom:10px;padding:8px 12px;background:#1a1a1a;border-radius:4px;border-left:3px solid var(--orange);">
            <strong>Достижения:</strong> ${t.achievements}
        </div>
        <p style="color:#ddd;font-size:14px;margin-bottom:16px;">${t.description}</p>
        <div style="display:flex;gap:10px;">
            <button class="btn btn-orange btn-full" onclick="addToCart('trainer', '${escapeHtml(t.name)} (${escapeHtml(t.spec)})')">
                <i class="fas fa-shopping-cart"></i> Записаться (35 BYN)
            </button>
        </div>
    `;
    openModal('trainerInfoModal');
}

// ============================================
// АВТОРИЗАЦИЯ (РАБОТА С API)
// ============================================
async function registerUser() {
    const name = $('regName').value.trim();
    const email = $('regEmail').value.trim();
    const password = $('regPass').value.trim();
    const phone = $('regPhone').value.trim();

    if (!validateRussianName(name)) return alert('Имя — только кириллица');
    if (password.length < 4) return alert('Пароль минимум 4 символа');
    if (!validatePhone(phone)) return alert('Неверный телефон');

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка регистрации');
        }

        alert('Регистрация успешна! Теперь войдите в аккаунт.');
        document.querySelector('[data-auth-tab="login"]').click();

        $('regName').value = '';
        $('regEmail').value = '';
        $('regPass').value = '';
        $('regPhone').value = '';

    } catch (error) {
        alert(error.message);
    }
}

async function loginUser() {
    const email = $('loginEmail').value.trim();
    const password = $('loginPass').value.trim();

    if (!email || !password) return alert('Заполните все поля');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Неверный email или пароль');
        }

        localStorage.setItem('token', data.data.token);
        currentUser = data.data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        closeModal('authModal');
        updateAuthUI();
        alert(`Добро пожаловать, ${currentUser.name}!`);

    } catch (error) {
        alert(error.message);
    }
}

async function updateProfile() {
    if (!currentUser) return;

    const newName = $('settingsName').value.trim();
    const newPhone = $('settingsPhone').value.trim();
    const newEmail = $('settingsNewEmail').value.trim();
    const newPassword = $('settingsNewPassword').value.trim();
    const confirmPassword = $('settingsConfirmPassword').value.trim();

    if (!validateRussianName(newName)) return alert('Имя — только кириллица');
    if (!validatePhone(newPhone)) return alert('Неверный телефон');

    if (newPassword && newPassword !== confirmPassword) {
        return alert('Пароли не совпадают');
    }
    if (newPassword && newPassword.length < 4) {
        return alert('Пароль минимум 4 символа');
    }

    try {
        const response = await fetch(`${API_BASE}/auth/update`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id: currentUser.id,
                name: newName,
                phone: newPhone,
                email: newEmail || undefined,
                password: newPassword || undefined
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка обновления');
        }

        currentUser = data.data;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateAuthUI();
        closeModal('settingsModal');
        alert('Профиль обновлён!');

    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    if (confirm('Выйти?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        currentUser = null;
        updateAuthUI();
        $('profileDropdownMenu').style.display = 'none';
        alert('Вы вышли');
    }
}

function updateAuthUI() {
    const adminBtn = $('adminPanelBtn');
    if (currentUser) {
        $('authBtnText').innerText = currentUser.name;
        if (currentUser.role === 'admin') {
            adminBtn.style.display = 'inline-flex';
        } else {
            adminBtn.style.display = 'none';
        }
    } else {
        $('authBtnText').innerText = 'Вход';
        adminBtn.style.display = 'none';
    }
}

// ============================================
// РАБОТА С ЗАКАЗАМИ (API)
// ============================================
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Требуется авторизация для просмотра заказов');
                return;
            }
            throw new Error('Ошибка загрузки заказов');
        }

        const result = await response.json();
        if (result.success && result.data) {
            renderOrdersTable(result.data);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        const tbody = $('ordersTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7">Ошибка загрузки заказов</td></tr>';
    }
}

function renderOrdersTable(orders) {
    const tbody = $('ordersTableBody');
    if (!tbody) return;

    let filtered = [...orders];

    if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(o => {
            const orderDate = new Date(o.date);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate >= fromDate;
        });
    }
    if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => {
            const orderDate = new Date(o.date);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate <= toDate;
        });
    }
    if (filters.nameSearch) {
        filtered = filtered.filter(o => o.name.toLowerCase().includes(filters.nameSearch.toLowerCase()));
    }
    if (filters.serviceSearch) {
        filtered = filtered.filter(o => o.serviceTrainer.toLowerCase().includes(filters.serviceSearch.toLowerCase()));
    }

    if (currentSort.field === 'name') {
        filtered.sort((a, b) => currentSort.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    } else if (currentSort.field === 'date') {
        filtered.sort((a, b) => currentSort.direction === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
    } else if (currentSort.field === 'total') {
        filtered.sort((a, b) => currentSort.direction === 'asc' ? orderTotal(a.serviceTrainer) - orderTotal(b.serviceTrainer) : orderTotal(b.serviceTrainer) - orderTotal(a.serviceTrainer));
    }

    const totalSpan = $('totalOrdersCount');
    if (totalSpan) totalSpan.innerText = filtered.length;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7">Нет заказов</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(o => `
        <tr>
            <td>${o.id}</td>
            <td>${escapeHtml(o.name)}</td>
            <td>${escapeHtml(o.phone)}</td>
            <td>${escapeHtml(o.serviceTrainer)}</td>
            <td>${formatDate(o.date)}</td>
            <td>${orderTotal(o.serviceTrainer)} BYN</td>
            <td>
                <button class="delete-row-btn" data-id="${o.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.delete-row-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteOrder(btn.dataset.id));
    });

    updateSortIcons();
}

async function deleteOrder(id) {
    if (!confirm('Удалить заказ?')) return;
    try {
        const response = await fetch(`${API_BASE}/orders/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Ошибка удаления');
        await loadOrders();
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}

async function clearAllOrders() {
    if (!confirm('Удалить все заказы?')) return;
    try {
        const response = await fetch(`${API_BASE}/orders/clear`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Ошибка очистки');
        await loadOrders();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function createOrder(name, phone, services, date) {
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, serviceTrainer: services, date })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Ошибка создания заказа');
        return data;
    } catch (error) {
        throw error;
    }
}

// ============================================
// РАБОТА С ЗАЯВКАМИ (API)
// ============================================
async function loadSupportRequests() {
    try {
        const response = await fetch(`${API_BASE}/support`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                return;
            }
            throw new Error('Ошибка загрузки заявок');
        }

        const result = await response.json();
        if (result.success && result.data) {
            renderSupportRequests(result.data);
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function renderSupportRequests(requests) {
    const c = $('supportRequestsList');
    if (!c) return;

    if (!requests || !requests.length) {
        c.innerHTML = '<div>Нет заявок</div>';
        return;
    }

    c.innerHTML = requests.map(r => `
        <div class="support-request">
            <strong>${escapeHtml(r.name)}</strong> · ${escapeHtml(r.phone)} · ${escapeHtml(r.time || 'не указано')}
            <br>${escapeHtml(r.question || '-')}
            <br><small>${r.date}</small>
        </div>
    `).join('');
}

async function createSupportRequest(name, phone, time, question) {
    try {
        const response = await fetch(`${API_BASE}/support`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, time, question })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Ошибка отправки');
        return data;
    } catch (error) {
        throw error;
    }
}

async function clearAllRequests() {
    if (!confirm('Удалить все заявки?')) return;
    try {
        const response = await fetch(`${API_BASE}/support/clear`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Ошибка очистки');
        await loadSupportRequests();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// КОРЗИНА
// ============================================
function updateCartUI() {
    $('cartCounter').innerText = cart.length;
    renderCartList();
}

function renderCartList() {
    const cont = $('cartItemsList');
    if (!cont) return;

    if (!cart.length) {
        cont.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">Корзина пуста</div>';
        $('checkoutForm').innerHTML = '';
        return;
    }

    let total = 0;
    cont.innerHTML = cart.map((item, idx) => {
        const price = extractPrice(item.name);
        total += price;
        return `
            <div class="cart-item">
                <div>${escapeHtml(item.name)}${price ? ` — ${price} BYN` : ''}</div>
                <button class="remove-cart-item" data-idx="${idx}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('') + `
        <div class="cart-total">Итого: ${total} BYN</div>
    `;

    cont.querySelectorAll('.remove-cart-item').forEach(btn => {
        btn.addEventListener('click', () => {
            cart.splice(+btn.dataset.idx, 1);
            updateCartUI();
        });
    });

    showCheckoutForm();
}

function showCheckoutForm() {
    if (!cart.length) {
        $('checkoutForm').innerHTML = '';
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    $('checkoutForm').innerHTML = `
        <h4 style="color:#ff6a00;margin-bottom:10px;">Оформление</h4>
        <input type="text" id="checkoutName" class="input name-input" placeholder="ФИО">
        <input type="tel" id="checkoutPhone" class="input phone-input" placeholder="+375 (__) ___ - __ - __">
        <input type="date" id="checkoutDate" class="input" value="${today}">
        <button class="btn btn-orange btn-full" id="confirmCheckout">Подтвердить</button>
    `;

    setupPhoneMask($('checkoutPhone'));
    $('checkoutName').addEventListener('input', onlyRussianInput);

    $('confirmCheckout').onclick = async () => {
        const name = $('checkoutName').value.trim();
        const phone = $('checkoutPhone').value.trim();
        const date = $('checkoutDate').value;

        if (!name || !phone) return alert('Заполните поля');
        if (!validateRussianName(name)) return alert('Имя — только кириллица');
        if (!validatePhone(phone)) return alert('Неверный телефон');

        try {
            await createOrder(name, phone, cart.map(i => i.name).join(', '), date);
            cart = [];
            updateCartUI();
            closeModal('cartModal');
            alert('Заказ оформлен!');
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
}

function addToCart(type, name) {
    const full = type === 'trainer' ? `Тренер: ${name} - 35 BYN` : name;
    cart.push({ type, name: full });
    updateCartUI();
    alert(`${full} добавлено в корзину`);
}

// ============================================
// УТИЛИТЫ ДЛЯ АДМИНКИ
// ============================================
function updateSortIcons() {
    [['sortName', 'name'], ['sortDate', 'date'], ['sortTotal', 'total']].forEach(([id, field]) => {
        const el = $(id)?.querySelector('.sort-icon');
        if (el) {
            el.textContent = currentSort.field === field ?
                (currentSort.direction === 'asc' ? '↑' : '↓') : '↕';
        }
    });
}

function setSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
    }
    loadOrders();
}

function applyFilters() {
    filters.dateFrom = $('filterDateFrom').value;
    filters.dateTo = $('filterDateTo').value;
    filters.nameSearch = $('filterNameSearch').value.trim();
    filters.serviceSearch = $('filterServiceSearch').value.trim();
    loadOrders();
}

function resetFilters() {
    ['filterDateFrom', 'filterDateTo', 'filterNameSearch', 'filterServiceSearch']
        .forEach(id => $(id).value = '');
    filters = { dateFrom: '', dateTo: '', nameSearch: '', serviceSearch: '' };
    loadOrders();
}

// ============================================
// SMS КОДЫ (ИМИТАЦИЯ)
// ============================================
function showSmsNotification(phone, code) {
    const n = document.createElement('div');
    n.className = 'sms-notification';
    n.innerHTML = `<strong>SMS</strong><br>${phone}<br>Код: <b>${code}</b>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 8000);
    alert(`СМС на ${phone}\nКод: ${code}`);
}

function sendCodeToPhone(phone, type) {
    if (!validatePhone(phone)) return alert('Укажите корректный номер'), false;
    if (cooldowns[type]) return alert('Подождите 60 сек'), false;

    pendingCodes[type] = Math.floor(100000 + Math.random() * 900000);
    showSmsNotification(phone, pendingCodes[type]);
    cooldowns[type] = true;

    let t = 60;
    const el = $('resendTimer');
    const iv = setInterval(() => {
        t--;
        if (t <= 0) {
            clearInterval(iv);
            cooldowns[type] = false;
            if (el) el.textContent = '';
        } else if (el) {
            el.textContent = `Повтор через ${t} сек`;
        }
    }, 1000);
    return true;
}

// ============================================
// НАСТРОЙКИ ПРОФИЛЯ
// ============================================
function openSettings() {
    if (!currentUser) return alert('Войдите в аккаунт');
    $('settingsName').value = currentUser.name || '';
    $('settingsPhone').value = currentUser.phone || '+375 (__) ___ - __ - __';
    $('settingsNewEmail').value = currentUser.email || '';
    setupPhoneMask($('settingsPhone'));
    ['settingsNewPassword', 'settingsConfirmPassword', 'emailSmsCode', 'passwordSmsCode']
        .forEach(id => $(id).value = '');
    pendingCodes = { email: null, password: null };
    openModal('settingsModal');
}

function toggleProfileDropdown() {
    const dropdown = $('profileDropdownMenu');
    if (!dropdown) return;
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// ============================================
// НАСТРОЙКА ЗАКРЫТИЯ МОДАЛЬНЫХ ОКОН (КРЕСТИКИ)
// ============================================
function setupModalClose() {
    document.querySelectorAll('.modal-close, .close-special').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'flex') {
                    modal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            });
        }
    });
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
function setupServices() {
    document.querySelectorAll('.services-list li').forEach(li => {
        li.onclick = () => addToCart('service', li.dataset.service);
    });
}

function closeMobileNav() {
    const burger = $('burgerBtn');
    const nav = $('mainNav');
    burger?.classList.remove('active');
    nav?.classList.remove('open');
}

// ============================================
// DOM CONTENT LOADED
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка данных
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    cart = [];
    updateCartUI();
    loadTrainers();
    updateAuthUI();

    // Настройка масок телефона
    document.querySelectorAll('.phone-input').forEach(setupPhoneMask);
    $('orderName')?.addEventListener('input', onlyRussianInput);

    // ============================================
    // НАВИГАЦИЯ
    // ============================================
    $('servicesPanelBtn').onclick = () => {
        openModal('servicesModal');
        setupServices();
        closeMobileNav();
    };
    $('trainersPanelBtn').onclick = () => {
        renderTrainers();
        openModal('trainersModal');
        closeMobileNav();
    };
    $('cartPanelBtn').onclick = () => {
        renderCartList();
        openModal('cartModal');
        closeMobileNav();
    };
    $('adminPanelBtn').onclick = () => {
        openModal('adminModal');
        closeMobileNav();
    };
    $('heroPricesBtn').onclick = () => $('servicesPanelBtn').click();
    $('heroTrainersBtn').onclick = () => $('trainersPanelBtn').click();
    $('showAllTrainersBtn').onclick = () => $('trainersPanelBtn').click();
    $('scrollContactsBtn').onclick = () => {
        $('contacts').scrollIntoView({ behavior: 'smooth' });
        closeMobileNav();
    };
    $('homeLogo').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // ============================================
    // ФОРМА ЗАЯВКИ
    // ============================================
    $('orderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('orderName').value.trim();
        const phone = $('orderPhone').value.trim();
        const time = $('orderTime').value;
        const question = $('orderQuestion').value;

        if (!name || !phone) return alert('Заполните поля');
        if (!validateRussianName(name)) return alert('Имя — только кириллица');
        if (!validatePhone(phone)) return alert('Неверный телефон');

        try {
            await createSupportRequest(name, phone, time, question);
            alert('Заявка отправлена!');
            e.target.reset();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });

    // ============================================
    // АВТОРИЗАЦИЯ
    // ============================================
    $('doLogin').onclick = loginUser;
    $('doReg').onclick = registerUser;

    // Переключение табов авторизации
    document.querySelectorAll('[data-auth-tab]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $('loginTab').hidden = btn.dataset.authTab !== 'login';
            $('registerTab').hidden = btn.dataset.authTab !== 'register';
            if (btn.dataset.authTab === 'register') setupPhoneMask($('regPhone'));
        };
    });

    // ============================================
    // ПРОФИЛЬ И ВЫХОД
    // ============================================
    $('authPanelBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentUser) {
            toggleProfileDropdown();
        } else {
            openModal('authModal');
        }
    });

    document.addEventListener('click', (e) => {
        const dropdown = $('profileDropdownMenu');
        const btn = $('authPanelBtn');
        if (dropdown && btn) {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        }
    });

    $('settingsLink').onclick = (e) => {
        e.preventDefault();
        $('profileDropdownMenu').style.display = 'none';
        openSettings();
    };

    $('logoutLink').onclick = (e) => {
        e.preventDefault();
        $('profileDropdownMenu').style.display = 'none';
        logout();
    };

    // ============================================
    // КНОПКИ АДМИНКИ
    // ============================================
    $('clearAllOrdersBtn')?.addEventListener('click', clearAllOrders);
    $('clearRequestsBtn')?.addEventListener('click', clearAllRequests);
    $('applyFiltersBtn')?.addEventListener('click', applyFilters);
    $('resetFiltersBtn')?.addEventListener('click', resetFilters);
    $('sortName')?.addEventListener('click', () => setSort('name'));
    $('sortDate')?.addEventListener('click', () => setSort('date'));
    $('sortTotal')?.addEventListener('click', () => setSort('total'));

    // ============================================
    // НАСТРОЙКА ВКЛАДОК АДМИНКИ
    // ============================================
    setupAdminTabs();

    // ============================================
    // НАСТРОЙКА ЗАКРЫТИЯ МОДАЛОК (КРЕСТИКИ)
    // ============================================
    setupModalClose();

    // ============================================
    // SMS КОДЫ И НАСТРОЙКИ
    // ============================================
    $('sendEmailCodeBtn').onclick = () => {
        const phone = $('settingsPhone');
        if (phone) sendCodeToPhone(phone.value.trim(), 'email');
    };

    $('sendPasswordCodeBtn').onclick = () => {
        const phone = $('settingsPhone');
        if (phone) sendCodeToPhone(phone.value.trim(), 'password');
    };

    $('saveSettingsBtn').onclick = updateProfile;

    // ============================================
    // БУРГЕР-МЕНЮ
    // ============================================
    const burger = $('burgerBtn');
    const nav = $('mainNav');
    burger?.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('open');
    });

    console.log('✅ ARGK Gym приложение запущено!');
    console.log('📡 API:', API_BASE);
});