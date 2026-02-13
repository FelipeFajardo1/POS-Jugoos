const initDatabase = require("./database/init");
const db = initDatabase();

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let win; // 👈 referencia global

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    show: false, // 👈 importante
    icon: path.join(__dirname, "assets", "icono.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");

  win.once("ready-to-show", () => {
    win.show();
    win.focus(); // 👈 CLAVE
  });
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    win.show();
    win.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


// 🔐 LOGIN
ipcMain.handle("login", (event, { usuario, password }) => {
  const user = db
    .prepare(
      "SELECT id, usuario, rol FROM usuarios WHERE usuario = ? AND password = ?",
    )
    .get(usuario, password);

  if (!user) {
    return { success: false, message: "Credenciales incorrectas" };
  }

  let vista = "apertura_caja.html";

  if (user.rol === "ADMIN") {
    vista = "admin.html";
  } else {
    const jornada = db
      .prepare("SELECT id FROM jornadas_caja WHERE estado = 'ABIERTA'")
      .get();

    if (jornada) {
      vista = "ventas.html";
    }
  }

  return {
    success: true,
    user,
    vista,
  };
});

// 📦 JORNADA ACTIVA
ipcMain.handle("jornada-activa", () => {
  return (
    db.prepare("SELECT * FROM jornadas_caja WHERE estado = 'ABIERTA'").get() ||
    null
  );
});

// 💰 ABRIR JORNADA
ipcMain.handle('abrir-jornada', (event, data) => {
  if (!data) {
    return {
      success: false,
      message: 'Datos de apertura no recibidos'
    };
  }

  const { empleado_id, monto_inicial } = data;

  if (!empleado_id || !monto_inicial) {
    return {
      success: false,
      message: 'Datos incompletos para abrir jornada'
    };
  }

  const activa = db.prepare(
    "SELECT id FROM jornadas_caja WHERE estado = 'ABIERTA'"
  ).get();

  if (activa) {
    return { success: false, message: 'Ya existe una jornada abierta' };
  }

  db.prepare(`
    INSERT INTO jornadas_caja
    (empleado_id, monto_inicial, fecha_apertura, estado)
    VALUES (?, ?, datetime('now', '-5 hours'), 'ABIERTA')
  `).run(empleado_id, monto_inicial);

  return { success: true };
});


// 🔒 CERRAR JORNADA
ipcMain.handle("cerrar-jornada", () => {
  const jornada = db
    .prepare("SELECT * FROM jornadas_caja WHERE estado = 'ABIERTA'")
    .get();

  if (!jornada) {
    return { success: false, message: "No hay jornada activa" };
  }

  // 💵 Total ventas del día (si aún no tienes ventas, queda en 0)
  const ventas = db
    .prepare(
      `
    SELECT IFNULL(SUM(total), 0) AS totalVentas
    FROM ventas
    WHERE jornada_id = ?
  `,
    )
    .get(jornada.id);

  const totalVentas = ventas.totalVentas || 0;
  const montoInicial = jornada.monto_inicial;
  const dineroEnCaja = montoInicial + totalVentas;
  const ganancias = dineroEnCaja - montoInicial; // que es igual a totalVentas

  // 🕒 Cerrar jornada
  db.prepare(
    `
    UPDATE jornadas_caja
    SET 
      fecha_cierre = datetime('now', '-5 hours'),
      monto_final = ?,
      estado = 'CERRADA'
    WHERE id = ?
  `,
  ).run(dineroEnCaja, jornada.id);

  return {
    success: true,
    dineroEnCaja,
    montoInicial,
    ganancias,
    totalVentas
  };
});

