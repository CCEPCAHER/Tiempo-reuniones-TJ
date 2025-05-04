// --- UTILITY FUNCTIONS ---

/**
 * Formats seconds into mm:ss string.
 * @param {number} totalSeconds The total number of seconds.
 * @returns {string} Formatted time string (mm:ss).
 */
function formatTime(totalSeconds) {
  // Ensure totalSeconds is a non-negative number
  const validSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(validSeconds / 60);
  const seconds = Math.floor(validSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/**
 * Parses an "HH:MM" time string into a Date object for the current day.
 * @param {string} timeString The time string in "HH:MM" format.
 * @returns {Date|null} A Date object representing the time, or null if invalid format.
 */
function parseHM(timeString) {
    const parts = timeString.split(":");
    if (parts.length === 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            const now = new Date();
            now.setHours(hours, minutes, 0, 0);
            return now;
        }
    }
    return null;
}

/**
 * Formats a Date object into an "HH:MM" time string.
 * @param {Date} date The Date object.
 * @returns {string} Formatted time string (HH:MM).
 */
function formatHM(date) {
    if (!date instanceof Date || isNaN(date)) return "--:--";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

/**
 * Disables all section *control buttons*.
 * MODIFICACIÓN: Ya no deshabilita los allocated inputs aquí.
 */
function disableAllSectionControls() {
  document.querySelectorAll('.section-controls button').forEach(btn => {
    btn.disabled = true;
  });
  document.querySelectorAll('.comment-controls button').forEach(btn => {
      btn.disabled = true;
  });
  // MODIFICACIÓN: Eliminado el código que deshabilitaba '.allocated-input' aquí.
}

/**
 * Enables applicable section control buttons based on section state.
 * Allocated inputs are disabled if meeting has started.
 * Also updates the text of the reset/restart button.
 */
function enableSectionControls(sectionElement) {
    const blockIndex = sectionElement.dataset.blockIndex;
    const sectionIndex = sectionElement.dataset.sectionIndex;
    const key = `${blockIndex}-${sectionIndex}`;
    const state = meetingState[key];

    // Si el estado no existe, salir (puede pasar durante la inicialización)
    if (!state) return;

    const startBtn = sectionElement.querySelector('.start-btn');
    const pauseBtn = sectionElement.querySelector('.pause-btn');
    const resetBtn = sectionElement.querySelector('.reset-btn');
    const allocatedInput = sectionElement.querySelector('.allocated-input');

    // Habilitar/deshabilitar botones de control de sección principal
    if (startBtn) startBtn.disabled = state.status !== 'ready' && state.status !== 'paused';
    if (pauseBtn) pauseBtn.disabled = state.status !== 'running';
    // Reset/Finalize button is enabled unless state is 'ready' (before first start)
    if (resetBtn) resetBtn.disabled = state.status === 'ready';

    // Update the text of the reset/finalize/restart button
    if (resetBtn) {
        if (state.status === 'finished') {
            resetBtn.textContent = 'Reiniciar';
            resetBtn.style.backgroundColor = '#3498db'; // Blue color for Restart
            resetBtn.style.boxShadow = '0 3px 10px rgba(52, 152, 219, 0.3)';
            resetBtn.innerHTML = '<i class="fas fa-redo"></i> Reiniciar'; // Add icon
        } else {
            resetBtn.textContent = 'Finalizar';
            resetBtn.style.backgroundColor = ''; // Reset to CSS default
            resetBtn.style.boxShadow = ''; // Reset to CSS default
            resetBtn.innerHTML = '<i class="fas fa-check"></i> Finalizar'; // Add icon
        }
    }

    // MODIFICACIÓN: Deshabilitar allocated input *solo si la reunión ha comenzado*.
    if (allocatedInput) {
        allocatedInput.disabled = !!meetingStart; // Convert meetingStart (Date object or null) to boolean
    }

    // Comment controls specific logic
    if (sectionElement.classList.contains('with-comments')) {
        const commentStartBtn = sectionElement.querySelector('.comment-start');
        const commentEndBtn = sectionElement.querySelector('.comment-end');
        const nextCommentBtn = sectionElement.querySelector('.next-comment');
        const commentTimerDisplay = sectionElement.querySelector('.comment-timer');

         // Comment controls are disabled if the main section timer is finished
         const commentControlsDisabled = state.status === 'finished';

        if (commentStartBtn) commentStartBtn.disabled = commentControlsDisabled || (state.commentStatus !== 'ready' && state.commentStatus !== 'paused');
        if (commentEndBtn) commentEndBtn.disabled = commentControlsDisabled || state.commentStatus !== 'running';
        // Next comment is enabled if there's a running or paused comment AND the main section timer is not finished
        if (nextCommentBtn) nextCommentBtn.disabled = commentControlsDisabled || state.commentStatus === 'ready';

        // Update comment timer color immediately based on state
        if (commentTimerDisplay) {
            const commentTime = state.commentStatus === 'running'
                ? state.commentAccumulatedTime + Math.floor((Date.now() - (state.commentStartTime || Date.now())) / 1000)
                : state.commentAccumulatedTime;
            commentTimerDisplay.classList.toggle('green', commentTime <= 30);
            commentTimerDisplay.classList.toggle('red', commentTime > 30);
        }
    }
}

/**
 * Enables all section controls (usually after meeting starts).
 * Allocated inputs are disabled in this case by enableSectionControls.
 */
function enableAllSectionControls() {
    document.querySelectorAll('.section').forEach(enableSectionControls);
}


// --- STATE MANAGEMENT ---

// Global state object to hold meeting data
const meetingState = {};
let meetingStart = null; // Date object for the start of the meeting
let globalTimerInterval = null;
// Removed totalMeetingDuration as it's calculated dynamically

/**
 * Initializes the state for all sections based on their data attributes and input values.
 */
function initializeMeetingState() {
    document.querySelectorAll('.section').forEach(section => {
        const blockIndex = section.dataset.blockIndex;
        const sectionIndex = section.dataset.sectionIndex;
        const key = `${blockIndex}-${sectionIndex}`;

        const allocatedInput = section.querySelector('.allocated-input');
        // Read initial allocated time from the input field (in minutes), convert to seconds
        const initialAllocatedTime = allocatedInput
            ? parseInt(allocatedInput.value, 10) * 60 || 0
            : parseInt(section.dataset.allocated, 10) * 60 || 0; // Fallback to data-allocated (assuming minutes)


        const sectionTitleElement = section.querySelector('.section-title');
        const sectionTitle = sectionTitleElement
            ? sectionTitleElement.value || sectionTitleElement.placeholder || "Sin título"
            : "Sin título";


        const assignedPersonElement = section.querySelector('.assigned-person');
        const assignedPerson = assignedPersonElement
            ? assignedPersonElement.value || assignedPersonElement.placeholder || "Sin asignar"
            : "Sin asignar";


        meetingState[key] = {
            blockIndex: blockIndex,
            sectionIndex: sectionIndex,
            allocatedTime: initialAllocatedTime, // Stored in seconds
            elapsedTime: 0,
            status: 'ready', // 'ready', 'running', 'paused', 'finished'
            timerInterval: null,
            startTime: null, // Date.now() when timer starts
            scheduledStartTime: null, // Date object for programmed start time
            scheduledEndTime: null,   // Date object for programmed end time
            sectionTitle: sectionTitle,
            assignedPerson: assignedPerson,
            // Comment state (only for sections with comments)
            commentStatus: 'ready', // 'ready', 'running', 'paused'
            commentAccumulatedTime: 0,
            commentStartTime: null, // Date.now() for comment timer
            commentInterval: null,
            comments: section.classList.contains('with-comments') ? [] : undefined // Initialize only if needed
        };

        // Update display initially
        updateSectionDisplay(key);
         // Update comment display if applicable
         if(meetingState[key].comments) {
            updateCommentDisplay(key);
        }
    });
    console.log("Meeting state initialized:", meetingState);

    // MODIFICACIÓN: Deshabilitar solo los botones al inicio, no los inputs de tiempo.
    document.querySelectorAll('.section-controls button').forEach(btn => {
        btn.disabled = true; // Disable section buttons
    });
    document.querySelectorAll('.comment-controls button').forEach(btn => {
        btn.disabled = true; // Disable comment buttons
    });
    // Los botones de sección individuales se habilitarán/deshabilitarán correctamente
    // por enableSectionControls basado en el estado 'ready'. El botón 'Finalizar/Reiniciar'
    // estará deshabilitado inicialmente porque el estado es 'ready'.

    updateScheduledTimes(); // Calculate and display initial scheduled times
    updateFloatingClock(); // Initialize floating clock
}

/**
 * Updates the display for a specific section.
 * @param {string} key The state key for the section ('blockIndex-sectionIndex').
 */
function updateSectionDisplay(key) {
    const state = meetingState[key];
    const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
    if (!sectionElement || !state) return; // Added check for state

    const timerDisplay = sectionElement.querySelector('.timer-display');
    if (!timerDisplay) return; // Added check for timerDisplay

    // Calculate elapsed time based on state
    let elapsedTime = state.elapsedTime;
    if (state.status === 'running' && state.startTime) {
        elapsedTime += Math.floor((Date.now() - state.startTime) / 1000);
    }

    const diff = elapsedTime - state.allocatedTime;
    const sign = diff < 0 ? "-" : (diff > 0 ? "+" : "");
    // Use Math.abs for the difference formatting
    timerDisplay.innerHTML = `<span class="time-main">${formatTime(elapsedTime)}</span> <span class="time-diff">(${sign}${formatTime(Math.abs(diff))})</span>`;

    // Ensure classes reflect current state accurately
    timerDisplay.classList.remove('green', 'red'); // Clear previous classes
    if (state.status === 'finished' || state.status === 'running' || state.status === 'paused') {
         timerDisplay.classList.toggle('green', diff <= 0);
         timerDisplay.classList.toggle('red', diff > 0);
    } else {
         // Style for 'ready' state (e.g., neutral)
         // timerDisplay.classList.add('neutral'); // Example
    }

    // Update button states based on the current section state
    enableSectionControls(sectionElement);
}

/**
 * Updates the comment timer display for a specific section.
 * @param {string} key The state key for the section ('blockIndex-sectionIndex').
 */
function updateCommentDisplay(key) {
     const state = meetingState[key];
     const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
     // Added checks for state and sectionElement
     if (!state || !sectionElement || !sectionElement.classList.contains('with-comments')) return;

     const commentTimerDisplay = sectionElement.querySelector('.comment-timer');
     if (!commentTimerDisplay) return; // Added check

     let currentCommentTime = state.commentAccumulatedTime;
     if (state.commentStatus === 'running' && state.commentStartTime) {
         currentCommentTime += Math.floor((Date.now() - state.commentStartTime) / 1000);
     }

     commentTimerDisplay.textContent = formatTime(currentCommentTime);
     // Ensure classes reflect current state accurately
     commentTimerDisplay.classList.remove('green', 'red'); // Clear previous classes
     commentTimerDisplay.classList.toggle('green', currentCommentTime <= 30 && (state.commentStatus === 'running' || state.commentStatus === 'paused'));
     commentTimerDisplay.classList.toggle('red', currentCommentTime > 30 && (state.commentStatus === 'running' || state.commentStatus === 'paused'));

     // Update comment button states (part of enableSectionControls)
     enableSectionControls(sectionElement);
}


// --- TIMER CONTROLS ---

/**
 * Starts or resumes the timer for a specific section.
 * @param {string} key The state key for the section.
 */
function startSectionTimer(key) {
    const state = meetingState[key];
    if (!state || state.status === 'running' || state.status === 'finished') return;

    // Ensure meeting has started before starting individual timers
     if (!meetingStart) {
         console.warn("Meeting has not started yet. Cannot start individual section timer.");
         // Optional: Show a user message like alert("Debe iniciar la reunión primero.");
         return;
     }

    state.status = 'running';
    state.startTime = Date.now(); // Set startTime when starting/resuming
    // Clear any existing interval before setting a new one
    if (state.timerInterval) clearInterval(state.timerInterval);
    // Update frequently for smoothness
    state.timerInterval = setInterval(() => updateSectionDisplay(key), 250);

    console.log(`Timer started for ${key}`);
    updateSectionDisplay(key); // Initial display update after state change
}

/**
 * Pauses the timer for a specific section.
 * @param {string} key The state key for the section.
 */
function pauseSectionTimer(key) {
    const state = meetingState[key];
    if (!state || state.status !== 'running') return;

    // Calculate elapsed time since last start/resume before changing state
    if (state.startTime) {
      state.elapsedTime += Math.floor((Date.now() - state.startTime) / 1000);
    }
    state.status = 'paused';
    state.startTime = null; // Clear startTime when paused
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;

    console.log(`Timer paused for ${key}. Accumulated Elapsed: ${formatTime(state.elapsedTime)}`);
    updateSectionDisplay(key); // Update display to show paused time
}

/**
 * Finalizes the timer for a specific section.
 * @param {string} key The state key for the section.
 */
function finalizeSectionTimer(key) {
    const state = meetingState[key];
    // Allow finalizing from 'running' or 'paused' states, but not 'ready' or 'finished'
    if (!state || state.status === 'ready' || state.status === 'finished') return;

    // If running, calculate final elapsed time segment and add it
    if (state.status === 'running' && state.startTime) {
        state.elapsedTime += Math.floor((Date.now() - state.startTime) / 1000);
    }
    // If paused, elapsedTime is already up-to-date

    state.status = 'finished';
    state.startTime = null; // Ensure startTime is null
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;

    // Pause and finalize any running comment timer in this section
    if (state.comments && state.commentStatus === 'running') {
         if(state.commentStartTime){
             state.commentAccumulatedTime += Math.floor((Date.now() - state.commentStartTime) / 1000);
         }
         state.commentStartTime = null;
         if (state.commentInterval) clearInterval(state.commentInterval);
         state.commentInterval = null;
         // Keep comment state as paused? Or maybe reset? Let's keep as paused.
         state.commentStatus = 'paused';
         updateCommentDisplay(key);
    } else if (state.comments && state.commentStatus === 'paused') {
        // If comment was paused, it remains paused but controls get disabled by enableSectionControls
        updateCommentDisplay(key); // Ensure display/controls update
    }


    console.log(`Timer finalized for ${key}. Final Elapsed: ${formatTime(state.elapsedTime)}`);
    updateSectionDisplay(key); // Final display update for section timer and controls

    // Optional: Automatically start the next section's timer
    // findAndStartNextSection(key);
}

/**
 * Restarts the timer for a specific section that was previously finalized.
 * @param {string} key The state key for the section.
 */
function restartSectionTimer(key) {
    const state = meetingState[key];
    if (!state || state.status !== 'finished') return; // Only restart if it's in 'finished' state

    console.log(`Restarting timer for ${key}`);

    // Reset timer state
    state.elapsedTime = 0;
    state.status = 'ready'; // Back to ready state
    state.startTime = null;
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;

    // Reset comment state if applicable
    if (state.comments) {
         state.commentStatus = 'ready';
         state.commentAccumulatedTime = 0;
         state.commentStartTime = null;
         if (state.commentInterval) clearInterval(state.commentInterval);
         state.commentInterval = null;
         // Clear comments list in DOM and state when restarting
         state.comments = [];
         const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
         if(sectionElement) {
             const commentList = sectionElement.querySelector('.comment-list');
             const commentCount = sectionElement.querySelector('.comment-count');
             if (commentList) commentList.innerHTML = '';
             if (commentCount) commentCount.textContent = '0';
             // Reset comment name input
             const commentNameInput = sectionElement.querySelector('.comment-name');
             if (commentNameInput) commentNameInput.value = '';

         }
         updateCommentDisplay(key); // Update comment timer display (should show 00:00)
    }

    updateSectionDisplay(key); // Update main section display (should show 00:00)
    // No need to explicitly call enableSectionControls here, updateSectionDisplay does it.
    console.log(`Timer for ${key} reset.`);
}


/**
 * Finds and optionally starts the next section's timer.
 * This requires knowing the order of sections.
 * (Implementation depends on desired auto-progression logic)
 */
function findAndStartNextSection(currentKey) {
    // This is a placeholder. A full implementation would need to
    // iterate through the meeting structure to find the next 'ready' section
    // and call startSectionTimer(nextKey).
    console.log(`Section ${currentKey} finished. Logic to start next section needs implementation.`);
}


// --- COMMENT CONTROLS ---

/**
 * Starts or resumes the comment timer for a section.
 * @param {string} key The state key for the section.
 */
function startCommentTimer(key) {
    const state = meetingState[key];
    // Prevent starting if main section is finished or comment timer is already running
    if (!state || !state.comments || state.commentStatus === 'running' || state.status === 'finished') return;

     // Allow starting comment timer if main section is running or paused
     if (state.status !== 'running' && state.status !== 'paused') {
         console.warn("Main section timer is not active (running or paused). Cannot start comment timer.");
         // alert("Debe iniciar o pausar el temporizador principal de la sección primero."); // Optional user feedback
         return;
     }


    state.commentStatus = 'running';
    state.commentStartTime = Date.now(); // Set start time for the current run
    if (state.commentInterval) clearInterval(state.commentInterval); // Clear previous interval
    state.commentInterval = setInterval(() => updateCommentDisplay(key), 250); // Update frequently

    console.log(`Comment timer started for ${key}`);
    updateCommentDisplay(key); // Update display and controls
}

/**
 * Pauses the comment timer for a section.
 * @param {string} key The state key for the section.
 */
function pauseCommentTimer(key) {
    const state = meetingState[key];
    if (!state || !state.comments || state.commentStatus !== 'running') return;

    // Calculate elapsed time for the current run before changing state
    if(state.commentStartTime) {
        state.commentAccumulatedTime += Math.floor((Date.now() - state.commentStartTime) / 1000);
    }
    state.commentStatus = 'paused';
    state.commentStartTime = null; // Clear start time when paused
    if (state.commentInterval) clearInterval(state.commentInterval);
    state.commentInterval = null;

    console.log(`Comment timer paused for ${key}. Accumulated: ${formatTime(state.commentAccumulatedTime)}`);
    updateCommentDisplay(key); // Update display and controls
}

/**
 * Finalizes the current comment, adds it to the list, and resets the timer for the next comment.
 * @param {string} key The state key for the section.
 */
function finalizeAndResetCommentTimer(key) {
     const state = meetingState[key];
     const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
     // Prevent adding comments if main section is finished or if state/element missing
     if (!state || !state.comments || !sectionElement || state.status === 'finished') return;

     // Pause if running and calculate time, otherwise use accumulated time
     if (state.commentStatus === 'running') {
         if (state.commentStartTime) {
            state.commentAccumulatedTime += Math.floor((Date.now() - state.commentStartTime) / 1000);
         }
         state.commentStartTime = null;
         if (state.commentInterval) clearInterval(state.commentInterval);
         state.commentInterval = null;
     }
     // If the timer was 'ready' (never started or already reset), accumulated time is 0
     // If paused, accumulated time is already calculated.

     const commentNameInput = sectionElement.querySelector('.comment-name');
     const commentList = sectionElement.querySelector('.comment-list');
     const commentCountSpan = sectionElement.querySelector('.comment-count');

     // Ensure elements exist before proceeding
     if (!commentNameInput || !commentList || !commentCountSpan) {
         console.error("Comment UI elements not found for section", key);
         return;
     }

     const name = commentNameInput.value.trim() || "Sin nombre";
     const duration = state.commentAccumulatedTime;
     const exceeded = duration > 30; // Assuming 30 seconds limit for comments

     const comment = { name, duration, exceeded };
     state.comments.push(comment);

     // Update the comment list in the DOM
     const li = document.createElement('li');
     const timeExceededStr = exceeded ? ` (+${formatTime(duration - 30)})` : '';
     li.textContent = `${state.comments.length}. ${name}: ${formatTime(duration)}${timeExceededStr}`;
     li.style.color = exceeded ? '#c0392b' : '#2c3e50'; // Red if exceeded, dark grey otherwise
     commentList.appendChild(li);

     // Update comment count display
     commentCountSpan.textContent = state.comments.length;

     // Reset comment timer state for the next comment
     state.commentAccumulatedTime = 0;
     state.commentStatus = 'ready'; // Ready for the next comment
     state.commentStartTime = null;
     if (state.commentInterval) clearInterval(state.commentInterval); // Clear any lingering interval
     state.commentInterval = null;

     // Reset comment input and update display/controls
     commentNameInput.value = "";
     updateCommentDisplay(key); // Should reset the comment timer display and update buttons

     console.log(`Comment finalized for ${key}:`, comment);
     commentNameInput.focus(); // Focus input for next comment name
}


// --- MEETING CONTROLS ---

/**
 * Starts the global meeting timer, enables section controls, and disables allocated time inputs.
 */
function startMeeting() {
  if (meetingStart) return; // Prevent starting if already started

  meetingStart = new Date();
  console.log("Meeting started at:", meetingStart.toLocaleTimeString());

  // Enable controls for all sections. This will now also disable allocated inputs
  // because meetingStart is set.
  enableAllSectionControls();

  // Recalculate and display scheduled times based on the actual start time
  updateScheduledTimes(); // Call this *after* setting meetingStart

  // Start the global floating clock
  if (globalTimerInterval) clearInterval(globalTimerInterval); // Clear existing interval if any
  globalTimerInterval = setInterval(updateFloatingClock, 1000);
  updateFloatingClock(); // Initial call to show time immediately

  // Disable the main start button
  const startButton = document.getElementById("meeting-start-button");
  if (startButton) startButton.disabled = true;

   // MODIFICACIÓN: Explicitly disable allocated inputs again here just to be absolutely sure,
   // although enableAllSectionControls -> enableSectionControls should handle it.
   document.querySelectorAll('.allocated-input').forEach(input => {
       input.disabled = true;
   });
}

/**
 * Updates the floating global clock display.
 */
function updateFloatingClock() {
  const clock = document.getElementById("global-timer");
  const clockContainer = document.getElementById("floating-clock");
  if (!clock || !clockContainer) return; // Exit if elements not found

  // Calculate total allocated time dynamically from the current state
   let currentTotalAllocated = 0;
   for (const key in meetingState) {
       // Ensure the key belongs to meetingState and is not inherited
       if (Object.hasOwnProperty.call(meetingState, key) && meetingState[key]) {
           currentTotalAllocated += meetingState[key].allocatedTime;
       }
   }

  if (!meetingStart) {
    // Before meeting starts, show the calculated total allocated time
    clock.textContent = formatTime(currentTotalAllocated);
    clockContainer.style.backgroundColor = "rgba(128, 128, 128, 0.95)"; // Grey
    return;
  }

  // After meeting starts, calculate elapsed and remaining time
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - meetingStart.getTime()) / 1000);
  const remaining = currentTotalAllocated - elapsed; // Use dynamic total

  // Display remaining time, ensuring it doesn't go below zero visually
  clock.textContent = formatTime(Math.max(0, remaining));

  // Update background color based on remaining time
  if (remaining > 300) { // More than 5 minutes left
      clockContainer.style.backgroundColor = "rgba(39, 174, 96, 0.95)"; // Green
  } else if (remaining > 60) { // More than 1 minute left
      clockContainer.style.backgroundColor = "rgba(241, 196, 15, 0.95)"; // Yellow
  } else if (remaining > 0) { // Less than 1 minute left
       clockContainer.style.backgroundColor = "rgba(230, 126, 34, 0.95)"; // Orange
  } else { // Time is up or exceeded
    clockContainer.style.backgroundColor = "rgba(192, 57, 43, 0.95)"; // Red
     // Optional: Blink effect when time is up
     // clockContainer.classList.add('blinking');
  }
}

