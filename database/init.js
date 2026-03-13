const Database = require("better-sqlite3");
const db = require("./db"); // Importamos la conexión única

function initDatabase() {
  // Asegura integridad referencial
  db.pragma('foreign_keys = ON');

  // Utilidad: verificar si una columna existe (para migraciones suaves)
  const columnExists = (table, column) => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    return info.some((c) => c.name === column);
  };

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL
    )
  `,
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS secciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      imagen TEXT DEFAULT '📦',
      activo INTEGER DEFAULT 1
    )
  `,
  ).run();

  // Migración: columna activo para secciones
  if (!columnExists("secciones", "activo")) {
    db.prepare(`ALTER TABLE secciones ADD COLUMN activo INTEGER DEFAULT 1`).run();
  }

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    imagen TEXT,
    seccion_id INTEGER,
    activo INTEGER DEFAULT 1,
    FOREIGN KEY (seccion_id) REFERENCES secciones(id)
    )
  `,
  ).run();

  // Tabla de imágenes compartidas para bases (agua, leche, yogurt, helado)
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS imagenes_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      imagen TEXT
    )
  `,
  ).run();

  // Insertar bases por defecto si no existen
  const countBases = db.prepare('SELECT COUNT(*) as total FROM imagenes_base').get();
  if (countBases.total === 0) {
    db.prepare(`
      INSERT INTO imagenes_base (nombre, imagen) VALUES
      ('AGUA', 'base_agua.jpg'),
      ('LECHE', 'base_leche.jpg'),
      ('YOGURT', 'base_yogurt.png'),
      ('HELADO', 'base_helado.webp')
    `).run();
  }

  // Índices para consultas de admin / listados
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_productos_seccion_activo
     ON productos (seccion_id, activo)`,
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_secciones_activo
     ON secciones (activo)`,
  ).run();

  db.prepare(
    `
  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jornada_id INTEGER NOT NULL,
    total REAL NOT NULL,
    metodo_pago TEXT NOT NULL,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jornada_id) REFERENCES jornadas_caja(id)
  )
  `,
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ventas_jornada
     ON ventas (jornada_id)`,
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS venta_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER,
    producto_id INTEGER,
    cantidad INTEGER,
    precio REAL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `,
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS jornadas_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      monto_inicial REAL NOT NULL,
      total_ventas REAL DEFAULT 0,
      monto_final REAL,
      fecha_apertura TEXT NOT NULL,
      fecha_cierre TEXT,
      estado TEXT NOT NULL,
      FOREIGN KEY (empleado_id) REFERENCES usuarios(id)
    )
  `,
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_jornadas_fecha
     ON jornadas_caja (fecha_apertura)`,
  ).run();

  // Vista para resumir jornadas por año/mes/día y ganancias (se recrea para garantizar estructura)
  db.prepare('DROP VIEW IF EXISTS v_jornadas_resumen').run();
  db.prepare(
    `CREATE VIEW v_jornadas_resumen AS
     SELECT
       j.id,
       j.empleado_id,
       j.monto_inicial,
       j.total_ventas,
       j.monto_final,
       j.estado,
       j.fecha_apertura,
       j.fecha_cierre,
       strftime('%Y', j.fecha_apertura) AS anio,
       strftime('%m', j.fecha_apertura) AS mes,
       strftime('%d', j.fecha_apertura) AS dia,
       COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.jornada_id = j.id), 0) AS total_ventas_calc,
       COALESCE(j.monto_final, 0) - COALESCE(j.monto_inicial, 0) AS ganancia_calc
     FROM jornadas_caja j;
    `,
  ).run();

  // Crear admin por defecto (usuario: admin / password: admin123)
  const admin = db
    .prepare("SELECT * FROM usuarios WHERE usuario = ?")
    .get("admin");

  if (!admin) {
    db.prepare(
      `
      INSERT INTO usuarios (usuario, password, rol)
      VALUES ('admin', 'admin123', 'ADMIN')
    `,
    ).run();
  }

  // Crear empleado por defecto (usuario: 1 / password: 1)
  const empleado = db
    .prepare("SELECT * FROM usuarios WHERE usuario = ?")
    .get("1");

  if (!empleado) {
    db.prepare(
      `
    INSERT INTO usuarios (usuario, password, rol)
    VALUES ('1', '1', 'EMPLEADO')
  `,
    ).run();
  }
  // Secciones del menú principal - solo si la tabla está vacía
  const countSecciones = db.prepare('SELECT COUNT(*) as total FROM secciones').get();
  if (countSecciones.total === 0) {
    db.prepare(
      `INSERT INTO secciones (nombre, imagen, activo) VALUES
('JUGOS FUNCIONALES', '🥤', 1),
('JUGOS RECOMENDADOS', '⭐', 1),
('JUGOS FRUTAS', '🍓', 1),
('JUGOS EXPRIMIDOS', '🍊', 1),
('OTROS', '🧃', 1),
('PA ACOMPAÑAR', '🍴', 1),
('NUEVO PREMIUM', '✨', 1),
('BEBIDAS CALIENTES', '☕', 1),
('ENDULZANTES', '🍯', 1),
('ADICIONES', '➕', 1)
`,
    ).run();
  }

  // Productos base JUGOS FUNCIONALES - solo si no hay productos
  const countProductos = db.prepare('SELECT COUNT(*) as total FROM productos').get();
  if (countProductos.total === 0) {
    const seccionFuncionales = db.prepare("SELECT id FROM secciones WHERE nombre = 'JUGOS FUNCIONALES' LIMIT 1").get();
    const seccionRecomendados = db.prepare("SELECT id FROM secciones WHERE nombre = 'JUGOS RECOMENDADOS' LIMIT 1").get();
    const seccionFrutas = db.prepare("SELECT id FROM secciones WHERE nombre = 'JUGOS FRUTAS' LIMIT 1").get();
    if (seccionFuncionales) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo) VALUES
