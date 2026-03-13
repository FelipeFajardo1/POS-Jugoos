const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determinar la ruta de la base de datos según el entorno
const isPackaged = __dirname.includes('app.asar') || __dirname.includes('resources');
let dbFolder = '';

if (isPackaged) {
  // En producción (empaquetado), guardamos al lado del ejecutable (fuera de resources)
  dbFolder = path.join(process.resourcesPath, '..', 'data');
} else {
  // En desarrollo, guardamos en la carpeta database
  dbFolder = path.join(process.cwd(), 'database');
}

// Crear la carpeta si no existe
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, 'jugoos.db');
const db = new Database(dbPath);

module.exports = db;
