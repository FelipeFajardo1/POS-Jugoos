const db = require('../database/db');

/**
 * Obtiene la jornada actualmente abierta (si existe)
 */
function obtenerAbierta() {
  return db
    .prepare("SELECT * FROM jornadas WHERE estado = 'ABIERTA' LIMIT 1")
    .get();
}

/**
 * Abre una nueva jornada
 */
function abrirJornada(empleado, montoInicial) {
  return db.prepare(`
    INSERT INTO jornadas (empleado, monto_inicial, estado)
    VALUES (?, ?, 'ABIERTA')
  `).run(empleado, montoInicial);
}

/**
 * Cierra la jornada abierta
 */
function cerrarJornada(idJornada, totalVentas) {
  return db.prepare(`
    UPDATE jornadas
    SET estado = 'CERRADA',
        monto_cierre = ?,
        fecha_cierre = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(totalVentas, idJornada);
}

/**
 * Total de ventas de una jornada
 */
function totalVentasPorJornada(jornadaId) {
  const result = db.prepare(`
    SELECT SUM(total) as total
    FROM ventas
    WHERE jornada_id = ?
  `).get(jornadaId);

  return result.total || 0;
}

module.exports = {
  obtenerAbierta,
  abrirJornada,
  cerrarJornada,
  totalVentasPorJornada
};
