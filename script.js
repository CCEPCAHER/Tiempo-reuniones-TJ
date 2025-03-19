/* Función para formatear segundos a mm:ss */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return String(mins).padStart(2, "0") + ":" + secs;
}

/* Funciones para habilitar/deshabilitar controles */
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

/* GENERACIÓN DEL REPORTE EN PDF CON AGRUPACIÓN POR BLOQUE Y SIN REPETICIÓN DE NOMBRES */
document.getElementById('generate-pdf').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ putOnlyUsedFonts: true, orientation: 'p' });
  
  // Parámetros de layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const rowHeight = 8; // Altura para cada línea de información
  
  // Encabezado general del PDF
  doc.setFillColor(180, 0, 100);
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Reporte Final de la Reunión", margin, 10);
  
  let y = 20;
  doc.setTextColor(0, 0, 0);
  const presidentName = document.getElementById("president-name").value || "N/A";
  doc.setFontSize(14);
  doc.text(`Presidente: ${presidentName}`, margin, y);
  y += 10;
  
  // Paletas de colores para encabezados y líneas de información
  const blockColors = [
    [255, 204, 204],  // rojo claro
    [204, 255, 204],  // verde claro
    [204, 204, 255],  // azul claro
    [255, 255, 204],  // amarillo claro
    [204, 255, 255],  // cian claro
    [255, 204, 255]   // magenta claro
  ];
  
  const personColors = [
    [232, 245, 233],  // verde muy claro
    [227, 242, 253],  // azul muy claro
    [255, 224, 178],  // naranja claro
    [243, 229, 245]   // lila claro
  ];
  
  // Recorremos cada bloque de la reunión (secciones con id="block-...")
  const blocks = document.querySelectorAll("section[id^='block-']");
  blocks.forEach((block, blockIndex) => {
    // Buscar en el bloque un encabezado que contenga "Perlas escondidas" (ignora mayúsculas)
    let blockTitle = "";
    const headerCandidates = block.querySelectorAll("h2");
    headerCandidates.forEach(h => {
      if (h.textContent.toLowerCase().includes("perlas escondidas")) {
        blockTitle = h.textContent.trim();
      }
    });
    // Si no se encontró, se usa el primer encabezado del bloque
    if (!blockTitle && headerCandidates.length > 0) {
      blockTitle = headerCandidates[0].textContent.trim();
    }
    
    // Dibujar el encabezado del bloque
    const blockHeaderHeight = 15;
    let blockColor = blockColors[blockIndex % blockColors.length];
    doc.setFillColor(...blockColor);
    doc.rect(margin, y, pageWidth - 2 * margin, blockHeaderHeight, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.text(blockTitle, pageWidth / 2, y + blockHeaderHeight - 4, { align: "center" });
    y += blockHeaderHeight + 4;
    
    // Recolectar las secciones hijas de este bloque
    const sections = block.querySelectorAll(".section");
    // Inicializar grupos para cada tipo de sección
    let commentGroup = {};     // Comentarios: {nombre: tiempo_total}
    let responsibleGroup = {}; // Secciones normales (asignados)
    let consejos = [];         // Array de secciones consejo
    
    sections.forEach(sec => {
      // Si la sección tiene un contenedor de comentarios...
      if (sec.querySelector(".comment-container")) {
        const commentContainer = sec.querySelector(".comment-container");
        // Se asume que los comentarios se agregan a un <ul class="comment-list"> como <li>
        const commentItems = commentContainer.querySelectorAll(".comment-list li");
        commentItems.forEach(item => {
          // Intentar extraer atributos data-name y data-duration (en segundos)
          let name = item.getAttribute("data-name");
          let duration = item.getAttribute("data-duration");
          if (!name) {
            // Si no existen, se usa el contenido del li y se asignan 30 seg por comentario
            name = item.textContent.trim();
            duration = 30;
          } else {
            name = name.trim();
            duration = duration ? parseInt(duration, 10) : 30;
          }
          commentGroup[name] = (commentGroup[name] || 0) + duration;
        });
      }
      // Si la sección tiene la clase "consejo", se procesa por separado
      else if (sec.classList.contains("consejo")) {
        consejos.push(sec);
      }
      // Caso "normal": se espera un input con clase "responsible-input"
      else {
        let input = sec.querySelector(".responsible-input");
        let name = input ? input.value.trim() : "N/A";
        let elapsed = sec.getElapsedTime ? sec.getElapsedTime() : 0;
        responsibleGroup[name] = (responsibleGroup[name] || 0) + elapsed;
      }
    });
    
    // Primero se muestran los asignados (responsable)
    if (Object.keys(responsibleGroup).length > 0) {
      let idx = 0;
      Object.entries(responsibleGroup).forEach(([name, totalTime]) => {
        let color = personColors[idx % personColors.length];
        doc.setFillColor(...color);
        doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Asignado: ${name}   Tiempo usado: ${formatTime(totalTime)}`, margin + 2, y + 6);
        y += rowHeight + 2;
        idx++;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }
    
    // Luego se muestran los comentarios
    if (Object.keys(commentGroup).length > 0) {
      doc.setFontSize(12);
      let idx = 0;
      for (let [name, totalTime] of Object.entries(commentGroup)) {
        let color = personColors[idx % personColors.length];
        doc.setFillColor(...color);
        doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(`${name}   Tiempo usado: ${formatTime(totalTime)}`, margin + 2, y + 6);
        y += rowHeight + 2;
        idx++;
        if (y > 270) { doc.addPage(); y = 20; }
      }
    }
    
    // Por último, se muestran las secciones de consejo (si las hubiera)
    if (consejos.length > 0) {
      consejos.forEach((sec, idx) => {
         let elapsed = sec.getElapsedTime ? sec.getElapsedTime() : 0;
         let label = `Consejo ${idx+1} del presidente`;
         let color = personColors[idx % personColors.length];
         doc.setFillColor(...color);
         doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');
         doc.setTextColor(0, 0, 0);
         doc.setFontSize(12);
         doc.text(`${label}   Tiempo usado: ${formatTime(elapsed)}`, margin + 2, y + 6);
         y += rowHeight + 2;
         if (y > 270) { doc.addPage(); y = 20; }
      });
    }
    
    y += 8; // Espacio entre bloques
  });
  
  doc.setFontSize(14);
  doc.text(`Presidente: ${presidentName}`, margin, y + 10);
  doc.save("reporte_reunion.pdf");
  disableAllSectionControls();
});

/* ACTUALIZA LOS NOMBRES EN ELEMENTOS .council-responsible (si existen) */
document.getElementById("president-name").addEventListener("input", function() {
  let presidentName = this.value || "No especificado";
  document.querySelectorAll(".council-responsible").forEach(el => {
    el.textContent = presidentName;
  });
});

// Función de formateo de tiempo (por ejemplo, "m:ss")
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Función para convertir un string de tiempo "m:ss" o "s" a segundos
function parseTime(timeStr) {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseInt(timeStr, 10) || 0;
}

// Función para deshabilitar los controles de sección al generar el reporte
function disableAllSectionControls() {
  document.querySelectorAll('.section-controls button').forEach(button => {
    button.disabled = true;
  });
}

// Inicia la aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', initializeApp);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log("Service Worker registrado"))
    .catch(err => console.log("Error en Service Worker:", err));
}

// Función de inicialización de la aplicación (puedes agregar más lógica aquí)
function initializeApp() {
  console.log("Aplicación iniciada");
}