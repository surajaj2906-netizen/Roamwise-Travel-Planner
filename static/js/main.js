document.addEventListener('DOMContentLoaded', () => {
  const departure = document.querySelector('input[name="departure_date"]');
  const returning = document.querySelector('input[name="return_date"]');
  if (departure && returning) {
    departure.addEventListener('change', () => {
      returning.min = departure.value;
      if (returning.value && returning.value <= departure.value) returning.value = '';
    });
  }
    const themeToggle = document.querySelector('#theme-toggle');
    const savedTheme = localStorage.getItem('roamwise-theme');
    if (savedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const dark = document.documentElement.dataset.theme !== 'dark';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        localStorage.setItem('roamwise-theme', dark ? 'dark' : 'light');
      });
    }

    const mapElement = document.querySelector('#destination-map');
    if (mapElement) {
      const latitude = Number(mapElement.dataset.lat);
      const longitude = Number(mapElement.dataset.lng);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const mapsLink = document.createElement('a');
        mapsLink.className = 'map-external-link';
        mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        mapsLink.target = '_blank';
        mapsLink.rel = 'noopener';
        mapsLink.innerHTML = 'Open in Google Maps <span aria-hidden="true">↗</span>';
        mapElement.insertAdjacentElement('afterend', mapsLink);
      }
      const showMapError = () => {
        mapElement.innerHTML = '<div class="map-fallback">Map tiles are unavailable. Use the Google Maps link below.</div>';
      };
      if (!window.L || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        showMapError();
      } else {
        const position = [latitude, longitude];
        const map = L.map(mapElement).setView(position, 11);
        const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' });
        const markerIcon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41] });
        tiles.on('tileerror', showMapError);
        tiles.addTo(map);
        L.marker(position, { icon: markerIcon }).addTo(map).bindPopup(mapElement.dataset.name).openPopup();
      }
    }

    const chart = document.querySelector('#spend-chart');
    if (chart && window.Chart) {
      const values = (chart.dataset.values || '').split(',').filter(Boolean).map(Number);
      const labels = (chart.dataset.labels || '').split(',').filter(Boolean);
      new Chart(chart, { type: 'bar', data: { labels, datasets: [{ label: 'Trip cost (INR)', data: values, backgroundColor: '#127c82', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
    }

    const weather = document.querySelector('#destination-weather');
    if (weather && weather.dataset.lat) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${weather.dataset.lat}&longitude=${weather.dataset.lng}&current=temperature_2m,weather_code,wind_speed_10m`)
        .then(response => response.ok ? response.json() : Promise.reject())
        .then(data => { weather.textContent = `${Math.round(data.current.temperature_2m)}°C · wind ${Math.round(data.current.wind_speed_10m)} km/h`; })
        .catch(() => { weather.textContent = 'Weather unavailable right now'; });
    }

    const currency = document.querySelector('#currency-converter');
    if (currency) {
      currency.addEventListener('change', () => {
        const output = document.querySelector('#converted-price');
        const amount = Number(currency.dataset.inr);
        if (!output || !amount) return;
        const code = currency.value;
        fetch(`https://api.frankfurter.app/latest?from=INR&to=${code}`)
          .then(response => response.json())
          .then(data => { output.textContent = `${code} ${(amount * data.rates[code]).toFixed(2)}`; })
          .catch(() => { output.textContent = 'Conversion unavailable'; });
      });
    }

    const pulse = document.querySelector('.pulse-result');
    if (pulse) {
      const destinations = JSON.parse(pulse.dataset.destinations || '[]');
      const moodButtons = document.querySelectorAll('[data-mood]');
      const daysInput = document.querySelector('#pulse-days');
      const budgetInput = document.querySelector('#pulse-budget');
      const image = document.querySelector('#pulse-result-image');
      const name = document.querySelector('#pulse-result-name');
      const reason = document.querySelector('#pulse-result-reason');
      const cost = document.querySelector('#pulse-result-cost');
      const fit = document.querySelector('#pulse-result-fit');
      const link = document.querySelector('#pulse-result-link');
      let mood = 'Beach';

      const updatePulse = () => {
        const days = Number(daysInput.value);
        const budget = Number(budgetInput.value);
        const ranked = destinations.map(destination => {
          const moodMatch = destination.category === mood ? 52 : 0;
          const budgetMatch = destination.cost <= budget ? 30 : Math.max(0, 30 - ((destination.cost - budget) / budget) * 30);
          const popularity = destination.score / 100 * 18;
          return { destination, total: moodMatch + budgetMatch + popularity };
        }).sort((a, b) => b.total - a.total);
        const match = ranked[0]?.destination;
        if (!match) return;
        const matchPercent = Math.min(99, Math.round(ranked[0].total));
        image.style.backgroundImage = `url('${match.image}')`;
        name.textContent = match.name;
        cost.innerHTML = `₹${match.cost.toLocaleString('en-IN')}<small>/day</small>`;
        fit.textContent = `${matchPercent}% fit`;
        reason.textContent = `${days}-day ${mood.toLowerCase()} escape, estimated at ₹${(match.cost * days).toLocaleString('en-IN')} for your stay pace.`;
        link.href = match.url;
      };

      moodButtons.forEach(button => button.addEventListener('click', () => {
        mood = button.dataset.mood;
        moodButtons.forEach(option => option.classList.toggle('is-selected', option === button));
        updatePulse();
      }));
      daysInput.addEventListener('change', updatePulse);
      budgetInput.addEventListener('change', updatePulse);
      updatePulse();
    }
});