// 📋 OBTENER VENTAS DE LA JORNADA ACTIVA
ipcMain.handle('obtener-ventas-jornada', () => {
  const jornada = db
    .prepare("SELECT * FROM jornadas_caja WHERE estado = 'ABIERTA'")
    .get();

  if (!jornada) {
    return { success: false, error: 'No hay jornada abierta' };
  }

  const ventas = db
    .prepare(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY v.fecha ASC) as numero_venta,
        v.id,
        v.total,
        v.fecha,
        GROUP_CONCAT(p.nombre || ' (x' || vd.cantidad || ')', ', ') as productos
      FROM ventas v
      LEFT JOIN venta_detalle vd ON v.id = vd.venta_id
      LEFT JOIN productos p ON vd.producto_id = p.id
      WHERE v.jornada_id = ?
      GROUP BY v.id
      ORDER BY v.fecha DESC
    `)
    .all(jornada.id);

  return {
    success: true,
    ventas: ventas || [],
    jornada
  };
});

// 🚪 LOGOUT - Volver al login limpiando estado
ipcMain.handle('logout', () => {
  // Cargar index.html (login)
  win.loadFile('index.html');
  
  // Asegurar que la ventana tiene foco
  setTimeout(() => {
    win.focus();
  }, 100);

  return { success: true };
});

// 🏷️ OBTENER SECCIONES
ipcMain.handle('obtener-secciones', () => {
  const secciones = db.prepare('SELECT * FROM secciones ORDER BY nombre').all();
  return secciones || [];
});

// 📦 OBTENER PRODUCTOS POR SECCIÓN
ipcMain.handle('obtener-productos', (event, seccionId) => {
  const productos = db.prepare(`
    SELECT id, nombre, precio, imagen
    FROM productos
    WHERE seccion_id = ? AND activo = 1
    ORDER BY nombre
  `).all(seccionId);
  return productos || [];
});

// 💳 REGISTRAR VENTA
ipcMain.handle('registrar-venta', (event, items) => {
  try {
    const jornada = db.prepare("SELECT * FROM jornadas_caja WHERE estado = 'ABIERTA'").get();

    if (!jornada) {
      return { success: false, message: 'No hay jornada abierta' };
    }

    // Validar items
    if (!items || items.length === 0) {
      return { success: false, message: 'No hay productos en la factura' };
    }

    // Calcular total
    const total = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    // Crear venta
    const result = db.prepare(`
      INSERT INTO ventas (jornada_id, total, metodo_pago, fecha)
      VALUES (?, ?, 'EFECTIVO', datetime('now', '-5 hours'))
    `).run(jornada.id, total);

    const ventaId = result.lastInsertRowid;

    // Guardar detalles
    items.forEach(item => {
      db.prepare(`
        INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio)
        VALUES (?, ?, ?, ?)
      `).run(ventaId, item.id, item.cantidad, item.precio);
    });

    return {
      success: true,
      ventaId,
      total
    };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Error al registrar venta' };
  }
});

// 🔴 CERRAR APLICACIÓN
ipcMain.handle('cerrar-aplicacion', () => {
  app.quit();
});

// =====================
// ADMIN: SECCIONES Y PRODUCTOS
// =====================
ipcMain.handle('admin-secciones-listar', () => {
  return db.prepare(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM productos p WHERE p.seccion_id = s.id) AS total_productos
    FROM secciones s
    ORDER BY s.nombre
  `).all();
});

ipcMain.handle('admin-seccion-crear', (event, { nombre, imagen = '📦', activo = 1 }) => {
  if (!nombre || !nombre.trim()) return { success: false, message: 'Nombre requerido' };
  try {
    const res = db.prepare(`
      INSERT INTO secciones (nombre, imagen, activo)
      VALUES (?, ?, ?)
    `).run(nombre.trim(), imagen || '📦', activo ? 1 : 0);
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'No se pudo crear la sección' };
  }
});

ipcMain.handle('admin-seccion-actualizar', (event, { id, nombre, imagen, activo }) => {
  if (!id) return { success: false, message: 'ID requerido' };
  const s = db.prepare('SELECT * FROM secciones WHERE id = ?').get(id);
  if (!s) return { success: false, message: 'Sección no encontrada' };
  db.prepare(`
    UPDATE secciones
    SET nombre = COALESCE(?, nombre),
        imagen = COALESCE(?, imagen),
        activo = COALESCE(?, activo)
    WHERE id = ?
  `).run(nombre ?? null, imagen ?? null, activo === undefined ? null : (activo ? 1 : 0), id);
  return { success: true };
});

