(() => {
  const actualizarFechaHora = () => {
    const ahora = new Date();
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');
    if (fecha) {
      fecha.textContent = new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'full'
      }).format(ahora);
    }
    if (hora) {
      hora.textContent = new Intl.DateTimeFormat('es-MX', {
        timeStyle: 'medium'
      }).format(ahora);
    }
  };
  actualizarFechaHora();
  setInterval(actualizarFechaHora, 1000);
})();
