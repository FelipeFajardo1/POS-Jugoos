const db = require('../database/db');

/**
 * Obtener todas las secciones
 */
function obtenerSecciones() {
  return db.prepare(`
    SELECT * FROM secciones
    ORDER BY nombre
  `).all();
}

/**
 * Obtener productos por sección
 */
function obtenerProductosPorSeccion(seccionId) {
  return db.prepare(`
    SELECT * FROM productos
    WHERE seccion_id = ? AND activo = 1
    ORDER BY nombre
  `).all(seccionId);
}

/**
 * Crear producto (ADMIN)
 */
function crearProducto(nombre, precio, seccionId, imagen = null) {
  return db.prepare(`
    INSERT INTO productos (nombre, precio, seccion_id, imagen)
    VALUES (?, ?, ?, ?)
  `).run(nombre, precio, seccionId, imagen);
}

/**
 * Actualizar precio (ADMIN)
 */
function actualizarPrecio(id, nuevoPrecio) {
  return db.prepare(`
    UPDATE productos
    SET precio = ?
    WHERE id = ?
  `).run(nuevoPrecio, id);
}

module.exports = {
  obtenerSecciones,
  obtenerProductosPorSeccion,
  crearProducto,
  actualizarPrecio
};
