// Función para formatear segundos a mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return String(mins).padStart(2, "0") + ":" + secs;
}

// Funciones para habilitar/deshabilitar controles
function disableAllSectionControls() {
  document.querySelectorAll('.start-btn, .pause-btn, .reset-btn, .comment-start, .comment-end, .next-comment, .section-controls button').forEach(btn => {
    btn.disabled = true;
  });
}
function enableAllSectionControls() {
  document.querySelectorAll('.start-btn, .pause-btn, .reset-btn, .comment-start, .comment-end, .next-comment, .section-controls button').forEach(btn => {
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
  let allocatedTime = allocatedInput
    ? parseInt(allocatedInput.value, 10)
    : parseInt(section.dataset.allocated, 10) || 0;
  
  const timerDisplay = section.querySelector('.timer-display');
  const startBtn = section.querySelector('.start-btn');
  const pauseBtn = section.querySelector('.pause-btn');
  const resetBtn = section.querySelector('.reset-btn');
  
  let accumulatedTime = 0;
  let startTime = null;
  let intervalId = null;
  
  function updateDisplay() {
    let currentTime = accumulatedTime;
    if (startTime !== null) {
      currentTime += Math.floor((Date.now() - startTime) / 1000);
    }
    const diff = currentTime - allocatedTime;
    const sign = diff < 0 ? "-" : (diff > 0 ? "+" : "");
    timerDisplay.innerHTML = `<span class="time-main">${formatTime(currentTime)}</span> <span class="time-diff">(${sign}${formatTime(Math.abs(diff))})</span>`;
    timerDisplay.classList.toggle('green', diff <= 0);
    timerDisplay.classList.toggle('red', diff > 0);
  }
  
  function startTimer() {
    if (!meetingStart && !section.classList.contains('consejo') && !section.classList.contains('with-comments')) return;
    if (startTime !== null) return;
    startTime = Date.now();
    intervalId = setInterval(updateDisplay, 250);
  }
  
  function pauseTimer() {
    if (startTime !== null) {
      accumulatedTime += Math.floor((Date.now() - startTime) / 1000);
      startTime = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    updateDisplay();
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
        accumulatedTime = 0;
        startTime = null;
        updateDisplay();
        updateSectionTimes();
      }
    });
  }
  
  section.getElapsedTime = () => {
    let elapsed = accumulatedTime;
    if (startTime !== null) elapsed += Math.floor((Date.now() - startTime) / 1000);
    return elapsed;
  };
  section.getAllocatedTime = () => allocatedTime;
  
  updateDisplay();
});
/* FUNCIONES PARA AGRUPAR SECCIONES */
function collectSections(element) {
  let sections = [];
  if (element.classList && element.classList.contains("section")) {
    sections.push(element);
  }
  element.querySelectorAll(".section").forEach(sec => {
    sections.push(sec);
  });
  return sections;
}

