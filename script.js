// State Management
const courseData = {
    themes: [], // Ahora es un array para soportar selección múltiple
    skillHours: {}, // Mapa de habilidad -> horas dedicadas
    customTheme: '',
    sessions: 5,
    hoursPerSession: 3, // Empezamos en 3h por defecto
    modality: 'online',
    location: '',
    customLocation: '',
    email: ''
};

// DOM Elements
const themeGrid = document.getElementById('themeGrid');
const customThemeInput = document.getElementById('customTheme');
const sessionsSlider = document.getElementById('sessions');
const hoursSlider = document.getElementById('hours');
const sessionsVal = document.getElementById('sessionsVal');
const hoursVal = document.getElementById('hoursVal');
const totalHoursVal = document.getElementById('totalHours');
const locationSelector = document.getElementById('locationSelector');
const provinceSelect = document.getElementById('province');
const customLocationGroup = document.getElementById('customLocationGroup');
const customLocationInput = document.getElementById('customLocation');

// Initialize
// Initialize
function init() {
    updateTotals();
    loadSkills();
    setupEventListeners();
}

function loadSkills() {
    if (typeof SKILLS_DATA !== 'undefined' && Array.isArray(SKILLS_DATA)) {
        themeGrid.innerHTML = '';
        SKILLS_DATA.forEach(skill => {
            const button = document.createElement('button');
            button.className = 'theme-chip';
            button.dataset.value = skill;
            button.textContent = skill;
            themeGrid.appendChild(button);
        });
    } else {
        console.warn('SKILLS_DATA no encontrado. Usando valores por defecto.');
    }
}

function setupEventListeners() {
    // Theme selection - Selección múltiple con toggle
    themeGrid.addEventListener('click', (e) => {
        const chip = e.target.closest('.theme-chip');
        if (chip) {
            const val = chip.dataset.value;
            const index = courseData.themes.indexOf(val);

            if (index > -1) {
                // Si ya está, lo quitamos
                courseData.themes.splice(index, 1);
                delete courseData.skillHours[val];
                chip.classList.remove('selected');
            } else {
                // Si no está, lo añadimos
                courseData.themes.push(val);
                // Inicializar con sus horas del excel o el promedio
                courseData.skillHours[val] = (typeof SKILLS_DURATIONS !== 'undefined' && SKILLS_DURATIONS[val])
                    ? SKILLS_DURATIONS[val] : (typeof AVG_DURATION !== 'undefined' ? AVG_DURATION : 20);
                chip.classList.add('selected');
            }
            renderSkillsConfig();
            updateTotals(); // Actualizar horas al cambiar selección
        }
    });

    customThemeInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        courseData.customTheme = val;
        if (val) {
            if (!courseData.skillHours["CUSTOM"]) {
                courseData.skillHours["CUSTOM"] = (typeof AVG_DURATION !== 'undefined' ? AVG_DURATION : 20);
            }
        } else {
            delete courseData.skillHours["CUSTOM"];
        }
        renderSkillsConfig();
        updateTotals(); // Actualizar horas al escribir manual
    });

    // Range sliders
    sessionsSlider.addEventListener('input', (e) => {
        courseData.sessions = e.target.value;
        sessionsVal.textContent = e.target.value;
        updateTotals();
    });

    hoursSlider.addEventListener('input', (e) => {
        courseData.hoursPerSession = e.target.value;
        hoursVal.textContent = e.target.value;
        updateTotals();
    });

    // Location
    provinceSelect.addEventListener('change', (e) => {
        courseData.location = e.target.value;
        if (e.target.value === 'Other') {
            customLocationGroup.classList.remove('hidden');
        } else {
            customLocationGroup.classList.add('hidden');
        }
    });

    customLocationInput.addEventListener('input', (e) => {
        courseData.customLocation = e.target.value;
    });
}

function renderSkillsConfig() {
    const configContainer = document.getElementById('selectedSkillsConfig');
    const listContainer = document.getElementById('skillsHoursList');

    const hasThemes = courseData.themes.length > 0;
    const hasCustom = courseData.customTheme.trim().length > 0;

    if (!hasThemes && !hasCustom) {
        configContainer.classList.add('hidden');
        return;
    }

    configContainer.classList.remove('hidden');
    listContainer.innerHTML = '';

    // Lista de habilidades seleccionadas
    courseData.themes.forEach(theme => {
        createSkillHourRow(theme, theme, listContainer);
    });

    // Skill manual
    if (hasCustom) {
        createSkillHourRow(courseData.customTheme, "CUSTOM", listContainer);
    }
}

function createSkillHourRow(label, key, container) {
    const row = document.createElement('div');
    row.className = 'skill-hour-row';

    const span = document.createElement('span');
    span.textContent = label;

    const wrapper = document.createElement('div');
    wrapper.className = 'skill-hour-input-wrapper';

    const input = document.createElement('input');
    input.type = 'number';
    input.value = Math.round(courseData.skillHours[key] || (typeof AVG_DURATION !== 'undefined' ? AVG_DURATION : 20));
    input.min = 1;
    input.oninput = (e) => {
        courseData.skillHours[key] = parseInt(e.target.value) || 0;
        updateTotals();
    };

    const labelH = document.createElement('label');
    labelH.textContent = 'horas';

    wrapper.appendChild(input);
    wrapper.appendChild(labelH);
    row.appendChild(span);
    row.appendChild(wrapper);
    container.appendChild(row);
}

