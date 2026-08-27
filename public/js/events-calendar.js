(() => {
  const EPOCH = new Date('Jun 11 2019 17:55:00 GMT').getTime();
  const DAY_MS = 20 * 60 * 1000;
  const DAYS_PER_MONTH = 31;
  const MONTHS_PER_YEAR = 12;
  const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
  const YEAR_MS = DAYS_PER_YEAR * DAY_MS;
  const MONTHS = ['Early Spring', 'Spring', 'Late Spring', 'Early Summer', 'Summer', 'Late Summer', 'Early Autumn', 'Autumn', 'Late Autumn', 'Early Winter', 'Winter', 'Late Winter'];
  const FIXED_EVENTS = [
    { name: 'Spooky Festival', starts: [[8, 29]], ends: [[8, 31]], icon: '☾', detail: 'Autumn 29th–31st.' },
    { name: 'Traveling Zoo', starts: [[4, 1], [10, 1]], ends: [[4, 3], [10, 3]], icon: '♞', detail: 'Early Summer and Early Winter, 1st–3rd.' },
    { name: "Jerry's Workshop", starts: [[12, 1]], ends: [[12, 31]], icon: '❄', detail: 'Open throughout Late Winter.' },
    { name: 'Season of Jerry', starts: [[12, 24]], ends: [[12, 26]], icon: '☃', detail: 'Late Winter, 24th–26th.' },
    { name: 'New Year Celebration', starts: [[12, 29]], ends: [[12, 31]], icon: '✦', detail: 'Late Winter, 29th–31st.' },
    { name: 'Election Over', starts: [[3, 27]], ends: [[3, 27]], icon: '♛', detail: 'Late Spring 27th.' },
    { name: 'Fishing Festival', starts: [[1, 1]], ends: [[12, 3]], anyMonth: true, mayor: 'Marina', perk: 'Fishing Festival', icon: '♒', detail: 'Only scheduled by Marina’s Fishing Festival perk.' },
    { name: 'Mining Fiesta', starts: [[4, 1], [7, 1]], ends: [[4, 16], [7, 16]], mayor: 'Cole', perk: 'Mining Fiesta', icon: '⛏', detail: 'Only scheduled by Cole’s Mining Fiesta perk.' }
  ];

  const skyDate = timestamp => {
    const elapsed = Math.max(0, timestamp - EPOCH);
    const absoluteDay = Math.floor(elapsed / DAY_MS);
    const year = Math.floor(absoluteDay / DAYS_PER_YEAR) + 1;
    const yearDay = absoluteDay % DAYS_PER_YEAR;
    const month = Math.floor(yearDay / DAYS_PER_MONTH) + 1;
    const day = yearDay % DAYS_PER_MONTH + 1;
    const dayFraction = elapsed % DAY_MS / DAY_MS;
    return { year, month, day, absoluteDay: absoluteDay + 1, hour: Math.floor(dayFraction * 24), minute: Math.floor(dayFraction * 24 * 60) % 60 };
  };

  const mayorAllows = event => {
    if (!event.mayor) return true;
    const mayor = currentProfile?.mayor?.mayor || {};
    return mayor.name === event.mayor && (mayor.perks || []).some(perk => perk.name === event.perk);
  };

  const fixedWindow = (event, year, month, index) => {
    const [startMonth, startDay] = event.starts[index];
    const [endMonth, endDay] = event.ends[index];
    const actualStartMonth = event.anyMonth ? month : startMonth;
    const actualEndMonth = event.anyMonth ? month : endMonth;
    const startDayIndex = (year - 1) * DAYS_PER_YEAR + (actualStartMonth - 1) * DAYS_PER_MONTH + startDay - 1;
    const endDayIndex = (year - 1) * DAYS_PER_YEAR + (actualEndMonth - 1) * DAYS_PER_MONTH + endDay;
    return { start: EPOCH + startDayIndex * DAY_MS, end: EPOCH + endDayIndex * DAY_MS };
  };

  const occurrences = now => {
    const date = skyDate(now), rows = [];
    for (const event of FIXED_EVENTS) {
      if (!mayorAllows(event)) continue;
      const count = event.anyMonth ? event.starts.length : event.starts.length;
      for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
        const eventYear = date.year + yearOffset;
        if (event.anyMonth) {
          for (let monthOffset = yearOffset ? 1 : 0; monthOffset <= MONTHS_PER_YEAR; monthOffset++) {
            const eventMonth = yearOffset ? monthOffset : ((date.month - 1 + monthOffset) % MONTHS_PER_YEAR) + 1;
            const adjustedYear = eventYear + (!yearOffset && eventMonth < date.month ? 1 : 0);
            for (let i = 0; i < count; i++) rows.push({ ...event, ...fixedWindow(event, adjustedYear, eventMonth, i) });
          }
        } else {
          for (let i = 0; i < count; i++) rows.push({ ...event, ...fixedWindow(event, eventYear, event.starts[i][0], i) });
        }
      }
    }
    const nextModulo = (remainder, name, icon, detail) => {
      let dayIndex = date.absoluteDay - 1;
      while ((dayIndex + 1) % 3 !== remainder) dayIndex++;
      const start = EPOCH + dayIndex * DAY_MS;
      rows.push({ name, icon, detail, start, end: start + DAY_MS });
    };
    nextModulo(0, 'Dark Auction', '♜', 'Occurs every third SkyBlock day.');
    nextModulo(1, "Jacob's Event", '♨', 'Occurs every third SkyBlock day.');
    return rows.filter(row => row.end > now).map(row => ({ ...row, active: row.start <= now && now < row.end, target: row.start <= now ? row.end : row.start })).sort((a, b) => a.target - b.target || a.name.localeCompare(b.name));
  };

  window.renderEvents = function renderEventsCalendar() {
    const draw = () => {
      const now = Date.now(), date = skyDate(now), rows = occurrences(now).slice(0, 10), next = rows[0];
      $('#moduleTitle').textContent = 'Event Timeline';
      $('#moduleContent').innerHTML = `<div class="calendar-hero"><div><small>SKYBLOCK CALENDAR</small><strong>Year ${date.year} · ${MONTHS[date.month - 1]} ${date.day}</strong><span>${String(date.hour).padStart(2, '0')}:${String(date.minute).padStart(2, '0')} in-game</span></div><div><small>${next.active ? 'ACTIVE EVENT' : 'NEXT EVENT'}</small><strong>${escapeHtml(next.name)}</strong><span>${next.active ? 'Ends in ' : 'Starts in '}${durationText((next.target - now) / 1000)}</span></div></div><div class="event-timeline">${rows.map((event, index) => `<article class="event-card ${index === 0 ? 'next' : ''}"><span class="event-icon">${event.icon}</span><div><small>${event.active ? 'ACTIVE · ENDS IN ' : 'IN '}${durationText((event.target - now) / 1000)}</small><h3>${escapeHtml(event.name)}</h3><p>${escapeHtml(event.detail)}</p></div></article>`).join('')}</div><p class="module-note event-note">Calculated from the SkyBlock epoch and calendar rules used by the referenced Skyblock Calendar. Mayor events appear only when the active mayor has the matching perk.</p>`;
    };
    clearInterval(eventTimer);
    draw();
    eventTimer = setInterval(draw, 1000);
  };
})();
