// --- UTILITY FUNCTIONS ---

/**
 * Formats seconds into mm:ss string.
 * @param {number} totalSeconds The total number of seconds.
 * @returns {string} Formatted time string (mm:ss).
 */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
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
        const now = new Date();
        now.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
        return now;
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
 * Disables all section control buttons and allocated inputs.
 */
function disableAllSectionControls() {
  document.querySelectorAll('.section-controls button').forEach(btn => {
    btn.disabled = true;
  });
  document.querySelectorAll('.comment-controls button').forEach(btn => {
      btn.disabled = true;
  });
  // Disable allocated time inputs after meeting starts
  document.querySelectorAll('.allocated-input').forEach(input => {
      input.disabled = true;
  });
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

    const startBtn = sectionElement.querySelector('.start-btn');
    const pauseBtn = sectionElement.querySelector('.pause-btn');
    const resetBtn = sectionElement.querySelector('.reset-btn');
    const allocatedInput = sectionElement.querySelector('.allocated-input');


    startBtn.disabled = state.status !== 'ready' && state.status !== 'paused';
    pauseBtn.disabled = state.status !== 'running';
    // Reset/Finalize button is enabled unless state is 'ready' (before first start)
    resetBtn.disabled = state.status === 'ready';

    // Update the text of the reset/finalize/restart button
    if (state.status === 'finished') {
        resetBtn.textContent = 'Reiniciar';
         // Make restart button visually distinct? Optional.
         resetBtn.style.backgroundColor = '#3498db'; // Blue color for Restart
         resetBtn.style.boxShadow = '0 3px 10px rgba(52, 152, 219, 0.3)';
         resetBtn.innerHTML = '<i class="fas fa-redo"></i> Reiniciar'; // Add icon

    } else {
        resetBtn.textContent = 'Finalizar';
         // Reset to default 'Finalizar' style
         resetBtn.style.backgroundColor = ''; // Reset to CSS default
         resetBtn.style.boxShadow = ''; // Reset to CSS default
          resetBtn.innerHTML = '<i class="fas fa-check"></i> Finalizar'; // Add icon

    }


    // Disable allocated input if meeting has started
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

        commentStartBtn.disabled = commentControlsDisabled || (state.commentStatus !== 'ready' && state.commentStatus !== 'paused');
        commentEndBtn.disabled = commentControlsDisabled || state.commentStatus !== 'running';
        // Next comment is enabled if there's a running or paused comment AND the main section timer is not finished
        nextCommentBtn.disabled = commentControlsDisabled || state.commentStatus === 'ready';


         // Update comment timer color immediately based on state
        const commentTime = state.commentStatus === 'running'
            ? state.commentAccumulatedTime + Math.floor((Date.now() - state.commentStartTime) / 1000)
            : state.commentAccumulatedTime;
        commentTimerDisplay.classList.toggle('green', commentTime <= 30);
        commentTimerDisplay.classList.toggle('red', commentTime > 30);
    }
}

/**
 * Enables all section controls (usually after meeting starts).
 * Allocated inputs are disabled in this case.
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
            : parseInt(section.dataset.allocated, 10) || 0; // Fallback to data-allocated


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
            comments: [] // Array of { name: string, duration: number, exceeded: boolean }
        };

        // Update display initially
        updateSectionDisplay(key);
    });
    console.log("Meeting state initialized:", meetingState);
    disableAllSectionControls(); // Controls and allocated inputs are disabled until meeting starts
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
    if (!sectionElement) return;

    const timerDisplay = sectionElement.querySelector('.timer-display');
    // If status is finished, display the final elapsed time
    const elapsedTime = state.status === 'finished'
        ? state.elapsedTime
        : state.status === 'running'
            ? state.elapsedTime + Math.floor((Date.now() - state.startTime) / 1000)
            : state.elapsedTime;

    const diff = elapsedTime - state.allocatedTime;
    const sign = diff < 0 ? "-" : (diff > 0 ? "+" : "");
    timerDisplay.innerHTML = `<span class="time-main">${formatTime(elapsedTime)}</span> <span class="time-diff">(${sign}${formatTime(Math.abs(diff))})</span>`;

    timerDisplay.classList.toggle('green', diff <= 0);
    timerDisplay.classList.toggle('red', diff > 0);

    // Update button states
    enableSectionControls(sectionElement);
}

/**
 * Updates the comment timer display for a specific section.
 * @param {string} key The state key for the section ('blockIndex-sectionIndex').
 */