function updateTotals() {
    let totalHours = 0;

    // Sumar horas del mapa de skillHours
    for (let key in courseData.skillHours) {
        totalHours += courseData.skillHours[key];
    }

    if (totalHours === 0) {
        totalHoursVal.textContent = "0";
        return;
    }

    totalHoursVal.textContent = Math.round(totalHours);

    // NUEVA LÓGICA: Proponer sesiones dividiendo entre las horas por sesión (default 3)
    const proposedSessions = Math.max(1, Math.ceil(totalHours / courseData.hoursPerSession));

    courseData.sessions = proposedSessions;
    sessionsSlider.value = proposedSessions;
    sessionsVal.textContent = proposedSessions;

    // Asegurar que el slider de horas refleja el estado
    hoursSlider.value = courseData.hoursPerSession;
    hoursVal.textContent = courseData.hoursPerSession;
}

function setModality(m) {
    courseData.modality = m;
    document.getElementById('btnOnline').classList.toggle('active', m === 'online');
    document.getElementById('btnPresencial').classList.toggle('active', m === 'presencial');

    if (m === 'presencial') {
        locationSelector.classList.remove('hidden');
    } else {
        locationSelector.classList.add('hidden');
    }
}

// Wizard Navigation
let currentStep = 1;

function nextStep(step) {
    // Validation
    if (step === 1) {
        if (courseData.themes.length === 0 && !customThemeInput.value.trim()) {
            alert('Por favor, selecciona al menos una temática o escribe una.');
            return;
        }
    }

    if (step === 3 && courseData.modality === 'presencial') {
        if (!courseData.location) {
            alert('Por favor, selecciona una ubicación o elige "Otra".');
            return;
        }
    }

    document.getElementById(`step${step}`).classList.remove('active');
    currentStep++;
    document.getElementById(`step${currentStep}`).classList.add('active');

    // Update progress bar
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

    if (currentStep === 4) {
        renderSummary();
    }
}

function prevStep(step) {
    document.getElementById(`step${step}`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    currentStep--;
    document.getElementById(`step${currentStep}`).classList.add('active');
}

function renderSummary() {
    let allThemes = [...courseData.themes];
    if (courseData.customTheme.trim()) {
        allThemes.push(courseData.customTheme.trim());
    }

    const themesHtml = allThemes.map(t => {
        const key = courseData.themes.includes(t) ? t : "CUSTOM";
        const h = courseData.skillHours[key] || 0;
        return `<span class="summary-chip">${t} (${h}h)</span>`;
    }).join('');
    const locationDisplay = courseData.modality === 'online' ? 'Online' : (courseData.location === 'Other' ? courseData.customLocation : courseData.location);

    // Generar la lista de temáticas para la interfaz
    let trainersHtml = '';


    const summaryHtml = `
        <div class="summary-item full-width">
            <span class="summary-label">Temáticas seleccionadas:</span>
            <div class="summary-value-grid">${themesHtml || 'Ninguna'}</div>
        </div>
        <div class="summary-item">
            <span class="summary-label">Estimación Total Horas:</span>
            <span class="summary-value">${totalHoursVal.textContent}h</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Ubicación:</span>
            <span class="summary-value">${locationDisplay || 'No aplica'}</span>
        </div>
    `;
    document.getElementById('finalSummary').innerHTML = summaryHtml;
}

// --- CONFIGURACIÓN DE ENVÍO ---
// Reemplaza esta URL después de publicar tu Google Apps Script como Web App
const SCRIPT_URL = "TU_URL_DE_APPS_SCRIPT_AQUI";

function submitCourse() {
    const email = document.getElementById('email').value;
    if (!email || !email.includes('@')) {
        alert('Por favor, introduce un correo electrónico válido.');
        return;
    }

    courseData.email = email;

    let allThemes = [...courseData.themes];
    if (courseData.customTheme.trim()) {
        allThemes.push(courseData.customTheme.trim());
    }

    const locationDisplay = courseData.modality === 'online' ? 'Online' : (courseData.location === 'Other' ? courseData.customLocation : courseData.location);

    // Preparar el desglose de temáticas y formadores para el Sheet
    const themesWithHours = allThemes.map(t => {
        const key = courseData.themes.includes(t) ? t : "CUSTOM";
        const hours = courseData.skillHours[key] || 0;
        return `${t} (${hours}h)`;
    }).join(', ');


    // Mostrar estado de "Enviando..."
    const glass = document.querySelector('.wizard-container');
    const originalHtml = glass.innerHTML;
    glass.innerHTML = `
        <div class="success-screen">
            <div class="success-icon"><i class="fas fa-circle-notch fa-spin"></i></div>
            <h2>Enviando solicitud...</h2>
            <p>Estamos guardando tu configuración en nuestro sistema de Google Sheets.</p>
        </div>
    `;

    // Datos para enviar al Sheet
    const payload = {
        email: courseData.email,
        themes: themesWithHours,
        sessions: courseData.sessions,
        hoursPerSession: courseData.hoursPerSession,
        totalHours: totalHoursVal.textContent,
        modality: courseData.modality,
        location: locationDisplay
    };

    // Envío real a Google Apps Script
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(() => {
            showSuccessUI();
        })
        .catch(error => {
            console.error('Error:', error);
            glass.innerHTML = originalHtml;
            alert('Hubo un error al conectar con Google Sheets. Revisa la URL del script en script.js.');
        });
}

function showSuccessUI() {
    const glass = document.querySelector('.wizard-container');
    glass.innerHTML = `
        <div class="success-screen">
            <div class="success-icon"><i class="fas fa-check-circle"></i></div>
            <h2>¡Solicitud Recibida!</h2>
            <p>Hemos guardado tu configuración correctamente en Google Sheets.</p>
            <p class="destination-info">Pronto recibirás noticias nuestras en <strong>${courseData.email}</strong>.</p>
            
            <div class="final-nav">
                <button class="btn-primary" onclick="location.reload()">Crear otro curso</button>
            </div>
        </div>
    `;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) { }
}

// Start app
init();
