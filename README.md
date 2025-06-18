# visaremeexplus

Este repositorio contiene una aplicación sencilla de ejemplo. Ahora incluye un pequeño backend en Node.js que permite que un administrador inicie sesión, consulte los usuarios conectados y cambie la clave de un usuario.

## Uso del backend

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor:
   ```bash
   npm start
   ```
   El servidor quedará escuchando por defecto en el puerto `3000`.

### Endpoints principales

- `POST /admin/login` – recibe `username` y `password` y devuelve un token de sesión.
- `GET /admin/users` – requiere el token en el encabezado `Authorization` y lista los usuarios conectados con su nombre y saldo.
- `PUT /admin/users/:id/password` – permite actualizar la clave de un usuario (requiere token).

Estos datos se almacenan en memoria para fines de demostración.