function updateCommentDisplay(key) {
     const state = meetingState[key];
     const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
     if (!sectionElement || !sectionElement.classList.contains('with-comments')) return;

     const commentTimerDisplay = sectionElement.querySelector('.comment-timer');
     const currentCommentTime = state.commentStatus === 'running'
         ? state.commentAccumulatedTime + Math.floor((Date.now() - state.commentStartTime) / 1000)
         : state.commentAccumulatedTime;

     commentTimerDisplay.textContent = formatTime(currentCommentTime);
     commentTimerDisplay.classList.toggle('green', currentCommentTime <= 30);
     commentTimerDisplay.classList.toggle('red', currentCommentTime > 30);

     // Update comment button states
     enableSectionControls(sectionElement); // Re-enable/disable based on current state
}


// --- TIMER CONTROLS ---

/**
 * Starts or resumes the timer for a specific section.
 * @param {string} key The state key for the section.
 */
function startSectionTimer(key) {
    const state = meetingState[key];
    if (state.status === 'running' || state.status === 'finished') return;

    // Ensure meeting has started before starting individual timers
     if (!meetingStart) {
         console.warn("Meeting has not started yet. Cannot start individual section timer.");
         // Optional: Show a user message
         return;
     }

    state.status = 'running';
    state.startTime = Date.now();
    // Clear any existing interval before setting a new one
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => updateSectionDisplay(key), 250); // Update more frequently for smoother timer

    updateSectionDisplay(key); // Initial display update
    console.log(`Timer started for ${key}`);
}

/**
 * Pauses the timer for a specific section.
 * @param {string} key The state key for the section.
 */
function pauseSectionTimer(key) {
    const state = meetingState[key];
    if (state.status !== 'running') return;

    state.status = 'paused';
    state.elapsedTime += Math.floor((Date.now() - state.startTime) / 1000);
    state.startTime = null;
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;

    updateSectionDisplay(key); // Final update after pausing
    console.log(`Timer paused for ${key}. Elapsed: ${formatTime(state.elapsedTime)}`);
}

/**
 * Finalizes the timer for a specific section.
 * @param {string} key The state key for the section.
 */
function finalizeSectionTimer(key) {
    const state = meetingState[key];
    // Allow finalizing from 'running' or 'paused' states
    if (state.status !== 'running' && state.status !== 'paused') return;

    // Pause if running
    if (state.status === 'running') {
        state.elapsedTime += Math.floor((Date.now() - state.startTime) / 1000);
    }
    state.status = 'finished';
    state.startTime = null; // Ensure startTime is null
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;

    // Pause and finalize any running comment timer in this section
    if (state.commentStatus === 'running') {
         state.commentAccumulatedTime += Math.floor((Date.now() - state.commentStartTime) / 1000);
         state.commentStartTime = null;
         if (state.commentInterval) clearInterval(state.commentInterval);
         state.commentInterval = null;
         state.commentStatus = 'paused'; // Comments don't have a 'finished' state in this logic, just stop timing
         updateCommentDisplay(key);
    }

    updateSectionDisplay(key); // Final display update
    console.log(`Timer finalized for ${key}. Final Elapsed: ${formatTime(state.elapsedTime)}`);

    // Optional: Automatically start the next section's timer
    // findAndStartNextSection(key);
}

/**
 * Restarts the timer for a specific section that was previously finalized.
 * @param {string} key The state key for the section.
 */
