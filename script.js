// Función para formatear segundos a mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return String(mins).padStart(2, "0") + ":" + secs;
}

// Funciones para habilitar/deshabilitar controles (se combinan ambas versiones)
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
  
  // Variables para llevar el tiempo acumulado y la marca de inicio
  let currentTime = 0;
  let accumulatedTime = 0;
  let startTimestamp = null;
  let intervalId = null;
  
  function updateDisplay() {
    // Si el timer está corriendo, recalcular el tiempo usando la diferencia real
    if (intervalId && startTimestamp !== null) {
      currentTime = accumulatedTime + Math.floor((Date.now() - startTimestamp) / 1000);
    }
    const diff = currentTime - allocatedTime;
    const sign = diff < 0 ? "-" : (diff > 0 ? "+" : "");
    timerDisplay.innerHTML = `<span class="time-main">${formatTime(currentTime)}</span> <span class="time-diff">(${sign}${formatTime(Math.abs(diff))})</span>`;
    // Cambiar colores: verde si no se excede, rojo si se excede
    if (diff <= 0) {
      timerDisplay.classList.remove('red');
      timerDisplay.classList.add('green');
    } else {
      timerDisplay.classList.remove('green');
      timerDisplay.classList.add('red');
    }
  }
  
  function startTimer() {
    // En algunos casos se evita iniciar el timer si no se ha iniciado la reunión
    if (!meetingStart && !section.classList.contains('consejo') && !section.classList.contains('with-comments')) return;
    if (intervalId) return;
    startTimestamp = Date.now();
    intervalId = setInterval(updateDisplay, 1000);
  }
  
  function pauseTimer() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      if (startTimestamp) {
        accumulatedTime += Math.floor((Date.now() - startTimestamp) / 1000);
      }
      startTimestamp = null;
      updateDisplay();
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
        accumulatedTime = 0;
        startTimestamp = null;
        updateDisplay();
        updateSectionTimes();
      }
    });
  }
  
  section.getElapsedTime = () => currentTime;
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
  
  // Variables para llevar el tiempo acumulado de comentarios
  let commentTime = 0;
  let commentAccumulatedTime = 0;
  let commentStartTimestamp = null;
  let commentInterval = null;
  let commentCount = 0;
  let commentsData = [];
  
  function updateCommentDisplay() {
    if (commentInterval && commentStartTimestamp !== null) {
      commentTime = commentAccumulatedTime + Math.floor((Date.now() - commentStartTimestamp) / 1000);
    }
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
      commentStartTimestamp = Date.now();
      commentInterval = setInterval(updateCommentDisplay, 1000);
    }
  });
  
  function pauseCommentTimer() {
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
      if (commentStartTimestamp) {
        commentAccumulatedTime += Math.floor((Date.now() - commentStartTimestamp) / 1000);
      }
      commentStartTimestamp = null;
      updateCommentDisplay();
    }
  }
  
  commentEndBtn.addEventListener('click', () => {
    pauseCommentTimer();
  });
  
  nextCommentBtn.addEventListener('click', () => {
    pauseCommentTimer();
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
    // Reiniciar el contador de comentarios
    commentTime = 0;
    commentAccumulatedTime = 0;
    commentStartTimestamp = null;
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

  // Encabezado general del PDF con fondo azul oscuro y fuente Helvetica
  doc.setFillColor(10, 50, 100); // Azul oscuro
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Reporte Final de la Reunión", pageWidth / 2, 12, { align: "center" });

  y = 30;
  doc.setTextColor(40, 40, 40); // Gris oscuro
  // Se obtiene el nombre del presidente (para introducción y resumen)
  const presidentName = document.getElementById("president-name").value || "N/A";
  // Resaltar el nombre del participante: mayor tamaño y en negrita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`Presidente: ${presidentName}`, margin, y);
  y += 12;
  // Restaurar fuente normal para el resto del contenido
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);

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

  // Paleta de colores pastel para encabezados de grupo (tonos suaves)
  const blockColors = [
    [220, 235, 245],
    [235, 245, 220],
    [245, 220, 235],
    [240, 240, 245],
    [220, 245, 245],
    [245, 235, 220]
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
    // Título del grupo (centrado con fondo en tono pastel)
    const color = blockColors[groupIndex % blockColors.length];
    doc.setFillColor(...color);
    doc.rect(margin, y, pageWidth - 2 * margin, 14, 'F');
    doc.setTextColor(10, 50, 100); // Azul oscuro para contraste
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
        const timeColor = (elapsedSec <= allocatedSec) ? "#2E7D32" : "#C62828"; // Verde para OK, rojo para excedido
        doc.setTextColor(timeColor);
        doc.text(`Tiempo utilizado: ${elapsed}`, margin + 5, y);
        doc.setTextColor(40, 40, 40);
        y += 10;
      }
      // Caso 2: Sección de Consejo
      else if (sec.classList.contains("consejo")) {
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
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
          // Resaltar el nombre del responsable: mayor tamaño, negrita y color distintivo
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(50, 100, 200); // Azul distintivo
          doc.text(`Asignado: ${assignedName}`, margin + 5, y);
          y += rowHeight;
          // Restaurar configuración
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(40, 40, 40);
        }
        // --- Extracción del título ---
        let titleText = "";
        const titleElem = sec.querySelector('.section-header .section-title');
        if (titleElem) {
          if (titleElem.tagName.toLowerCase() === "input") {
            titleText = titleElem.value.trim() || titleElem.placeholder || "Sin título";
          } else {
            titleText = titleElem.textContent.trim() || "Sin título";
          }
        } else {
          titleText = "Sin título";
        }
        // Se utiliza una fuente clara y de mayor tamaño para los títulos y tiempos
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Título: ${titleText}`, margin + 5, y);
        y += rowHeight;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        // ------------------------------
        let allocated = sec.getAttribute("data-allocated");
        if (allocated) {
          allocated = formatTime(parseInt(allocated, 10));
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`Tiempo asignado: ${allocated}`, margin + 5, y);
          y += rowHeight;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
        }
        const elapsed = getElapsedTimeForSection(sec);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Tiempo usado: ${elapsed}`, margin + 5, y);
        y += rowHeight;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
      }
      
      // Bloque extra para imprimir los comentarios del auditorio (para secciones with-comments)
      if (sec.classList.contains("with-comments")) {
        const commentList = sec.querySelector('.comment-list');
        if (commentList) {
          const comments = commentList.querySelectorAll('li');
          if (comments.length > 0) {
            // Título de comentarios en mayor tamaño y color violeta
            doc.setFont("helvetica", "italic");
            doc.setFontSize(16);
            doc.setTextColor(150, 0, 150); // Violeta
            doc.text("Comentarios del Auditorio:", margin + 5, y);
            y += rowHeight;
            // Cada comentario en tamaño un poco menor y color similar
            comments.forEach(li => {
              let commentText = li.textContent;
              doc.setFont("helvetica", "italic");
              doc.setFontSize(14);
              doc.setTextColor(150, 0, 150);
              doc.text(commentText, margin + 10, y);
              y += rowHeight;
              if (y > 270) { doc.addPage(); y = 20; }
            });
            // Restaurar configuración
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
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
    doc.setTextColor(180, 30, 80); // Rojo elegante
    doc.text(`Hora de fin estimada: ${estimatedEndTimeStr}`, pageWidth / 2, y, { align: "center" });
    y += 30;
  }
  // Hora de fin real (la hora actual)
  const realEndTime = new Date();
  const realEndTimeStr = formatDateTime(realEndTime);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 100, 0); // Verde profesional
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.text(`Hora de fin real: ${realEndTimeStr}`, pageWidth / 2, y, { align: "center" });
  y += 30;

  // Resumen final
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
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