/**
 * Calculates and updates the scheduled start and end times for each section
 * based on the meeting start time (or current time if not started)
 * and allocated times stored in meetingState.
 */
function updateScheduledTimes() {
    // Use the actual meeting start time if available, otherwise use 'now' for projection
    const baseStartTime = meetingStart instanceof Date && !isNaN(meetingStart)
                          ? meetingStart
                          : new Date(); // Use current time for projection before start

    let currentTimeCalc = new Date(baseStartTime.getTime());

     // Get all section elements in the order they appear in the DOM
    const sectionElements = document.querySelectorAll(".section");

    sectionElements.forEach(sectionElement => {
        const blockIndex = sectionElement.dataset.blockIndex;
        const sectionIndex = sectionElement.dataset.sectionIndex;
        const key = `${blockIndex}-${sectionIndex}`;
        const state = meetingState[key];

        // Ensure state exists for the section
        if (!state) {
            console.warn(`State not found for section key: ${key}`);
            return;
        }

        // Use allocatedTime from the state (in seconds), which reflects user input
        const allocatedSeconds = state.allocatedTime;

        // Calculate scheduled start and end times
        state.scheduledStartTime = new Date(currentTimeCalc.getTime());
        state.scheduledEndTime = new Date(currentTimeCalc.getTime() + allocatedSeconds * 1000);

        // Update the input fields in the DOM
        const startField = sectionElement.querySelector(".start-time");
        const endField = sectionElement.querySelector(".end-time");

        if (startField) startField.value = formatHM(state.scheduledStartTime);
        if (endField) endField.value = formatHM(state.scheduledEndTime);

        // Advance the calculation time for the next section
        currentTimeCalc = new Date(state.scheduledEndTime.getTime());
    });
     console.log("Scheduled times updated based on start:", formatHM(baseStartTime));
     // Update the global clock display as total allocated time might change
     // if the meeting hasn't started yet.
     if (!meetingStart) {
        updateFloatingClock();
     }
}


