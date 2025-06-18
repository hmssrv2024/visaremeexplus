const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Simple in-memory storage
const adminCredentials = { username: 'admin', password: 'adminpass' };
let adminToken = null;

const users = [
  { id: 1, name: 'Usuario Uno', balance: 1000, password: 'clave1', connected: true },
  { id: 2, name: 'Usuario Dos', balance: 500, password: 'clave2', connected: false },
  { id: 3, name: 'Usuario Tres', balance: 750, password: 'clave3', connected: true }
];

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Falta token' });
  const token = authHeader.replace('Bearer ', '');
  if (token !== adminToken) return res.status(403).json({ message: 'Token invalido' });
  next();
}

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminCredentials.username && password === adminCredentials.password) {
    adminToken = crypto.randomBytes(16).toString('hex');
    return res.json({ token: adminToken });
  }
  res.status(401).json({ message: 'Credenciales incorrectas' });
});

app.get('/admin/users', authenticate, (req, res) => {
  const connectedUsers = users.filter(u => u.connected).map(u => ({ id: u.id, name: u.name, balance: u.balance }));
  res.json({ users: connectedUsers });
});

app.put('/admin/users/:id/password', authenticate, (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const user = users.find(u => u.id === parseInt(id));
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  user.password = password;
  res.json({ message: 'Clave actualizada' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
