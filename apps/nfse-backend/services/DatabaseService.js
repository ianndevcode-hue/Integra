const fs = require('fs');
const path = require('path');
const DATA_PATH = path.resolve(process.env.DATA_PATH || './data');

function readFile(filename, fallback = []) {
  const filePath = path.join(DATA_PATH, filename);
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeFile(filename, data) {
  const filePath = path.join(DATA_PATH, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getNextId(filename, idField = 'id') {
  const items = readFile(filename, []);
  if (items.length === 0) return 1;
  return Math.max(...items.map(i => i[idField])) + 1;
}

module.exports = {
  readFile,
  writeFile,
  getNextId,
  DATA_PATH,
};
