const ventaModel = require('../models/ventaModel');
const jornadaModel = require('../models/jornadaModel');

/**
 * Registrar una venta completa
 * @param {Array} items [{ producto_id, cantidad, precio }]
 */
function registrarVenta(items) {
  // 1. Validar items
  if (!items || items.length === 0) {
    return {
      error: 'No hay productos en la venta'
    };
  }

  // 2. Verificar jornada abierta
  const jornada = jornadaModel.obtenerAbierta();

  if (!jornada) {
    return {
      error: 'No hay jornada abierta'
    };
  }

  // 3. Calcular total
  const total = items.reduce(
    (sum, i) => sum + i.precio * i.cantidad,
    0
  );

  // 4. Crear venta
  const ventaId = ventaModel.crearVenta(
    jornada.id,
    total
  );

  // 5. Guardar detalle
  items.forEach(item => {
    ventaModel.agregarDetalle(
      ventaId,
      item.producto_id,
      item.cantidad,
      item.precio
    );
  });

  return {
    success: true,
    ventaId,
    total
  };
}

/**
 * Obtener ventas de la jornada actual
 */
function ventasJornadaActual() {
  const jornada = jornadaModel.obtenerAbierta();

  if (!jornada) {
    return {
      error: 'No hay jornada abierta'
    };
  }

  const ventas = ventaModel.obtenerPorJornada(jornada.id);

  return {
    success: true,
    ventas
  };
}

module.exports = {
  registrarVenta,
  ventasJornadaActual
};