('PIÑA FIT 16 Oz', 10000, @sid, 1),
('VITA C 16 Oz', 10000, @sid, 1),
('ENERGY 16 Oz', 10000, @sid, 1),
('PURA VIDA 16 Oz', 10000, @sid, 1),
('VITAL JUICE 16 Oz', 10000, @sid, 1),
('MAS DEFENSAS 16 Oz', 10000, @sid, 1),
('PIÑA FIT 22 Oz', 11000, @sid, 1),
('VITA C 22 Oz', 11000, @sid, 1),
('ENERGY 22 Oz', 11000, @sid, 1),
('PURA VIDA 22 Oz', 11000, @sid, 1),
('VITAL JUICE 22 Oz', 11000, @sid, 1),
('MAS DEFENSAS 22 Oz', 11000, @sid, 1)
`,
      ).run({ sid: seccionFuncionales.id });
    }

    if (seccionRecomendados) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo) VALUES
('CITRUS PUNCH 16 Oz', 10000, @sid, 1),
('FRUTAS DEL BOSQUE 16 Oz', 10000, @sid, 1),
('LIMONADA CEREZADA 16 Oz', 12800, @sid, 1),
('MANGO PASION 16 Oz', 10000, @sid, 1),
('MORANGO 16 Oz', 10000, @sid, 1),
('SANDIA REFRESCANTE 16 Oz', 10000, @sid, 1),
('VERDE VERDE 16 Oz', 10000, @sid, 1),
('LIMONADA DE COCO 16 Oz', 13800, @sid, 1),
('BASE AGUA 16 Oz', 0, @sid, 1),
('BASE LECHE 16 Oz', 2500, @sid, 1),
('BASE YOGURT 16 Oz', 3600, @sid, 1),
('BASE HELADO 16 Oz', 3900, @sid, 1),
('CITRUS PUNCH 22 Oz', 11000, @sid, 1),
('FRUTAS DEL BOSQUE 22 Oz', 11000, @sid, 1),
('LIMONADA CEREZADA 22 Oz', 13800, @sid, 1),
('MANGO PASION 22 Oz', 11000, @sid, 1),
('MORANGO 22 Oz', 11000, @sid, 1),
('SANDIA REFRESCANTE 22 Oz', 11000, @sid, 1),
('VERDE VERDE 22 Oz', 11000, @sid, 1),
('LIMONADA DE COCO 22 Oz', 14800, @sid, 1),
('BASE AGUA 22 Oz', 0, @sid, 1),
('BASE LECHE 22 Oz', 2500, @sid, 1),
('BASE YOGURT 22 Oz', 3600, @sid, 1),
('BASE HELADO 22 Oz', 3900, @sid, 1)
`,
      ).run({ sid: seccionRecomendados.id });
    }

    if (seccionFrutas) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo, imagen) VALUES
