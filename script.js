// Función para formatear segundos a mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return String(mins).padStart(2, "0") + ":" + secs;
}

// Funciones para habilitar/deshabilitar controles
function disableAllSectionControls() {
  document.querySelectorAll('.start-btn, .pause-btn, .reset-btn, .comment-start, .comment-end, .next-comment').forEach(btn => {
    btn.disabled = true;
  });
}
function enableAllSectionControls() {
  document.querySelectorAll('.start-btn, .pause-btn, .reset-btn, .comment-start, .comment-end, .next-comment').forEach(btn => {
    btn.disabled = false;
  });
}
disableAllSectionControls();

/* VARIABLE GLOBAL: La reunión dura 105 minutos */
let meetingStart = null;
const totalMeetingDuration = 105 * 60; // en segundos

/* TEMPORIZADORES DE SECCIÓN */
document.querySelectorAll('.section').forEach(section => {
  const allocatedInput = section.querySelector('.allocated-input');
  let allocatedTime = allocatedInput ? parseInt(allocatedInput.value, 10) : parseInt(section.dataset.allocated, 10) || 0;
  
  const timerDisplay = section.querySelector('.timer-display');
  const startBtn = section.querySelector('.start-btn');
  const pauseBtn = section.querySelector('.pause-btn');
  const resetBtn = section.querySelector('.reset-btn');
  
  let currentTime = 0;
  let intervalId = null;
  
  function updateDisplay() {
    const diff = currentTime - allocatedTime;
    const sign = diff < 0 ? "-" : (diff > 0 ? "+" : "");
    timerDisplay.innerHTML = `<span class="time-main">${formatTime(currentTime)}</span> <span class="time-diff">(${sign}${formatTime(Math.abs(diff))})</span>`;
    // Los cambios de color en el DOM se hacen aquí (verde si no se excede, rojo si se excede)
    if (diff <= 0) {
      timerDisplay.classList.remove('red');
      timerDisplay.classList.add('green');
    } else {
      timerDisplay.classList.remove('green');
      timerDisplay.classList.add('red');
    }
  }
  
  function startTimer() {
    if (!meetingStart && !section.classList.contains('consejo') && !section.classList.contains('with-comments')) return;
    if (intervalId) return;
    intervalId = setInterval(() => {
      currentTime++;
      updateDisplay();
    }, 1000);
  }
  
  function pauseTimer() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  
  function finalizeAssignment() {
    pauseTimer();
    updateDisplay();
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    resetBtn.textContent = "Finalizado";
  }
  
  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (resetBtn) resetBtn.addEventListener('click', finalizeAssignment);
  
  if (allocatedInput) {
    allocatedInput.addEventListener('change', () => {
      allocatedTime = parseInt(allocatedInput.value, 10);
      if (!resetBtn.disabled) {
        currentTime = 0;
        updateDisplay();
        updateSectionTimes();
      }
    });
  }
  
  section.getElapsedTime = () => currentTime;
  section.getAllocatedTime = () => allocatedTime;
  
  updateDisplay();
});

/* FUNCIONALIDAD PARA COMENTARIOS EN SECCIONES with-comments */
document.querySelectorAll('.with-comments').forEach(section => {
  const commentNameInput = section.querySelector('.comment-name');
  const commentTimerDisplay = section.querySelector('.comment-timer');
  const commentStartBtn = section.querySelector('.comment-start');
  const commentEndBtn = section.querySelector('.comment-end');
  const nextCommentBtn = section.querySelector('.next-comment');
  const commentCountSpan = section.querySelector('.comment-count');
  const commentList = section.querySelector('.comment-list');
  
  let commentTime = 0;
  let commentInterval = null;
  let commentCount = 0;
  let commentsData = [];
  
  function updateCommentDisplay() {
    commentTimerDisplay.textContent = formatTime(commentTime);
    if (commentTime <= 30) {
      commentTimerDisplay.classList.remove('red');
      commentTimerDisplay.classList.add('green');
    } else {
      commentTimerDisplay.classList.remove('green');
      commentTimerDisplay.classList.add('red');
    }
  }
  
  commentStartBtn.addEventListener('click', () => {
    if (!commentInterval) {
      commentInterval = setInterval(() => {
        commentTime++;
        updateCommentDisplay();
      }, 1000);
    }
  });
  
  commentEndBtn.addEventListener('click', () => {
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
    }
    updateCommentDisplay();
  });
  
  nextCommentBtn.addEventListener('click', () => {
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
    }
    let name = commentNameInput.value.trim() || "Sin nombre";
    let duration = commentTime;
    let exceeded = duration > 30;
    commentCount++;
    commentCountSpan.textContent = commentCount;
    let li = document.createElement('li');
    li.contentEditable = true;
    if (exceeded) {
      let diff = duration - 30;
      li.textContent = `Comentario ${commentCount} - ${name}: ${formatTime(duration)} (Dif: +${formatTime(diff)})`;
    } else {
      li.textContent = `Comentario ${commentCount} - ${name}: ${formatTime(duration)}`;
    }
    li.style.backgroundColor = "#c8e6c9";
    commentList.appendChild(li);
    setTimeout(() => { li.style.backgroundColor = ""; }, 2000);
    commentsData.push({ name, duration, exceeded });
    commentTime = 0;
    updateCommentDisplay();
    commentNameInput.value = "";
  });
  
  section.commentsData = commentsData;
});

