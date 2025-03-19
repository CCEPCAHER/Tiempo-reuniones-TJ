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

/* GENERACIÓN DEL REPORTE EN PDF CON DIVISIÓN POR COLORES Y NUEVAS ETIQUETAS */
document.getElementById('generate-pdf').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ putOnlyUsedFonts: true, orientation: 'p' });
  
  // Variables para el layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const colWidth = (pageWidth - 2 * margin) / 3; // 3 columnas para tiempos
  const rowHeight = 8;
  
  // Encabezado principal del PDF
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
  
  // Paleta de colores para cada bloque <h2>
  const blockColors = [
    [255, 204, 204], // Rojo claro
    [204, 255, 204], // Verde claro
    [204, 204, 255], // Azul claro
    [255, 255, 204], // Amarillo claro
    [204, 255, 255], // Cian claro
    [255, 204, 255]  // Magenta claro
  ];
  
  // Paleta para las secciones internas (participaciones)
  const participationColors = [
    [232, 245, 233], // Verde claro
    [227, 242, 253], // Azul muy claro
    [255, 224, 178], // Naranja claro
    [243, 229, 245]  // Lila claro
  ];
  
  let currentTimeForReport = meetingStart ? new Date(meetingStart) : new Date();
  
  // Iteramos sobre cada encabezado <h2> dentro de un bloque (<section>)
  const headers = document.querySelectorAll("section > h2");
  headers.forEach((h2, blockIndex) => {
    const blockTitle = h2.textContent;
    
    // Dibujar encabezado del bloque: fondo de color, título grande y centrado
    const blockHeaderHeight = 15;
    let blockColor = blockColors[blockIndex % blockColors.length];
    doc.setFillColor(...blockColor);
    doc.rect(margin, y, pageWidth - 2 * margin, blockHeaderHeight, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.text(blockTitle, pageWidth / 2, y + blockHeaderHeight - 4, { align: "center" });
    y += blockHeaderHeight + 4;
    
    // Procesar cada sección interna del bloque
    const sections = h2.parentElement.querySelectorAll(".section");
    sections.forEach((sec, secIndex) => {
      // Color cíclico para la sección interna 
      let bgColor = participationColors[secIndex % participationColors.length];
      doc.setFillColor(...bgColor);
      
      // Obtener "Título" y "Asignado"
      let titleElem = sec.querySelector(".section-title");
      let title = titleElem ? (titleElem.value || titleElem.textContent) : `Sección ${secIndex + 1}`;
      let respElem = sec.querySelector(".responsible-input");
      let assigned = respElem ? respElem.value || "N/A" : "N/A";
      doc.setFontSize(12);
      doc.text(`Título: ${title}`, margin, y);
      y += 6;
      doc.text(`Asignado: ${assigned}`, margin, y);
      y += 6;
      
      // Fila de tiempos en 3 columnas
      let allocated = sec.getAllocatedTime ? sec.getAllocatedTime() : 0;
      let elapsed = sec.getElapsedTime ? sec.getElapsedTime() : 0;
      const diff = elapsed - allocated;
      const sign = diff < 0 ? "-" : (diff > 0 ? "+" : "");
      doc.setFontSize(10);
      
      // Columna "Asignado"
      doc.setFillColor(200, 230, 201);
      doc.rect(margin, y, colWidth, rowHeight, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(`Asignado: ${formatTime(allocated)}`, margin + 2, y + 6);
      
      // Columna "Real"
      doc.setFillColor(187, 222, 251);
      doc.rect(margin + colWidth, y, colWidth, rowHeight, 'F');
      doc.text(`Real: ${formatTime(elapsed)}`, margin + colWidth + 2, y + 6);
      
      // Columna "Dif"
      doc.setFillColor(255, 224, 178);
      doc.rect(margin + 2 * colWidth, y, colWidth, rowHeight, 'F');
      doc.text(`Dif: ${sign}${formatTime(Math.abs(diff))}`, margin + 2 * colWidth + 2, y + 6);
      y += rowHeight + 4;
      
      // Imprimir horario (si aplica)
      if (!sec.classList.contains("no-times")) {
        let sectionStartTime = new Date(currentTimeForReport);
        let sectionEndTime = new Date(currentTimeForReport.getTime() + allocated * 1000);
        doc.setFontSize(10);
        doc.text(`Horario: ${formatDateTime(sectionStartTime)} - ${formatDateTime(sectionEndTime)}`, margin, y);
        currentTimeForReport = sectionEndTime;
        y += 6;
      }
      
      // Imprimir comentarios (si existen)
      if (sec.commentsData && sec.commentsData.length > 0) {
        doc.setFontSize(10);
        doc.text("Comentarios:", margin + 2, y);
        y += 5;
        sec.commentsData.forEach(comment => {
          let commentText = `- ${comment.name}: ${formatTime(comment.duration)}`;
          if (comment.exceeded) {
            let diffComment = comment.duration - 30;
            commentText += ` (Dif: +${formatTime(diffComment)})`;
            doc.setTextColor(255, 0, 0);
          } else {
            doc.setTextColor(33, 33, 33);
          }
          doc.text(commentText, margin + 4, y);
          y += 5;
        });
        doc.setTextColor(33, 33, 33);
        y += 3;
      }
      
      // Si se alcanza el final de la página, se agrega una nueva
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    y += 8; // Espacio entre bloques
  });
  
  doc.setFontSize(14);
  doc.text(`Presidente: ${presidentName}`, margin, y + 10);
  doc.save("reporte_reunion.pdf");
  disableAllSectionControls();
});

/* ACTUALIZA LOS NOMBRES EN .council-responsible (si existen) */
document.getElementById("president-name").addEventListener("input", function() {
  let presidentName = this.value || "No especificado";
  document.querySelectorAll(".council-responsible").forEach(el => {
    el.textContent = presidentName;
  });
});

// Inicia la aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', initializeApp);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log("Service Worker registrado"))
    .catch(err => console.log("Error en Service Worker:", err));
}