('1 FRUTA 16 Oz', 10000, @sid, 1, '1_fruta.jpg'),
('2 FRUTAS 16 Oz', 10000, @sid, 1, '2_frutas.jpg'),
('3 FRUTAS 16 Oz', 10000, @sid, 1, '3_frutas.jpg'),
('BASE AGUA 16 Oz', 0, @sid, 1, NULL),
('BASE LECHE 16 Oz', 2500, @sid, 1, NULL),
('BASE YOGURT 16 Oz', 3600, @sid, 1, NULL),
('BASE HELADO 16 Oz', 3900, @sid, 1, NULL),
('1 FRUTA 22 Oz', 11000, @sid, 1, '1_fruta.jpg'),
('2 FRUTAS 22 Oz', 11000, @sid, 1, '2_frutas.jpg'),
('3 FRUTAS 22 Oz', 11000, @sid, 1, '3_frutas.jpg'),
('BASE AGUA 22 Oz', 0, @sid, 1, NULL),
('BASE LECHE 22 Oz', 2500, @sid, 1, NULL),
('BASE YOGURT 22 Oz', 3600, @sid, 1, NULL),
('BASE HELADO 22 Oz', 3900, @sid, 1, NULL)
`,
      ).run({ sid: seccionFrutas.id });
    }

    const seccionExprimidos = db.prepare("SELECT id FROM secciones WHERE nombre = 'JUGOS EXPRIMIDOS' LIMIT 1").get();
    if (seccionExprimidos) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo) VALUES
('JUGO NARANJA 16 Oz', 9800, @sid, 1),
('JUGO NARANJA + ZANAHORIA 16 Oz', 10500, @sid, 1),
('JUGO MANDARINA 16 Oz', 11500, @sid, 1),
('JUGO NARANJA 22 Oz', 10800, @sid, 1),
('JUGO NARANJA + ZANAHORIA 22 Oz', 11500, @sid, 1),
('JUGO MANDARINA 22 Oz', 13500, @sid, 1)
`,
      ).run({ sid: seccionExprimidos.id });
    }

    const seccionOtros = db.prepare("SELECT id FROM secciones WHERE nombre = 'OTROS' LIMIT 1").get();
    if (seccionOtros) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo) VALUES
('ICE COFFEE 16 Oz', 14000, @sid, 1),
('JUGO BOROJO 16 Oz', 13000, @sid, 1),
('LULADA 16 Oz', 13500, @sid, 1),
('MARACUYADA 16 Oz', 13500, @sid, 1),
('PIÑA COLADA 16 Oz', 13800, @sid, 1),
('MILO 16 Oz', 16000, @sid, 1),
('ICE COFFEE 22 Oz', 15000, @sid, 1),
('JUGO BOROJO 22 Oz', 14000, @sid, 1),
('LULADA 22 Oz', 14500, @sid, 1),
('MARACUYADA 22 Oz', 14500, @sid, 1),
('PIÑA COLADA 22 Oz', 14800, @sid, 1),
('PARFAIT', 15000, @sid, 1),
('PARFAIT CON HELADO', 16000, @sid, 1),
('ENSALADA FRUTAS', 15000, @sid, 1),
('ENSALADA FRUTAS CON HELADO', 17000, @sid, 1)
`,
      ).run({ sid: seccionOtros.id });
    }

    const seccionAcompanar = db.prepare("SELECT id FROM secciones WHERE nombre = 'PA ACOMPAÑAR' LIMIT 1").get();
    if (seccionAcompanar) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo, imagen) VALUES
('GALLETA AVENA', 2200, @sid, 1, 'galleta_avena.jpg'),
('EMPANADA HORNO', 3300, @sid, 1, 'empanada_horno.jpg'),
('TORTA BANANO', 4900, @sid, 1, 'torta.jpg'),
('TORTA ZANAHORIA', 4900, @sid, 1, 'torta.jpg'),
('SNACK DE MAIZ', 4900, @sid, 1, 'snack_maiz.jpg'),
('PASTEL POLLO', 4900, @sid, 1, 'pastel_pollo.jpg'),
('CROISSANT', 4900, @sid, 1, 'croissant.jpg'),
('SANDWICH SENCILLO', 12000, @sid, 1, 'sandwich.jpg'),
('SANDWICH JAMON PAVO + CERDO + CORDERO', 16000, @sid, 1, 'sandwich.jpg'),
('SANDWICH JAMON CORDERO + POLLO', 16000, @sid, 1, 'sandwich.jpg'),
('SANDWICH JAMON PAVO + POLLO', 16000, @sid, 1, 'sandwich.jpg'),
('SANDWICH JAMON CERDO + POLLO', 16000, @sid, 1, 'sandwich.jpg')
`,
      ).run({ sid: seccionAcompanar.id });
    }

    const seccionPremium = db.prepare("SELECT id FROM secciones WHERE nombre = 'NUEVO PREMIUM' LIMIT 1").get();
    if (seccionPremium) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo) VALUES
