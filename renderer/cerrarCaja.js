window.addEventListener('DOMContentLoaded', () => {
  const btnCerrar = document.getElementById('cerrarCajaBtn');

  if (!btnCerrar) return;

  btnCerrar.addEventListener('click', async () => {
    const confirmar = confirm(
      '¿Desea cerrar la caja?\n\nEsto finalizará la jornada actual.'
    );

    if (!confirmar) return;

    try {
      // Obtener ventas PRIMERO (antes de cerrar la jornada)
      const resVentas = await window.caja.obtenerVentasJornada();
      
      // Luego cerrar la jornada
      const resCierre = await window.caja.cerrarJornada();

      if (!resCierre.success) {
        alert(resCierre.message || 'No se pudo cerrar la jornada');
        return;
      }

      // Mostrar modal con resumen
      mostrarResumenCierre(resCierre, resVentas);

      // Imprimir comprobante de arqueo
      await window.caja.imprimirArqueo({
        ganancias: resCierre.ganancias,
      });

    } catch (err) {
      console.error(err);
      alert('Error al cerrar la caja');
    }
  });

  // Botón cerrar sesión
  const btnCerrarSesion = document.getElementById('btnCerrarSesion');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
      await window.api.cerrarApp();
    });
  }
});

/**
 * Mostrar modal con resumen de cierre de caja
 */
function mostrarResumenCierre(resCierre, resVentas) {
  const modal = document.getElementById('modalCierre');
  
  // Llenar datos financieros
  document.getElementById('dineroEnCajaVal').textContent = 
    `$${resCierre.dineroEnCaja.toLocaleString('es-CO')}`;
  
  document.getElementById('montoInicialVal').textContent = 
    `$${resCierre.montoInicial.toLocaleString('es-CO')}`;
  
  document.getElementById('gananciasVal').textContent = 
    `$${resCierre.ganancias.toLocaleString('es-CO')}`;

  // Llenar historial de ventas
  const listaVentas = document.getElementById('listaVentas');
  listaVentas.innerHTML = '';

  if (!resVentas.success || resVentas.error) {
    listaVentas.innerHTML = '<p style="text-align: center; color: #999;">No hay ventas registradas</p>';
  } else if (resVentas.ventas && resVentas.ventas.length > 0) {
    resVentas.ventas.forEach(venta => {
      const ventaDiv = document.createElement('div');
      ventaDiv.className = 'venta-item';
      
      // Parsear la fecha
      const fecha = new Date(venta.fecha);
      const fechaFormato = fecha.toLocaleDateString('es-CO');
      const horaFormato = fecha.toLocaleTimeString('es-CO');
      
      ventaDiv.innerHTML = `
        <div class="venta-header">
          <strong>Venta #${venta.numero_venta}</strong>
          <span class="monto">$${venta.total.toLocaleString('es-CO')}</span>
        </div>
        <div class="productos-list">${venta.productos || 'Sin detalles'}</div>
        <small class="venta-fecha">${fechaFormato} - ${horaFormato}</small>
      `;
      listaVentas.appendChild(ventaDiv);
    });
  } else {
    listaVentas.innerHTML = '<p style="text-align: center; color: #999;">No hay ventas registradas</p>';
  }

  // Mostrar modal
  modal.style.display = 'flex';
}