// --- PDF GENERATION ---

// Asegúrate de que la librería jsPDF esté cargada antes de este script.
// Puedes incluirla mediante un tag <script> en tu HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

document.getElementById('generate-pdf').addEventListener('click', () => {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        console.error("jsPDF library is not loaded.");
        alert("Error: No se pudo cargar la librería para generar PDF.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p', // portrait
        unit: 'mm',      // millimeters
        format: 'a4'     // A4 size paper
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let y = 25; // Start position below header
    const rowHeight = 7; // Base vertical spacing for lines
    const titleFontSize = 16;
    const headerFontSize = 12;
    const textFontSize = 10;
    const smallFontSize = 9;
    const commentFontSize = 8;


    // --- FONT SETUP ---
    // jsPDF standard fonts: helvetica, times, courier (normal, bold, italic, bolditalic)
    doc.setFont("helvetica", "normal"); // Set default font


    // --- HEADER ---
    const headerColor = [180, 0, 100]; // Deep magenta/purple
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, pageWidth, 22, 'F'); // Background rectangle
    doc.setTextColor(255, 255, 255); // White text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleFontSize);

    const headerTitle = "Reporte de la Reunión Semanal"; // Ajustado
    doc.text(headerTitle, pageWidth / 2, 15, { align: "center" }); // Centered text

    y = 30; // Start content below the header

    // --- MEETING INFO ---
    doc.setTextColor(0, 0, 0); // Black text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(textFontSize);

    const presidentInput = document.getElementById("president-name");
    const presidentName = presidentInput ? presidentInput.value.trim() || "N/A" : "N/A";
    doc.text(`Presidente:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(presidentName, margin + 25, y); // Indent value slightly

    const startTimeStr = meetingStart instanceof Date && !isNaN(meetingStart) ? formatHM(meetingStart) : "No iniciada";
    doc.setFont("helvetica", "bold");
    doc.text(`Hora de inicio real:`, margin, y + rowHeight);
    doc.setFont("helvetica", "normal");
    doc.text(startTimeStr, margin + 35, y + rowHeight);

    y += rowHeight * 2.5; // Extra space after meeting info

    // --- SECTIONS REPORT ---
    const blockColors = [
        [245, 245, 245], // Light Grey (Subtle background)
        [220, 235, 250], // Light Blue
        [230, 250, 230], // Light Green
        [255, 245, 220], // Light Yellow/Orange
        [250, 230, 250], // Light Purple
        [225, 245, 245]  // Light Cyan/Teal
    ];

    let blockColorIndex = 0; // Cycle through colors for blocks

    // Get blocks and sections in DOM order
    const blockElements = document.querySelectorAll(".meeting-block");

    blockElements.forEach((blockElement) => {
         const blockTitleElement = blockElement.querySelector('h2');
         const blockTitle = blockTitleElement ? blockTitleElement.textContent.trim() : `Bloque ${blockColorIndex + 1}`;

         // Check for page break before block header
         if (y > pageHeight - margin - 20) { // Need space for header + some content
             doc.addPage();
             y = margin; // Reset y for new page
         }

         // --- BLOCK HEADER ---
         const color = blockColors[blockColorIndex % blockColors.length];
         doc.setFillColor(...color);
         doc.setDrawColor(150, 150, 150); // Grey border for block header
         doc.setLineWidth(0.2);
         doc.rect(margin, y, contentWidth, 9, 'FD'); // Filled and bordered rectangle
         doc.setTextColor(0, 0, 0); // Black text
         doc.setFont("helvetica", "bold");
         doc.setFontSize(headerFontSize);
         doc.text(blockTitle, margin + 2, y + 6.5); // Position text inside the rect

         y += 12; // Space after block header
         blockColorIndex++; // Move to next color for next block

         // --- SECTIONS WITHIN BLOCK ---
         const sectionElements = blockElement.querySelectorAll(".section");
         sectionElements.forEach(sectionElement => {
             const blockIdx = sectionElement.dataset.blockIndex;
             const sectionIdx = sectionElement.dataset.sectionIndex;
             const key = `${blockIdx}-${sectionIdx}`;
             const state = meetingState[key];

             if (!state) return; // Skip if state is missing

             // Estimate height needed for this section (title, assigned, times, potentially comments)
             let neededHeight = rowHeight * 3; // Base for title, assigned, time
             if (state.comments && state.comments.length > 0) {
                neededHeight += rowHeight; // For "Comentarios:" header
                neededHeight += state.comments.length * rowHeight * 1.2; // Approximate height per comment
             }

             // Check for page break before drawing section
             if (y + neededHeight > pageHeight - margin) {
                 doc.addPage();
                 y = margin; // Reset y
                 // Optional: Redraw block header on new page for context
                 doc.setFillColor(...color);
                 doc.setDrawColor(150, 150, 150);
                 doc.rect(margin, y, contentWidth, 9, 'FD');
                 doc.setTextColor(0, 0, 0);
                 doc.setFont("helvetica", "bold");
                 doc.setFontSize(headerFontSize);
                 doc.text(blockTitle, margin + 2, y + 6.5);
                 y += 12;
             }

             // Section Details
             const sectionTitle = state.sectionTitle || "Sin título";
             const assignedPerson = state.assignedPerson || "Sin asignar";
             const allocatedTimeStr = formatTime(state.allocatedTime);
             const elapsedTimeStr = formatTime(state.elapsedTime);
             const timeDifference = state.elapsedTime - state.allocatedTime;
             const timeDiffStr = `${timeDifference >= 0 ? '+' : '-'}${formatTime(Math.abs(timeDifference))}`;

             // Determine text color for time based on difference
             let timeColor = [0, 0, 0]; // Black default
             if (timeDifference > 0) timeColor = [192, 57, 43]; // Dark Red (Over)
             else if (state.status === 'finished') timeColor = [39, 174, 96]; // Green (Finished On/Under)

             const timeInfo = `Usado: ${elapsedTimeStr} (Asignado: ${allocatedTimeStr} | Dif: ${timeDiffStr})`;
             const timeInfoWidth = doc.getTextWidth(timeInfo);

             // Draw Title (potentially wrapped)
             doc.setTextColor(0, 0, 0); // Black for title
             doc.setFont("helvetica", "bold");
             doc.setFontSize(textFontSize);
             // Calculate available width for title (subtract time info width and some padding)
             const availableTitleWidth = contentWidth - timeInfoWidth - 5;
             const splitTitle = doc.splitTextToSize(sectionTitle, availableTitleWidth);
             doc.text(splitTitle, margin, y);

             // Draw Time Info (aligned right)
             doc.setTextColor(...timeColor); // Set color for time
             doc.setFont("helvetica", "normal"); // Normal weight for time details usually
             doc.setFontSize(smallFontSize); // Smaller font for time details
             doc.text(timeInfo, pageWidth - margin, y, { align: "right" });

             // Move y down based on the number of lines the title took
             y += splitTitle.length * (rowHeight * 0.8); // Adjust line height for title size

             // Draw Assigned Person
             doc.setTextColor(50, 50, 50); // Dark Grey for assigned person
             doc.setFont("helvetica", "italic");
             doc.setFontSize(smallFontSize);
             doc.text(`Asignado a: ${assignedPerson}`, margin, y);

             y += rowHeight * 1.5; // Space after section details before comments or next section

             // --- COMMENTS (if applicable) ---
             if (state.comments && state.comments.length > 0) {
                 // Check for page break just before starting comments list
                 if (y + (state.comments.length * rowHeight * 0.9) > pageHeight - margin) { // Estimate height
                     doc.addPage();
                     y = margin;
                      // Re-draw block/section header if needed (optional, can get complex)
                 }

                 doc.setTextColor(0, 0, 0);
                 doc.setFont("helvetica", "bold");
                 doc.setFontSize(smallFontSize);
                 doc.text("Comentarios:", margin + 2, y); // Indent comment block slightly
                 y += rowHeight * 0.8;

                 doc.setFont("helvetica", "normal");
                 doc.setFontSize(commentFontSize); // Even smaller for comments

                 state.comments.forEach((comment, commentIndex) => {
                     const timeExceededStr = comment.exceeded ? ` (+${formatTime(comment.duration - 30)})` : '';
                     const commentText = `${commentIndex + 1}. ${comment.name}: ${formatTime(comment.duration)}${timeExceededStr}`;
                     const commentColor = comment.exceeded ? [192, 57, 43] : [50, 50, 50]; // Red if exceeded, dark grey otherwise

                      // Check space before printing each comment
                     if (y > pageHeight - margin - rowHeight) {
                         doc.addPage();
                         y = margin;
                         // Optionally redraw headers if needed
                         doc.setFont("helvetica", "italic");
                         doc.setFontSize(commentFontSize);
                         doc.text("(Comentarios continuación...)", margin, y);
                         y += rowHeight;
                         doc.setFont("helvetica", "normal"); // Reset font
                         doc.setFontSize(commentFontSize);
                     }


                     doc.setTextColor(...commentColor);
                     const splitComment = doc.splitTextToSize(commentText, contentWidth - 6); // Allow wrapping
                     doc.text(splitComment, margin + 4, y); // Indent comment text
                     y += splitComment.length * (rowHeight * 0.7); // Adjust based on wrapped lines

                 });
                 doc.setTextColor(0, 0, 0); // Reset color
                 y += rowHeight * 0.5; // Extra space after comments block
             }

             y += 5; // Small gap between sections

         });
         y += 8; // Space after each block
    });

    // --- FOOTER ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(smallFontSize - 1);
        doc.setTextColor(150, 150, 150); // Light grey footer text

        const footerTextLeft = `Reporte generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        doc.text(footerTextLeft, margin, pageHeight - 10);

        const footerTextRight = `Página ${i} de ${pageCount}`;
        doc.text(footerTextRight, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    // --- SAVE ---
    doc.save(`reporte_reunion_${new Date().toISOString().slice(0,10)}.pdf`);
});


// --- EVENT LISTENERS ---

// Listener for the main start button
const mainStartButton = document.getElementById("meeting-start-button");
if (mainStartButton) {
    mainStartButton.addEventListener("click", startMeeting);
} else {
    console.error("Meeting start button not found!");
}

// Listener for president name input
const presidentNameInput = document.getElementById("president-name");
if (presidentNameInput) {
    presidentNameInput.addEventListener("input", function() {
        const presidentName = this.value.trim();
        document.querySelectorAll('.section.consejo .assigned-person').forEach(input => {
            const originalPlaceholder = "A cargo de (Presidente)"; // Store original placeholder text
             // Update value only if it was previously empty or matched the placeholder logic
            if (!input.dataset.userInput) { // Check if user hasn't typed anything specific yet
                 input.value = presidentName;
            }
            // Update placeholder based on whether there's a value
            input.placeholder = input.value.trim() === "" ? originalPlaceholder : "";

            // Update state for the relevant section
             const sectionElement = input.closest('.section');
             if (sectionElement) {
                const blockIndex = sectionElement.dataset.blockIndex;
                const sectionIndex = sectionElement.dataset.sectionIndex;
                const key = `${blockIndex}-${sectionIndex}`;
                 if (meetingState[key]) {
                    // Use the actual input value if present, otherwise the calculated president name (if input is still linked) or default placeholder
                    let assignedValue = input.value.trim();
                    if (!assignedValue && !input.dataset.userInput) {
                        assignedValue = presidentName || originalPlaceholder; // Use president name if available
                    } else if (!assignedValue && input.dataset.userInput){
                        assignedValue = originalPlaceholder; // Fallback if user cleared their own input
                    }
                    meetingState[key].assignedPerson = assignedValue;
                 }
             }
        });
    });
     // Add a flag when user types into an assigned person field linked to the president
     document.querySelectorAll('.section.consejo .assigned-person').forEach(input => {
         input.addEventListener('input', function() {
             if(this.value.trim() !== "") {
                 this.dataset.userInput = "true"; // Mark that user has provided input
             } else {
                 // If user clears the input, potentially revert to president name or placeholder
                 delete this.dataset.userInput;
                  // Trigger the president name update logic again if president name exists
                 const presidentValue = presidentNameInput ? presidentNameInput.value.trim() : "";
                 if (presidentValue){
                     this.value = presidentValue;
                     this.placeholder = "";
                 } else {
                     this.placeholder = "A cargo de (Presidente)";
                 }
                 // Update state immediately after reverting
                 const sectionElement = this.closest('.section');
                 if (sectionElement) {
                    const blockIndex = sectionElement.dataset.blockIndex;
                    const sectionIndex = sectionElement.dataset.sectionIndex;
                    const key = `${blockIndex}-${sectionIndex}`;
                     if (meetingState[key]) {
                        meetingState[key].assignedPerson = this.value.trim() || this.placeholder.trim();
                     }
                 }
             }
         });
     });

} else {
    console.warn("President name input field not found.");
}


// Listeners for individual sections
document.querySelectorAll('.section').forEach(section => {
    const blockIndex = section.dataset.blockIndex;
    const sectionIndex = section.dataset.sectionIndex;
    const key = `${blockIndex}-${sectionIndex}`;

    // Add event listeners to section control buttons
    const startBtn = section.querySelector('.start-btn');
    const pauseBtn = section.querySelector('.pause-btn');
    const resetBtn = section.querySelector('.reset-btn'); // This is Finalizar/Reiniciar

    if (startBtn) startBtn.addEventListener('click', () => startSectionTimer(key));
    if (pauseBtn) pauseBtn.addEventListener('click', () => pauseSectionTimer(key));
    // Modified event listener for the reset/restart button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const state = meetingState[key];
            if (!state) return;

            if (state.status === 'finished') {
                restartSectionTimer(key); // If finished, the button action is to restart
            } else {
                finalizeSectionTimer(key); // Otherwise (ready, running or paused), the button action is to finalize
            }
        });
    }


     // Add event listeners to comment controls if they exist
    if (section.classList.contains('with-comments')) {
         const commentStartBtn = section.querySelector('.comment-start');
         const commentEndBtn = section.querySelector('.comment-end'); // This now acts as PAUSE
         const nextCommentBtn = section.querySelector('.next-comment'); // This finalizes the current one

         if (commentStartBtn) commentStartBtn.addEventListener('click', () => startCommentTimer(key));
         if (commentEndBtn) commentEndBtn.addEventListener('click', () => pauseCommentTimer(key)); // Use pause for "Finalizar Comentario" (before next)
         if (nextCommentBtn) nextCommentBtn.addEventListener('click', () => finalizeAndResetCommentTimer(key)); // Finalize current and reset for next
    }

    // Add event listener for allocated time input
    const allocatedInput = section.querySelector('.allocated-input');
    if (allocatedInput) {
        allocatedInput.addEventListener('change', (event) => {
             // MODIFICACIÓN: Check if the input is disabled before processing
             if (event.target.disabled) {
                 console.log("Allocated time input is disabled (meeting likely started). Change ignored.");
                 // Optionally revert the value if needed, though disabled should prevent changes
                 // event.target.value = (meetingState[key] ? meetingState[key].allocatedTime / 60 : 0);
                 return;
             }

            let minutes = parseInt(event.target.value, 10);
            if (isNaN(minutes) || minutes < 0) {
                minutes = 0; // Default to 0 if input is invalid or negative
                event.target.value = 0; // Fix the input display
            }
            const allocatedSeconds = minutes * 60;
            if (meetingState[key]) {
                meetingState[key].allocatedTime = allocatedSeconds; // Update state with seconds
                // Recalculate and update scheduled times for all subsequent sections
                updateScheduledTimes();
                 // Update the timer display immediately to show difference vs new allocated time
                updateSectionDisplay(key);
            } else {
                console.warn(`State not found for key ${key} during allocated time change.`);
            }
        });
    }


    // Add event listeners to assigned person and title inputs to update state in real-time
    const assignedPersonInput = section.querySelector('.assigned-person');
    if (assignedPersonInput) {
        assignedPersonInput.addEventListener('input', (event) => {
             if (meetingState[key]) {
                 // Update state, using placeholder as fallback if input is cleared
                 meetingState[key].assignedPerson = event.target.value.trim() || event.target.placeholder.trim();
             }
        });
         // Initialize state from input values on load (already done in initializeMeetingState)
    }

    const sectionTitleInput = section.querySelector('.section-title');
    if (sectionTitleInput) {
        sectionTitleInput.addEventListener('input', (event) => {
             if (meetingState[key]) {
                 // Update state, using placeholder as fallback if input is cleared
                 meetingState[key].sectionTitle = event.target.value.trim() || event.target.placeholder.trim();
             }
        });
         // Initialize state from input values on load (already done in initializeMeetingState)
    }
});


// --- INITIALIZATION ---

// Use DOMContentLoaded to ensure the HTML is fully parsed before running scripts
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing app.");
    initializeMeetingState();
    // updateScheduledTimes() is called within initializeMeetingState now after state setup
});

// Optional: Service Worker registration (requires sw.js file and configuration)
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => { // Register after page load
//     navigator.serviceWorker.register('/sw.js')
//       .then(registration => {
//         console.log('ServiceWorker registration successful with scope: ', registration.scope);
//       })
//       .catch(error => {
//         console.log('ServiceWorker registration failed: ', error);
//       });
//   });
// }
