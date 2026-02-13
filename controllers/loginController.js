const usuarioModel = require('../models/usuarioModel');
const jornadaModel = require('../models/jornadaModel');

/**
 * Login de usuario
 */
function login(usuario, password) {
  // 1. Buscar usuario
  const user = usuarioModel.buscarUsuario(usuario, password);

  if (!user) {
    return {
      error: 'Usuario o contraseña incorrectos'
    };
  }

  // 2. Si es ADMIN
  if (user.rol === 'ADMIN') {
    return {
      success: true,
      rol: 'ADMIN',
      vista: 'admin.html'
    };
  }

  // 3. Si es EMPLEADO
  if (user.rol === 'EMPLEADO') {
    const jornadaAbierta = jornadaModel.obtenerAbierta();

    return {
      success: true,
      rol: 'EMPLEADO',
      vista: jornadaAbierta
        ? 'ventas.html'
        : 'apertura_caja.html'
    };
  }

  // 4. Rol no reconocido
  return {
    error: 'Rol no válido'
  };
}

module.exports = {
  login
};
