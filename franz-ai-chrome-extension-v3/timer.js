function franzAiTimer() {
  const timer = createAndDisplayTimer();
  const startTime = Date.now();
  const timerInterval = setInterval(() => {
    updateTimer(timer, startTime, (timeLeft) => {
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        setTimerText(timer, 'Franz AI still working.');
      }
    });
  }, 10);

  function createAndDisplayTimer() {
    const timer = document.createElement("div");
    timer.id = "franz-ai-timer";
    timer.style.position = "fixed";
    timer.style.zIndex = "2147483647";
    timer.style.top = "10px";
    timer.style.left = "50%";
    timer.style.transform = "translateX(-50%)";
    timer.style.fontSize = "24px";
    timer.style.fontFamily = "monospace";
    timer.style.color = "black";
    timer.style.backgroundColor = "white";
    timer.style.padding = "10px";
    timer.style.borderRadius = "4px";
    timer.style.border = "2px solid black";
    timer.style.boxShadow = "0px 3px 6px rgba(0, 0, 0, 0.1)";
    timer.style.fontWeight = "bold";
    timer.textContent = "Franz AI working: 60000";
    document.body.appendChild(timer);
    return timer;
  }

  function updateTimer(timer, startTime, onTimeLeftUpdate) {
    const timeLeft = Math.max(0, 60 * 1000 - (Date.now() - startTime));
    setTimerText(timer, `Franz AI working: ${Math.floor(timeLeft)}`); // Removed decimal places
    if (onTimeLeftUpdate) onTimeLeftUpdate(timeLeft);
  }

  function setTimerText(timer, text) {
    if (timer) {
      timer.textContent = text;
    }
  }
}

franzAiTimer();