('MANGO BICHE 16 Oz', 13500, @sid, 1),
('MANGO LOCO 16 Oz', 16000, @sid, 1),
('MARACULULO 16 Oz', 16900, @sid, 1),
('MARACUMANGO 16 Oz', 16900, @sid, 1),
('PAY LIMON 16 Oz', 16000, @sid, 1),
('CHOCOOREO 16 Oz', 16000, @sid, 1),
('MOKA BLANCO 16 Oz', 16000, @sid, 1),
('NEVADO CHOCOHERSEY 16 Oz', 16000, @sid, 1),
('NEVADO COCOCETT 16 Oz', 16000, @sid, 1),
('NEVADO CHICLE 16 Oz', 16000, @sid, 1),
('FRAPPE CAMU CAMU 16 Oz', 13500, @sid, 1),
('FRAPPE ASAI 16 Oz', 13500, @sid, 1),
('SODA FRUTOS AMARILLOS 22 Oz', 14800, @sid, 1),
('SODA FRUTOS ROJOS 22 Oz', 14800, @sid, 1),
('SODA FRUTOS VERDES 22 Oz', 14800, @sid, 1),
('BOWL AMAZONICO ASAI', 18500, @sid, 1),
('BOWL AMAZONICO CAMU CAMU', 18500, @sid, 1),
('BOWL AMAZONICO COPOAZU', 18500, @sid, 1)
`,
      ).run({ sid: seccionPremium.id });
    }

    const seccionEndulzantes = db.prepare("SELECT id FROM secciones WHERE nombre = 'ENDULZANTES' LIMIT 1").get();
    if (seccionEndulzantes) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo, imagen) VALUES
('AZUCAR', 0, @sid, 1, 'azucar.webp'),
('MIEL DE ABEJA', 0, @sid, 1, 'miel.jpg'),
('CREMA DE COCO', 3000, @sid, 1, 'crema_coco.jpg')
`,
      ).run({ sid: seccionEndulzantes.id });
    }

    const seccionAdiciones = db.prepare("SELECT id FROM secciones WHERE nombre = 'ADICIONES' LIMIT 1").get();
    if (seccionAdiciones) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo, imagen) VALUES
('AVENA', 1000, @sid, 1, 'avena.jpg'),
('POLEN', 1000, @sid, 1, 'polen.jpg'),
('GERMEN DE TRIGO', 1000, @sid, 1, 'trigo.jpg'),
('CHIA', 1000, @sid, 1, 'chia.webp'),
('GRANOLA', 2500, @sid, 1, 'granola.jpg'),
('ALOE VERA', 1500, @sid, 1, 'aloe.jpg'),
('HELADO', 3500, @sid, 1, 'base_helado.webp'),
('CREMA COCO', 3000, @sid, 1, 'crema_coco.jpg'),
('KOLA GRANULADA', 2800, @sid, 1, 'kola.webp'),
('JENGIBRE', 1500, @sid, 1, 'jengibre.webp'),
('LECHE CONDENSADA', 2800, @sid, 1, 'lechera.webp'),
('VASITO HELADO', 5000, @sid, 1, 'vasito_helado.webp')
`,
      ).run({ sid: seccionAdiciones.id });
    }

    const seccionCalientes = db.prepare("SELECT id FROM secciones WHERE nombre = 'BEBIDAS CALIENTES' LIMIT 1").get();
    if (seccionCalientes) {
      db.prepare(
        `INSERT INTO productos (nombre, precio, seccion_id, activo, imagen) VALUES
('CAPUCCINO', 7500, @sid, 1, 'capuccino.jpg'),
('AFFOGATO', 11500, @sid, 1, 'affogato.jpg'),
('AMERICANO', 5000, @sid, 1, 'americano.jpeg'),
('MILO CALIENTE', 11500, @sid, 1, 'milo.jpg'),
('CHOCOLATE HOT', 13500, @sid, 1, 'chocolate.jpg'),
('AROMATICAS FRUTAL', 10000, @sid, 1, 'aromatica.jpg')
`,
      ).run({ sid: seccionCalientes.id });
    }
  }

  return db;
}

module.exports = initDatabase;
