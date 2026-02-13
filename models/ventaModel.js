const db = require('../database/db');

/**
 * Crear venta
 */
function crearVenta(jornadaId, total) {
  const result = db.prepare(`
    INSERT INTO ventas (jornada_id, total)
    VALUES (?, ?)
  `).run(jornadaId, total);

  return result.lastInsertRowid;
}

/**
 * Agregar detalle de venta
 */
function agregarDetalle(ventaId, productoId, cantidad, precio) {
  return db.prepare(`
    INSERT INTO venta_detalle
      (venta_id, producto_id, cantidad, precio)
    VALUES (?, ?, ?, ?)
  `).run(ventaId, productoId, cantidad, precio);
}

/**
 * Obtener ventas por jornada
 */
function obtenerPorJornada(jornadaId) {
  return db.prepare(`
    SELECT * FROM ventas
    WHERE jornada_id = ?
    ORDER BY fecha DESC
  `).all(jornadaId);
}

module.exports = {
  crearVenta,
  agregarDetalle,
  obtenerPorJornada
};
