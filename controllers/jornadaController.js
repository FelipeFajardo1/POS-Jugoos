const jornadaModel = require('../models/jornadaModel');

/**
 * Abrir jornada de caja
 */
function abrirJornada(empleado, montoInicial) {
  const existente = jornadaModel.obtenerAbierta();

  if (existente) {
    return {
      error: 'Ya existe una jornada abierta'
    };
  }

  if (montoInicial <= 0) {
    return {
      error: 'El monto inicial debe ser mayor a 0'
    };
  }

  jornadaModel.abrirJornada(empleado, montoInicial);

  return {
    success: true
  };
}

/**
 * Cerrar jornada de caja
 */
function cerrarJornada() {
  const jornada = jornadaModel.obtenerAbierta();

  if (!jornada) {
    return {
      error: 'No hay jornada abierta'
    };
  }

  const totalVentas =
    jornadaModel.totalVentasPorJornada(jornada.id);

  const ganancia =
    totalVentas - jornada.monto_inicial;

  jornadaModel.cerrarJornada(jornada.id, totalVentas);

  return {
    success: true,
    totalVentas,
    montoInicial: jornada.monto_inicial,
    ganancia
  };
}

/**
 * Saber qué vista mostrar al empleado
 */
function estadoJornada() {
  const jornada = jornadaModel.obtenerAbierta();

  return {
    abierta: !!jornada,
    jornada
  };
}

module.exports = {
  abrirJornada,
  cerrarJornada,
  estadoJornada
};
