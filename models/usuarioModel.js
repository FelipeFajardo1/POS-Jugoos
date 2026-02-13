const db = require('../database/db');

/**
 * Buscar usuario por credenciales
 */
function buscarUsuario(usuario, password) {
  return db.prepare(`
    SELECT * FROM usuarios
    WHERE usuario = ? AND password = ?
  `).get(usuario, password);
}

/**
 * Crear usuario (ADMIN)
 */
function crearUsuario(usuario, password, rol) {
  return db.prepare(`
    INSERT INTO usuarios (usuario, password, rol)
    VALUES (?, ?, ?)
  `).run(usuario, password, rol);
}

module.exports = {
  buscarUsuario,
  crearUsuario
};