function restartSectionTimer(key) {
    const state = meetingState[key];
    if (state.status !== 'finished') return; // Only restart if it's in 'finished' state

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
         // Optionally clear comments list in DOM and state if restarting means a clean slate
         // state.comments = [];
         // const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
         // if(sectionElement) sectionElement.querySelector('.comment-list').innerHTML = '';
         // if(sectionElement) sectionElement.querySelector('.comment-count').textContent = '0';
         updateCommentDisplay(key); // Update comment timer display (should show 00:00)
    }

    updateSectionDisplay(key); // Update main section display (should show 00:00)
    // Re-enable buttons based on the new 'ready' state
    const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
     if(sectionElement) enableSectionControls(sectionElement);

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
    if (!state || !state.comments || state.commentStatus === 'running' || state.status === 'finished') return; // Prevent starting if main section is finished

     // Ensure section timer is running or paused before starting comment timer?
     // Let's assume comment timer can run independently once the section is active (not finished).
     if (state.status === 'ready') {
         console.warn("Main section timer is not active. Cannot start comment timer.");
         return;
     }


    state.commentStatus = 'running';
    state.commentStartTime = Date.now();
    if (state.commentInterval) clearInterval(state.commentInterval); // Clear previous interval
    state.commentInterval = setInterval(() => updateCommentDisplay(key), 250);

    updateCommentDisplay(key);
    console.log(`Comment timer started for ${key}`);
}

/**
 * Pauses the comment timer for a section.
 * @param {string} key The state key for the section.
 */
function pauseCommentTimer(key) {
    const state = meetingState[key];
    if (!state || !state.comments || state.commentStatus !== 'running') return;

    state.commentStatus = 'paused';
    state.commentAccumulatedTime += Math.floor((Date.now() - state.commentStartTime) / 1000);
    state.commentStartTime = null;
    if (state.commentInterval) clearInterval(state.commentInterval);
    state.commentInterval = null;

    updateCommentDisplay(key);
    console.log(`Comment timer paused for ${key}. Accumulated: ${formatTime(state.commentAccumulatedTime)}`);
}

/**
 * Finalizes the current comment, adds it to the list, and resets the timer for the next comment.
 * @param {string} key The state key for the section.
 */
function finalizeAndResetCommentTimer(key) {
     const state = meetingState[key];
     const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);
     if (!state || !state.comments || !sectionElement || state.status === 'finished') return; // Prevent adding comments if main section is finished

     // Pause if running
     if (state.commentStatus === 'running') {
         state.commentAccumulatedTime += Math.floor((Date.now() - state.commentStartTime) / 1000);
         state.commentStartTime = null;
         if (state.commentInterval) clearInterval(state.commentInterval);
         state.commentInterval = null;
     } else if (state.commentStatus === 'ready') {
          // If the timer is already ready (wasn't started), just add a blank comment
          state.commentAccumulatedTime = 0;
     }


     const commentNameInput = sectionElement.querySelector('.comment-name');
     const commentList = sectionElement.querySelector('.comment-list');
     const commentCountSpan = sectionElement.querySelector('.comment-count');

     const name = commentNameInput.value.trim() || "Sin nombre";
     const duration = state.commentAccumulatedTime;
     const exceeded = duration > 30; // Assuming 30 seconds limit for comments

     const comment = { name, duration, exceeded };
     state.comments.push(comment);

     // Update the comment list in the DOM
     const li = document.createElement('li');
     li.textContent = `${state.comments.length}. ${name}: ${formatTime(duration)}${comment.exceeded ? ` (+${formatTime(duration - 30)})` : ''}`;
     li.style.color = exceeded ? '#c0392b' : '#2c3e50'; // Red if exceeded, normal otherwise
     commentList.appendChild(li);

     // Update comment count display
     commentCountSpan.textContent = state.comments.length;

     // Reset comment timer state
     state.commentAccumulatedTime = 0;
     state.commentStatus = 'ready'; // Ready for the next comment

     // Reset comment input and display
     commentNameInput.value = "";
     updateCommentDisplay(key); // Should reset the comment timer display

     console.log(`Comment finalized for ${key}:`, comment);
}


