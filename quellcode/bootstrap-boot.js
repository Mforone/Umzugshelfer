// Startet den eigentlichen Programmcode aus dem Ordner "app" neben der exe.
const path = require('path');
const basis = process.env.UMZUG_BASIS || path.dirname(process.execPath);
require(path.join(basis, 'app', 'main.js'));