/* RELOJ FLOTANTE GLOBAL */
function updateFloatingClock() {
  const clock = document.getElementById("floating-clock");
  if (!meetingStart) {
    clock.textContent = "No iniciado";
    clock.style.backgroundColor = "gray";
    return;
  }
  const now = new Date();
  const elapsed = Math.floor((now - meetingStart) / 1000);
  const remaining = totalMeetingDuration - elapsed;
  clock.textContent = formatTime(remaining >= 0 ? remaining : 0);
  clock.style.backgroundColor = remaining > 0 ? "#388e3c" : "#d32f2f";
}
setInterval(updateFloatingClock, 1000);
updateFloatingClock();

/* INICIAR LA REUNIÓN COMPLETA */
document.getElementById("meeting-start-button").addEventListener("click", () => {
  if (meetingStart) return;
  meetingStart = new Date();
  enableAllSectionControls();
  updateSectionTimes();
});

/* ACTUALIZACIÓN DE HORARIOS DE SECCIÓN */
function updateSectionTimes() {
  if (!meetingStart) return;
  let currentTimeCalc = new Date(meetingStart);
  
  document.querySelectorAll(".section").forEach(sec => {
    let allocated = sec.getAllocatedTime ? sec.getAllocatedTime() : 0;
    let startStr = formatDateTime(currentTimeCalc);
    let endTime = new Date(currentTimeCalc.getTime() + allocated * 1000);
    let endStr = formatDateTime(endTime);
    
    const startField = sec.querySelector(".start-time");
    const endField = sec.querySelector(".end-time");
    if (startField) startField.value = startStr;
    if (endField) endField.value = endStr;
    
    currentTimeCalc = endTime;
  });
}
function formatDateTime(date) {
  const hrs = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${hrs}:${mins}`;
}
updateSectionTimes();
document.querySelectorAll('.allocated-input').forEach(input => {
  input.addEventListener('change', updateSectionTimes);
});

/* GENERACIÓN DEL REPORTE EN PDF CON AGRUPACIÓN POR BLOQUE Y SIN REPETICIÓN DE DATOS */
document.getElementById('generate-pdf').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ putOnlyUsedFonts: true, orientation: 'p' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 20;
  const rowHeight = 8;

  // Encabezado general del PDF con fondo degradado (simulado con un bloque grande)
  doc.setFillColor(63, 81, 181); // Azul índigo
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Reporte Final de la Reunión", pageWidth / 2, 14, { align: "center" });

  y = 30;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const presidentName = document.getElementById("president-name").value || "N/A";
  doc.text(`Presidente: ${presidentName}`, margin, y);
  y += 10;

  // Agrupar todas las secciones según el h2 que las precede
  const allSectionGroups = [];
  document.querySelectorAll("h2").forEach(h2 => {
    const group = { title: h2.textContent.trim(), sections: [] };
    let sibling = h2.nextElementSibling;
    while (sibling && sibling.tagName !== "H2") {
      if (sibling.classList && sibling.classList.contains("section")) {
        group.sections.push(sibling);
      }
      sibling = sibling.nextElementSibling;
    }
    allSectionGroups.push(group);
  });

  // Paleta de colores pastel para los encabezados de bloque
  const blockColors = [
    [255, 230, 230],  // rosa muy suave
    [230, 255, 230],  // verde muy suave
    [230, 230, 255],  // azul muy suave
    [255, 255, 230],  // amarillo suave
    [230, 255, 255],  // cian muy suave
    [255, 230, 255]   // lila muy suave
  ];

  // Función auxiliar: extraer el tiempo utilizado (se asume formato "mm:ss")
  function getElapsedTimeForSection(sec) {
    const timerDisplay = sec.querySelector('.timer-display');
    if (timerDisplay) {
      const text = timerDisplay.textContent.trim();
      const match = text.match(/^(\d+:\d{2})/);
      if (match) {
        return match[1];
      }
    }
    return "00:00";
  }

  // Función auxiliar para formatear segundos a "m:ss"
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Función auxiliar para convertir "mm:ss" a segundos
  function parseTime(timeStr) {
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return parseInt(timeStr, 10) || 0;
  }

  // Procesar cada grupo (cada h2 y sus secciones)
  allSectionGroups.forEach((group, groupIndex) => {
    if (y > 270) { doc.addPage(); y = 20; }
    // Título de grupo con fuente grande, en negro y centrado
    const color = blockColors[groupIndex % blockColors.length];
    doc.setFillColor(...color);
    doc.rect(margin, y, pageWidth - 2 * margin, 14, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(group.title, pageWidth / 2, y + 10, { align: "center" });
    y += 18;

    // Restauramos fuente normal para el contenido
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    group.sections.forEach((sec, secIndex) => {
      // Caso 1: Bloques de "Canción" o "Oración" (sin participantes)
      if (group.title.toLowerCase().includes("canción") || group.title.toLowerCase().includes("oración")) {
        const allocated = sec.getAttribute("data-allocated") || "0";
        const assigned = formatTime(parseInt(allocated, 10));
        doc.text(`Tiempo asignado: ${assigned}`, margin + 5, y);
        y += 8;
        const elapsed = getElapsedTimeForSection(sec);
        // Determinar color según tiempo: verde si en tiempo, rojo si se excede
        const elapsedSec = parseTime(elapsed);
        const allocatedSec = parseInt(allocated, 10);
        const timeColor = (elapsedSec <= allocatedSec) ? "#388e3c" : "#d32f2f";
        doc.setTextColor(timeColor);
        doc.text(`Tiempo utilizado: ${elapsed}`, margin + 5, y);
        doc.setTextColor(0, 0, 0);
        y += 10;
      }
      // Caso 2: Sección de Consejo (clase "consejo")
      else if (sec.classList.contains("consejo")) {
        // Imprimir el encabezado con el nombre del presidente
        doc.setTextColor("#388e3c"); // Por defecto verde; si se excede, luego se cambia
        doc.text(`Consejo a cargo de ${presidentName}`, margin + 5, y);
        y += 8;
        let allocated = sec.getAttribute("data-allocated") || "0";
        const allocatedSec = parseInt(allocated, 10);
        if (allocated) {
          allocated = formatTime(allocatedSec);
          doc.text(`Tiempo asignado: ${allocated}`, margin + 5, y);
          y += 8;
        }
        const elapsed = getElapsedTimeForSection(sec);
        const elapsedSec = parseTime(elapsed);
        const nameColor = (elapsedSec <= allocatedSec) ? "#388e3c" : "#d32f2f";
        doc.setTextColor(nameColor);
        doc.text(`Tiempo utilizado: ${elapsed}`, margin + 5, y);
        doc.setTextColor(0, 0, 0);
        y += 10;
      }
      // Caso 3: Secciones normales
      else {
        // Imprimir campos del encabezado (título, responsable, etc.)
        const fields = sec.querySelectorAll('.section-header input:not(.allocated-input)');
        fields.forEach(field => {
          let label = field.previousElementSibling ? field.previousElementSibling.textContent.trim() : "Título";
          let value = field.value;
          // Para "Palabras de introducción" o "Resumen y Anuncios" se usa el nombre del presidente si está vacío
          if (!value && (sec.parentElement.id === "block-0b" || sec.parentElement.id === "block-4")) {
            value = presidentName;
          }
          // Si es el campo de responsable, cambiar color según tiempo utilizado
          if (field.classList.contains("responsible-input")) {
            const allocated = sec.getAttribute("data-allocated") || "0";
            const allocatedSec = parseInt(allocated, 10);
            const elapsed = getElapsedTimeForSection(sec);
            const elapsedSec = parseTime(elapsed);
            const respColor = (elapsedSec <= allocatedSec) ? "#388e3c" : "#d32f2f";
            doc.setTextColor(respColor);
            doc.text(`${label}: ${value}`, margin + 5, y);
            doc.setTextColor(0, 0, 0);
          } else {
            doc.text(`${label}: ${value}`, margin + 5, y);
          }
          y += 8;
        });
        let allocated = sec.getAttribute("data-allocated");
        if (allocated) {
          allocated = formatTime(parseInt(allocated, 10));
          doc.text(`Tiempo asignado: ${allocated}`, margin + 5, y);
          y += 8;
        }
        const elapsed = getElapsedTimeForSection(sec);
        doc.text(`Tiempo utilizado: ${elapsed}`, margin + 5, y);
        y += 8;
        // Recorrer comentarios (todos los <li> del contenedor de comentarios)
        const commentList = sec.querySelector('.comment-container .comment-list');
        if (commentList && commentList.children.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text("Comentarios:", margin + 5, y);
          y += 8;
          doc.setFont(undefined, 'normal');
          const commentItems = Array.from(commentList.children);
          commentItems.forEach(comment => {
            const commentText = comment.textContent.trim();
            doc.text(`• ${commentText} (30s)`, margin + 10, y);
            y += 8;
            if (y > 270) { doc.addPage(); y = 20; }
          });
        }
        y += 5;
      }
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 10;
  });

  doc.setFontSize(12);
  doc.text(`Reporte generado el: ${new Date().toLocaleDateString()}`, margin, y + 10);
  doc.save("reporte_reunion_completo.pdf");
  disableAllSectionControls();
});

document.getElementById("president-name").addEventListener("input", function() {
  let presidentName = this.value || "No especificado";
  document.querySelectorAll(".council-responsible").forEach(el => {
    el.textContent = presidentName;
  });
});

function disableAllSectionControls() {
  document.querySelectorAll('.section-controls button').forEach(button => {
    button.disabled = true;
  });
}

window.addEventListener('DOMContentLoaded', initializeApp);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log("Service Worker registrado"))
    .catch(err => console.log("Error en Service Worker:", err));
}

function initializeApp() {
  console.log("Aplicación iniciada");
}