// --- MEETING CONTROLS ---

/**
 * Starts the global meeting timer, enables section controls, and disables allocated time inputs.
 */
function startMeeting() {
  if (meetingStart) return; // Prevent starting if already started

  meetingStart = new Date();
  console.log("Meeting started at:", meetingStart.toLocaleTimeString());

  // Enable controls for all sections (allocated inputs will be disabled by enableSectionControls)
  enableAllSectionControls();

  // Recalculate and display scheduled times based on the actual start time
  updateScheduledTimes();

  // Start the global floating clock
  globalTimerInterval = setInterval(updateFloatingClock, 1000);
  updateFloatingClock(); // Initial call to show time immediately

  // Disable the main start button
  document.getElementById("meeting-start-button").disabled = true;

   // Save initial allocated times to state before disabling inputs if needed (already done in initialize)
   // Now disable inputs as meeting started
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

  // Calculate total allocated time dynamically
   let currentTotalAllocated = 0;
   for (const key in meetingState) {
       if (meetingState.hasOwnProperty(key)) {
           currentTotalAllocated += meetingState[key].allocatedTime;
       }
   }

  if (!meetingStart) {
    clock.textContent = formatTime(currentTotalAllocated); // Show sum of allocated time before start
    clockContainer.style.backgroundColor = "gray";
    return;
  }

  const now = new Date();
  const elapsed = Math.floor((now - meetingStart) / 1000);
  const remaining = currentTotalAllocated - elapsed; // Use dynamic total

  clock.textContent = formatTime(Math.max(0, remaining)); // Don't show negative time

  if (remaining > 300) { // More than 5 minutes left
      clockContainer.style.backgroundColor = "rgba(39, 174, 96, 0.95)"; // Green
  } else if (remaining > 60) { // More than 1 minute left
      clockContainer.style.backgroundColor = "rgba(241, 196, 15, 0.95)"; // Yellow
  } else if (remaining > 0) { // Less than 1 minute left
       clockContainer.style.backgroundColor = "rgba(230, 126, 34, 0.95)"; // Orange
  }
  else { // Time is up or exceeded
    clockContainer.style.backgroundColor = "rgba(192, 57, 43, 0.95)"; // Red
  }
}

/**
 * Calculates and updates the scheduled start and end times for each section
 * based on the meeting start time and allocated times stored in meetingState.
 */
function updateScheduledTimes() {
    // Use a dummy start time (like now) if the meeting hasn't officially started,
    // so users see projected times based on current allocated durations.
    const baseStartTime = meetingStart || new Date();

    let currentTimeCalc = new Date(baseStartTime.getTime());

     // Get all section keys in the order they appear in the DOM
    const sectionKeysInOrder = Array.from(document.querySelectorAll(".section")).map(sectionElement => {
        return `${sectionElement.dataset.blockIndex}-${sectionElement.dataset.sectionIndex}`;
    });


    sectionKeysInOrder.forEach(key => {
        const state = meetingState[key];
        const sectionElement = document.querySelector(`.section[data-block-index="${state.blockIndex}"][data-section-index="${state.sectionIndex}"]`);

        if (!state || !sectionElement) return; // Should not happen if state is initialized correctly

        const allocated = state.allocatedTime; // Use allocated time from state (user editable)

        state.scheduledStartTime = new Date(currentTimeCalc.getTime()); // Scheduled start is current calculated time
        state.scheduledEndTime = new Date(currentTimeCalc.getTime() + allocated * 1000); // Scheduled end

        const startField = sectionElement.querySelector(".start-time");
        const endField = sectionElement.querySelector(".end-time");

        if (startField) startField.value = formatHM(state.scheduledStartTime);
        if (endField) endField.value = formatHM(state.scheduledEndTime);

        // Move the calculated time forward by the allocated time of this section
        currentTimeCalc = new Date(state.scheduledEndTime.getTime());
    });
     console.log("Scheduled times updated.");
     updateFloatingClock(); // Update global clock display as total allocated time might change
}


