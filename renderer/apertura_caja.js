window.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));

  // Seguridad
  if (!user || user.rol !== "EMPLEADO") {
    window.location.replace("../index.html");
    return;
  }

  // Mostrar empleado
  document.getElementById("empleado").value = user.usuario;

  // Teclado numérico
  const montoInput = document.getElementById("monto");
  const numpadButtons = document.querySelectorAll(".numpad-btn");
  let valorReal = ""; // Guardar el valor sin formato

  function formatearMonto(valor) {
    // Separar parte entera y decimal
    const partes = valor.split(".");
    const parteEntera = partes[0];
    const parteDecimal = partes[1];

    // Formatear parte entera con puntos como separador de miles
    const enteraFormateada = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Retornar con decimal si existe
    return parteDecimal !== undefined ? `${enteraFormateada},${parteDecimal}` : enteraFormateada;
  }

  numpadButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.value;
      const action = btn.dataset.action;

      if (action === "clear") {
        valorReal = "";
        montoInput.value = "";
      } else if (action === "back") {
        valorReal = valorReal.slice(0, -1);
        montoInput.value = valorReal ? formatearMonto(valorReal) : "";
      } else if (value) {
        // Evitar múltiples puntos decimales
        if (value === "." && valorReal.includes(".")) {
          return;
        }
        valorReal += value;
        montoInput.value = formatearMonto(valorReal);
      }
    });
  });

  // Verificar jornada activa
  const jornada = await window.caja.jornadaActiva();

  if (jornada) {
    window.location.replace("ventas.html");
    return;
  }

  // Submit apertura
  const form = document.getElementById("formCaja");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Usar valorReal en lugar del valor formateado del input
    const monto = parseFloat(valorReal);

    if (isNaN(monto) || monto <= 0) {
      alert("Ingrese un monto válido");
      return;
    }

    const res = await window.caja.abrirJornada({
      empleado_id: user.id,
      monto_inicial: monto,
    });

    if (!res.success) {
      alert(res.message);
      return;
    }

    alert("Jornada iniciada correctamente");
    window.location.replace("ventas.html");
    console.log({
      empleado_id: user.id,
      monto_inicial: monto,
    });
  });
});