const allSectionGroups = [];
document.querySelectorAll("h2").forEach(h2 => {
  const group = { title: h2.textContent.trim(), sections: [] };
  let sibling = h2.nextElementSibling;
  while (sibling && sibling.tagName !== "H2") {
    if (sibling.classList && sibling.classList.contains("section")) {
      group.sections.push(sibling);
    } else {
      const innerSections = collectSections(sibling);
      innerSections.forEach(sec => group.sections.push(sec));
    }
    sibling = sibling.nextElementSibling;
  }
  allSectionGroups.push(group);
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
  
  let commentAccumulated = 0;
  let commentStartTime = null;
  let commentInterval = null;
  let commentCount = 0;
  let commentsData = [];
  
  function updateCommentDisplay() {
    let currentTime = commentAccumulated;
    if (commentStartTime !== null) {
      currentTime += Math.floor((Date.now() - commentStartTime) / 1000);
    }
    commentTimerDisplay.textContent = formatTime(currentTime);
    commentTimerDisplay.classList.toggle('green', currentTime <= 30);
    commentTimerDisplay.classList.toggle('red', currentTime > 30);
  }
  
  commentStartBtn.addEventListener('click', () => {
    if (!commentInterval) {
      commentStartTime = Date.now();
      commentInterval = setInterval(updateCommentDisplay, 250);
    }
  });
  
  commentEndBtn.addEventListener('click', () => {
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
    }
    if (commentStartTime !== null) {
      commentAccumulated += Math.floor((Date.now() - commentStartTime) / 1000);
      commentStartTime = null;
    }
    updateCommentDisplay();
  });
  
  nextCommentBtn.addEventListener('click', () => {
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
    }
    if (commentStartTime !== null) {
      commentAccumulated += Math.floor((Date.now() - commentStartTime) / 1000);
      commentStartTime = null;
    }
    let name = commentNameInput.value.trim() || "Sin nombre";
    let duration = commentAccumulated;
    let exceeded = duration > 30;
    commentCount++;
    commentCountSpan.textContent = commentCount;
    let li = document.createElement('li');
    li.contentEditable = true;
    li.textContent = exceeded 
      ? `Comentario ${commentCount} - ${name}: ${formatTime(duration)} (Dif: +${formatTime(duration - 30)})`
      : `Comentario ${commentCount} - ${name}: ${formatTime(duration)}`;
    li.style.backgroundColor = "#c8e6c9";
    commentList.appendChild(li);
    setTimeout(() => { li.style.backgroundColor = ""; }, 2000);
    commentsData.push({ name, duration, exceeded });
    commentAccumulated = 0;
    commentStartTime = null;
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


  document.getElementById('generate-pdf').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ putOnlyUsedFonts: true, orientation: 'p' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 20;
  const rowHeight = 8;

  // Función para formatear la hora (formato HH:MM)
  function formatDateTime(date) {
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  }

  // Encabezado general del PDF
  doc.setFillColor(180, 0, 100);
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Reporte Final de la Reunión", pageWidth / 2, 12, { align: "center" });

  y = 30;
  doc.setTextColor(0, 0, 0);
  // Se obtiene el nombre del presidente (para introducción y resumen)
  const presidentName = document.getElementById("president-name").value || "N/A";
  doc.setFontSize(14);
  doc.text(`Presidente: ${presidentName}`, margin, y);
  y += 10;

  // Mostrar hora de inicio
  const startTimeStr = meetingStart ? formatDateTime(meetingStart) : "No iniciado";
  doc.text(`Hora de inicio: ${startTimeStr}`, margin, y);
  y += 10;

  // ---------------------------
  // INTEGRACIÓN DE LA IMAGEN (si existe)
  const imageElement = document.getElementById("myImage");
  if (imageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageElement, 0, 0);
    const imgData = canvas.toDataURL("image/png");

    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (imageElement.naturalHeight * imgWidth) / imageElement.naturalWidth;
    doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
    y += imgHeight + 10;
  }
  // ---------------------------

  // Función auxiliar para buscar recursivamente secciones dentro de un contenedor
  function collectSections(element) {
    let sections = [];
    if (element.classList && element.classList.contains("section")) {
      sections.push(element);
    }
    element.querySelectorAll(".section").forEach(sec => {
      sections.push(sec);
    });
    return sections;
  }

  // Agrupar todas las secciones según el h2 que las precede (buscando recursivamente)
  const allSectionGroups = [];
  document.querySelectorAll("h2").forEach(h2 => {
    const group = { title: h2.textContent.trim(), sections: [] };
    let sibling = h2.nextElementSibling;
    while (sibling && sibling.tagName !== "H2") {
      if (sibling.classList && sibling.classList.contains("section")) {
        group.sections.push(sibling);
      } else {
        const innerSections = collectSections(sibling);
        innerSections.forEach(sec => group.sections.push(sec));
      }
      sibling = sibling.nextElementSibling;
    }
    allSectionGroups.push(group);
  });

  // Paleta de colores pastel para encabezados de grupo
  const blockColors = [
    [255, 230, 230],
    [230, 255, 230],
    [230, 230, 255],
    [255, 255, 230],
    [230, 255, 255],
    [255, 230, 255]
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

  // Función auxiliar para convertir un string "mm:ss" a segundos
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
    // Título del grupo (centrado con fondo de color pastel)
    const color = blockColors[groupIndex % blockColors.length];
    doc.setFillColor(...color);
    doc.rect(margin, y, pageWidth - 2 * margin, 14, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(group.title, pageWidth / 2, y + 10, { align: "center" });
    y += 18;

    // Restaurar fuente normal para el contenido
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    group.sections.forEach((sec) => {
      // Caso 1: Bloques de "Canción" u "Oración"
      if (group.title.toLowerCase().includes("canción") || group.title.toLowerCase().includes("oración")) {
        const allocated = sec.getAttribute("data-allocated") || "0";
        const assigned = formatTime(parseInt(allocated, 10));
        doc.text(`Tiempo asignado: ${assigned}`, margin + 5, y);
        y += 8;
        const elapsed = getElapsedTimeForSection(sec);
        const elapsedSec = parseTime(elapsed);
        const allocatedSec = parseInt(allocated, 10);
        const timeColor = (elapsedSec <= allocatedSec) ? "#388e3c" : "#d32f2f";
        doc.setTextColor(timeColor);
        doc.text(`Tiempo utilizado: ${elapsed}`, margin + 5, y);
        doc.setTextColor(0, 0, 0);
        y += 10;
      }
      // Caso 2: Sección de Consejo
      else if (sec.classList.contains("consejo")) {
        doc.setFontSize(12);
        doc.setTextColor("#000");
        doc.text(`Consejo a cargo de ${presidentName}`, margin + 5, y);
        y += 8;
        const allocated = sec.getAttribute("data-allocated") || "0";
        const allocatedSec = parseInt(allocated, 10);
        if (allocated) {
          const assigned = formatTime(allocatedSec);
          doc.text(`Tiempo asignado: ${assigned}`, margin + 5, y);
          y += 8;
        }
        const elapsed = getElapsedTimeForSection(sec);
        doc.text(`Tiempo utilizado: ${elapsed}`, margin + 5, y);
        y += 10;
      }
      // Caso 3: Secciones normales (imprimir nombre asignado, título y tiempos)
      else {
        let assignedName = "";
        const assignedElem = sec.querySelector('.assigned-names') || sec.querySelector('.responsible-input');
        if (assignedElem) {
          assignedName = (assignedElem.tagName.toLowerCase() === "input")
            ? assignedElem.value.trim() || "Sin asignar"
            : assignedElem.textContent.trim() || "Sin asignar";
        }
        if (assignedName) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.text(`Asignado: ${assignedName}`, margin + 5, y);
          y += rowHeight;
        }
        // --- Extracción del título ---
        let titleText = "";
        const titleElem = sec.querySelector('.section-header .section-title');
        if (titleElem) {
          if (titleElem.tagName.toLowerCase() === "input") {
            // Se usa el valor; si está vacío, se utiliza el placeholder
            titleText = titleElem.value.trim() || titleElem.placeholder || "Sin título";
          } else {
            titleText = titleElem.textContent.trim() || "Sin título";
          }
        } else {
          titleText = "Sin título";
        }
        doc.text(`Título: ${titleText}`, margin + 5, y);
        y += rowHeight;
        // ------------------------------
        let allocated = sec.getAttribute("data-allocated");
        if (allocated) {
          allocated = formatTime(parseInt(allocated, 10));
          doc.text(`Tiempo asignado: ${allocated}`, margin + 5, y);
          y += rowHeight;
        }
        const elapsed = getElapsedTimeForSection(sec);
        doc.text(`Tiempo usado: ${elapsed}`, margin + 5, y);
        y += rowHeight;
      }
      
      // Bloque extra para imprimir los comentarios del auditorio (para secciones with-comments)
      if (sec.classList.contains("with-comments")) {
        const commentList = sec.querySelector('.comment-list');
        if (commentList) {
          const comments = commentList.querySelectorAll('li');
          if (comments.length > 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(12);
            doc.text("Comentarios del Auditorio:", margin + 5, y);
            y += rowHeight;
            comments.forEach(li => {
              let commentText = li.textContent;
              doc.text(commentText, margin + 10, y);
              y += rowHeight;
              if (y > 270) { doc.addPage(); y = 20; }
            });
            // Restaurar fuente normal
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            y += rowHeight;
          }
        }
      }
      
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 10;
  });

  // --- Pie del reporte: imprimir ambas horas ---
  // Hora de fin estimada (usando meetingStart y duración total)
  if (meetingStart) {
    const estimatedEndTime = new Date(meetingStart.getTime() + totalMeetingDuration * 1000);
    const estimatedEndTimeStr = formatDateTime(estimatedEndTime);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(204, 0, 102); // Rojo vibrante
    doc.text(`Hora de fin estimada: ${estimatedEndTimeStr}`, pageWidth / 2, y, { align: "center" });
    y += 30; // Aumentamos el espacio para separar ambas horas
  }
  // Hora de fin real (la hora actual)
  const realEndTime = new Date();
  const realEndTimeStr = formatDateTime(realEndTime);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 153, 51); // Verde vibrante
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.text(`Hora de fin real: ${realEndTimeStr}`, pageWidth / 2, y, { align: "center" });
  y += 30;

  // Resumen final
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Presidente: ${presidentName}`, margin, y);
  y += rowHeight;
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