// --- PDF GENERATION ---

document.getElementById('generate-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ putOnlyUsedFonts: true, orientation: 'p' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 25;
    const rowHeight = 8; // Base vertical spacing

    // Set default font for the document
    doc.setFont("helvetica");


    // --- HEADER ---
    const headerColor = [180, 0, 100]; // A deep magenta/purple
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, pageWidth, 25, 'F'); // Background rectangle
    doc.setTextColor(255, 255, 255); // White text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18); // Slightly smaller header title

    const headerTitle = "Reporte de la Reunión de la Semana";
    doc.text(headerTitle, pageWidth / 2, 16, { align: "center" });

    // Draw a line below the header
     doc.setDrawColor(255, 255, 255); // White line color
     doc.setLineWidth(0.5);
     doc.line(margin, 22, pageWidth - margin, 22);


    y = 35; // Start content below the header

    // --- MEETING INFO ---
    doc.setTextColor(0, 0, 0); // Black text
    doc.setFont("helvetica", "normal"); // Normal font for info
    doc.setFontSize(10); // Smaller font for details

    const presidentName = document.getElementById("president-name").value.trim() || "N/A";
    doc.text(`Presidente: ${presidentName}`, margin, y);
    y += rowHeight;

    const startTimeStr = meetingStart ? formatHM(meetingStart) : "No iniciada";
    doc.text(`Hora de inicio real: ${startTimeStr}`, margin, y);
    y += rowHeight * 2; // Extra space after meeting info

    // --- SECTIONS REPORT ---
    doc.setFontSize(10); // Font size for section details

    const blockColors = [
        [255, 230, 230], // Light Red
        [230, 255, 230], // Light Green
        [230, 230, 255], // Light Blue
        [255, 255, 230], // Light Yellow
        [230, 255, 255], // Light Cyan
        [255, 230, 255], // Light Magenta
        [255, 240, 215], // Light Orange
        [240, 225, 255]  // Light Purple
    ];

    // Iterate through the meeting blocks as structured in HTML
    document.querySelectorAll(".meeting-block").forEach((blockElement, blockIndex) => {
         const blockTitle = blockElement.querySelector('h2').textContent.trim();

         // Add page break if not enough space for block header + at least one section
         if (y > pageHeight - margin - 30) {
             doc.addPage();
             y = margin;
         }

         // --- BLOCK HEADER ---
         const color = blockColors[blockIndex % blockColors.length];
         doc.setFillColor(...color);
         doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F'); // Background rectangle for block title
         doc.setTextColor(0, 0, 0); // Black text for block title
         doc.setFont("helvetica", "bold");
         doc.setFontSize(12); // Font size for block titles

         doc.text(blockTitle, margin + 2, y + 7); // Block title text
         y += 14; // Space after block header

         // --- SECTIONS WITHIN BLOCK ---
         doc.setFont("helvetica", "normal"); // Reset font for section details
         doc.setFontSize(10); // Font size for section details

         blockElement.querySelectorAll(".section").forEach(sectionElement => {
             const blockIdx = sectionElement.dataset.blockIndex;
             const sectionIdx = sectionElement.dataset.sectionIndex;
             const key = `${blockIdx}-${sectionIdx}`;
             const state = meetingState[key];

             if (!state) return; // Skip if state is missing (shouldn't happen if initialized)

             // Add page break if not enough space for this section
             if (y > pageHeight - margin - 25) { // Check space needed for section + potential comments
                 doc.addPage();
                 y = margin;
                 // Redraw block header on new page for context
                 doc.setFillColor(...color);
                 doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
                 doc.setTextColor(0, 0, 0);
                 doc.setFont("helvetica", "bold");
                 doc.setFontSize(12);
                 doc.text(blockTitle, margin + 2, y + 7);
                 y += 14;
                 doc.setFont("helvetica", "normal");
                 doc.setFontSize(10);
             }

             // Section Details
             let sectionTitle = state.sectionTitle || "Sin título";
             let assignedPerson = state.assignedPerson || "Sin asignar";
             // Use allocatedTime from state (which comes from the input)
             const allocatedTime = formatTime(state.allocatedTime);
             const elapsedTime = formatTime(state.elapsedTime);
             const timeDifference = state.elapsedTime - state.allocatedTime;

             // Determine text color based on time difference
             let timeColor = [0, 0, 0]; // Black by default
             if (timeDifference > 0) { // Over time
                 timeColor = [192, 57, 43]; // Dark Red
             } else if (timeDifference <= 0) { // On time or under
                 timeColor = [39, 174, 96]; // Green
             }
             doc.setTextColor(...timeColor);
             doc.setFont("helvetica", "bold"); // Make time bold

             const timeInfo = `Usado: ${elapsedTime} (Asignado: ${allocatedTime} | Dif: ${timeDifference >= 0 ? '+' : '-'}${formatTime(Math.abs(timeDifference))})`;
             doc.text(timeInfo, pageWidth - margin, y, { align: "right" });

             doc.setTextColor(0, 0, 0); // Reset color for title and assigned
             doc.setFont("helvetica", "bold"); // Make title bold
             const splitTitle = doc.splitTextToSize(sectionTitle, pageWidth - 2 * margin - doc.getTextWidth(timeInfo) - 5); // Limit title width
             doc.text(splitTitle, margin + 2, y);
             y += splitTitle.length * rowHeight; // Move y down based on wrapped title lines

             doc.setFont("helvetica", "normal"); // Normal font for assigned person
             doc.text(`Asignado a: ${assignedPerson}`, margin + 2, y);
             y += rowHeight + 2; // Space after section details


             // --- COMMENTS (if applicable) ---
             if (state.comments && state.comments.length > 0) {
                  if (y > pageHeight - margin - (state.comments.length * rowHeight * 1.5) - 10) { // Check space for comments
                      doc.addPage();
                      y = margin;
                      // Redraw block header and section details on new page for context if needed
                      doc.setFillColor(...color);
                      doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
                      doc.setTextColor(0, 0, 0);
                      doc.setFont("helvetica", "bold");
                      doc.setFontSize(12);
                      doc.text(blockTitle, margin + 2, y + 7);
                      y += 14;
                      doc.setFont("helvetica", "normal");
                      doc.setFontSize(10);
                      // Redraw section details on new page for context
                      doc.setTextColor(...timeColor);
                      doc.setFont("helvetica", "bold");
                      doc.text(timeInfo, pageWidth - margin, y, { align: "right" });
                      doc.setTextColor(0, 0, 0);
                      doc.setFont("helvetica", "bold");
                      doc.text(doc.splitTextToSize(sectionTitle, pageWidth - 2 * margin - doc.getTextWidth(timeInfo) - 5), margin + 2, y);
                       y += splitTitle.length * rowHeight;
                       doc.setFont("helvetica", "normal");
                       doc.text(`Asignado a: ${assignedPerson}`, margin + 2, y);
                       y += rowHeight + 2;
                       doc.setFont("helvetica", "bold");
                       doc.setFontSize(9);
                       doc.text("Comentarios (cont.):", margin + 4, y);
                       y += rowHeight;
                       doc.setFont("helvetica", "normal");
                       doc.setFontSize(9);
                   }

                 doc.setFont("helvetica", "bold");
                 doc.setFontSize(9); // Smaller font for comment header
                 doc.text("Comentarios:", margin + 4, y);
                 y += rowHeight;

                 doc.setFont("helvetica", "normal");
                 doc.setFontSize(9); // Font size for comments

                 state.comments.forEach((comment, commentIndex) => {
                     const commentText = `${commentIndex + 1}. ${comment.name}: ${formatTime(comment.duration)}${comment.exceeded ? ` (+${formatTime(comment.duration - 30)})` : ''}`;
                     const commentColor = comment.exceeded ? [192, 57, 43] : [0, 0, 0]; // Red if exceeded, Black otherwise
                     doc.setTextColor(...commentColor);

                     const splitComment = doc.splitTextToSize(commentText, pageWidth - 2 * margin - 8); // Indent comments
                     doc.text(splitComment, margin + 6, y);
                     y += splitComment.length * rowHeight * 1.2; // Slightly more space for comments

                     if (y > pageHeight - margin) { // Check space after each comment
                         doc.addPage();
                         y = margin;
                         // Redraw relevant headers/details if a page break happens mid-comments block
                         doc.setFillColor(...color);
                         doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
                         doc.setTextColor(0, 0, 0);
                         doc.setFont("helvetica", "bold");
                         doc.setFontSize(12);
                         doc.text(blockTitle, margin + 2, y + 7);
                         y += 14;
                         doc.setFont("helvetica", "normal");
                         doc.setFontSize(10);
                         doc.setTextColor(...timeColor);
                         doc.setFont("helvetica", "bold");
                         doc.text(timeInfo, pageWidth - margin, y, { align: "right" });
                         doc.setTextColor(0, 0, 0);
                         doc.setFont("helvetica", "bold");
                         doc.text(doc.splitTextToSize(sectionTitle, pageWidth - 2 * margin - doc.getTextWidth(timeInfo) - 5), margin + 2, y);
                         y += splitTitle.length * rowHeight;
                         doc.setFont("helvetica", "normal");
                         doc.text(`Asignado a: ${assignedPerson}`, margin + 2, y);
                         y += rowHeight + 2;
                         doc.setFont("helvetica", "bold");
                         doc.setFontSize(9);
                         doc.text("Comentarios (cont.):", margin + 4, y);
                         y += rowHeight;
                         doc.setFont("helvetica", "normal");
                         doc.setFontSize(9);
                     }
                 });
                 doc.setTextColor(0, 0, 0); // Reset color
                 y += rowHeight; // Extra space after comments block
             }

             y += 5; // Small space after each section details or comments

         });
         y += 10; // Space after each block
    });

    // --- FOOTER ---
    if (y > pageHeight - margin - 30) { doc.addPage(); y = margin; } // New page if footer doesn't fit

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Reporte generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, pageHeight - 10);
    doc.text(`Presidente: ${presidentName}`, pageWidth - margin, pageHeight - 10, { align: "right" });


    doc.save("reporte_reunion.pdf");
});