ipcMain.handle('admin-seccion-eliminar', (event, id) => {
  if (!id) return { success: false, message: 'ID requerido' };
  try {
    db.prepare('DELETE FROM productos WHERE seccion_id = ?').run(id);
    db.prepare('DELETE FROM secciones WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'No se pudo eliminar la sección' };
  }
});

ipcMain.handle('admin-productos-listar', (event, seccionId) => {
  if (!seccionId) return [];
  return db.prepare(`
    SELECT id, nombre, precio, imagen, activo
    FROM productos
    WHERE seccion_id = ?
    ORDER BY nombre
  `).all(seccionId);
});

ipcMain.handle('admin-producto-crear', (event, { nombre, precio, seccion_id, imagen = null, activo = 1 }) => {
  if (!nombre || !precio || !seccion_id) {
    return { success: false, message: 'Datos incompletos' };
  }
  try {
    const res = db.prepare(`
      INSERT INTO productos (nombre, precio, imagen, seccion_id, activo)
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre.trim(), precio, imagen, seccion_id, activo ? 1 : 0);
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'No se pudo crear el producto' };
  }
});

ipcMain.handle('admin-producto-actualizar-precio', (event, { id, precio }) => {
  if (!id || precio === undefined) return { success: false, message: 'Datos incompletos' };
  db.prepare('UPDATE productos SET precio = ? WHERE id = ?').run(precio, id);
  return { success: true };
});

ipcMain.handle('admin-producto-actualizar-estado', (event, { id, activo }) => {
  if (!id || activo === undefined) return { success: false, message: 'Datos incompletos' };
  db.prepare('UPDATE productos SET activo = ? WHERE id = ?').run(activo ? 1 : 0, id);
  return { success: true };
});

ipcMain.handle('admin-producto-eliminar', (event, id) => {
  if (!id) return { success: false, message: 'ID requerido' };
  db.prepare('DELETE FROM productos WHERE id = ?').run(id);
  return { success: true };
});

// =====================
// ADMIN: JORNADAS HISTÓRICO
// =====================
ipcMain.handle('admin-jornadas-anios', () => {
  return db.prepare(`
    SELECT DISTINCT anio
    FROM v_jornadas_resumen
    WHERE anio IS NOT NULL
    ORDER BY anio DESC
  `).all();
});

ipcMain.handle('admin-jornadas-meses', (event, anio) => {
  if (!anio) return [];
  return db.prepare(`
    SELECT DISTINCT mes
    FROM v_jornadas_resumen
    WHERE anio = ?
    ORDER BY mes DESC
  `).all(anio);
});

ipcMain.handle('admin-jornadas-dias', (event, { anio, mes }) => {
  if (!anio || !mes) return [];
  return db.prepare(`
    SELECT DISTINCT dia
    FROM v_jornadas_resumen
    WHERE anio = ? AND mes = ?
    ORDER BY dia DESC
  `).all(anio, mes);
});

ipcMain.handle('admin-jornadas-por-dia', (event, { anio, mes, dia }) => {
  if (!anio || !mes || !dia) return [];
  return db.prepare(`
    SELECT id, empleado_id, monto_inicial,
           total_ventas_calc AS total_ventas,
           ganancia_calc AS ganancia,
           fecha_apertura, fecha_cierre, estado
    FROM v_jornadas_resumen
    WHERE anio = ? AND mes = ? AND dia = ?
    ORDER BY fecha_apertura DESC
  `).all(anio, mes, dia);
});

// 🖼️ SUBIR IMAGEN DE PRODUCTO
ipcMain.handle('admin-subir-imagen', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Seleccionar imagen del producto',
    filters: [
      { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) {
    return { success: false, canceled: true };
  }

  const sourcePath = result.filePaths[0];
  const ext = path.extname(sourcePath);
  const fileName = `prod_${Date.now()}${ext}`;
  const destPath = path.join(__dirname, 'assets', 'productos', fileName);

  try {
    fs.copyFileSync(sourcePath, destPath);
    return { success: true, fileName };
  } catch (err) {
    console.error('Error copiando imagen:', err);
    return { success: false, message: 'No se pudo copiar la imagen' };
  }
});

// 🖼️ ACTUALIZAR IMAGEN DE PRODUCTO
ipcMain.handle('admin-producto-actualizar-imagen', (event, { id, imagen }) => {
  if (!id) return { success: false, message: 'ID requerido' };
  db.prepare('UPDATE productos SET imagen = ? WHERE id = ?').run(imagen, id);
  return { success: true };
});

// =====================
// IMÁGENES DE BASES COMPARTIDAS
// =====================
ipcMain.handle('admin-bases-listar', () => {
  return db.prepare('SELECT * FROM imagenes_base ORDER BY nombre').all();
});

ipcMain.handle('admin-base-actualizar-imagen', (event, { id, imagen }) => {
  if (!id) return { success: false, message: 'ID requerido' };
  db.prepare('UPDATE imagenes_base SET imagen = ? WHERE id = ?').run(imagen, id);
  return { success: true };
});

ipcMain.handle('obtener-imagen-base', (event, nombreBase) => {
  // nombreBase será algo como "AGUA", "LECHE", "YOGURT", "HELADO"
  const base = db.prepare('SELECT imagen FROM imagenes_base WHERE nombre = ?').get(nombreBase);
  return base?.imagen || null;
});