// --- EVENT LISTENERS ---

document.getElementById("meeting-start-button").addEventListener("click", startMeeting);

document.getElementById("president-name").addEventListener("input", function() {
    // Optional: Update assigned person fields for "Consejo" sections
    const presidentName = this.value.trim();
    document.querySelectorAll('.section.consejo .assigned-person').forEach(input => {
        // Only update if the input is empty and it has the specific placeholder
        if (!input.value.trim() && input.placeholder === "A cargo de (Presidente)") {
             input.value = presidentName;
        }
        // Always ensure the placeholder is correct if the input becomes empty later
        if (input.value.trim() === "") {
             input.placeholder = "A cargo de (Presidente)";
        } else {
             input.placeholder = ""; // Clear placeholder if something is typed
        }
         // Update state for the president section's assigned person
         const sectionElement = input.closest('.section');
          if (sectionElement) {
            const blockIndex = sectionElement.dataset.blockIndex;
            const sectionIndex = sectionElement.dataset.sectionIndex;
            const key = `${blockIndex}-${sectionIndex}`;
             if (meetingState[key]) {
                 meetingState[key].assignedPerson = input.value.trim() || input.placeholder.trim();
             }
          }
    });
});


document.querySelectorAll('.section').forEach(section => {
    const blockIndex = section.dataset.blockIndex;
    const sectionIndex = section.dataset.sectionIndex;
    const key = `${blockIndex}-${sectionIndex}`;

    // Add event listeners to section control buttons
    const startBtn = section.querySelector('.start-btn');
    const pauseBtn = section.querySelector('.pause-btn');
    const resetBtn = section.querySelector('.reset-btn');

    if (startBtn) startBtn.addEventListener('click', () => startSectionTimer(key));
    if (pauseBtn) pauseBtn.addEventListener('click', () => pauseSectionTimer(key));
    // Modified event listener for the reset/restart button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const state = meetingState[key];
            if (!state) return;

            if (state.status === 'finished') {
                restartSectionTimer(key); // If finished, restart
            } else {
                finalizeSectionTimer(key); // Otherwise (running or paused), finalize
            }
        });
    }


     // Add event listeners to comment controls if they exist
    if (section.classList.contains('with-comments')) {
         const commentStartBtn = section.querySelector('.comment-start');
         const commentEndBtn = section.querySelector('.comment-end');
         const nextCommentBtn = section.querySelector('.next-comment');

         if (commentStartBtn) commentStartBtn.addEventListener('click', () => startCommentTimer(key));
         if (commentEndBtn) commentEndBtn.addEventListener('click', () => pauseCommentTimer(key)); // Pause when 'Finalizar Comentario' is clicked (pre-Next)
         if (nextCommentBtn) nextCommentBtn.addEventListener('click', () => finalizeAndResetCommentTimer(key)); // Finalize and move to next
    }

    // Add event listener for allocated time input
    const allocatedInput = section.querySelector('.allocated-input');
    if (allocatedInput) {
        allocatedInput.addEventListener('change', (event) => {
            let minutes = parseInt(event.target.value, 10);
            if (isNaN(minutes) || minutes < 0) {
                minutes = 0; // Default to 0 if input is invalid
                event.target.value = 0; // Fix the input display
            }
            const allocatedSeconds = minutes * 60;
            if (meetingState[key]) {
                meetingState[key].allocatedTime = allocatedSeconds; // Update state with seconds
                // Recalculate and update scheduled times for all sections after this one
                updateScheduledTimes();
                 // Update the timer display immediately to show difference vs new allocated time
                updateSectionDisplay(key);
            }
        });
    }


    // Add event listeners to assigned person and title inputs to update state
    const assignedPersonInput = section.querySelector('.assigned-person');
    if (assignedPersonInput) {
        assignedPersonInput.addEventListener('input', (event) => {
             if (meetingState[key]) {
                 meetingState[key].assignedPerson = event.target.value.trim() || event.target.placeholder.trim();
             }
        });
         // Initialize state from input values on load
         if (meetingState[key]) {
              meetingState[key].assignedPerson = assignedPersonInput.value.trim() || assignedPersonInput.placeholder.trim();
         }
    }

    const sectionTitleInput = section.querySelector('.section-title');
    if (sectionTitleInput) {
        sectionTitleInput.addEventListener('input', (event) => {
             if (meetingState[key]) {
                 meetingState[key].sectionTitle = event.target.value.trim() || event.target.placeholder.trim();
             }
        });
         // Initialize state from input values on load
         if (meetingState[key]) {
             meetingState[key].sectionTitle = sectionTitleInput.value.trim() || sectionTitleInput.placeholder.trim();
         }
    }
});


// --- INITIALIZATION ---

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing app.");
    initializeMeetingState();
    updateScheduledTimes(); // Calculate initial scheduled times on load based on initial input values
});

// Optional: Service Worker registration (requires sw.js file)
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js')
//     .then(() => console.log("Service Worker registered"))
//     .catch(err => console.log("Error in Service Worker:", err));
// }
