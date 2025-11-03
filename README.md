# IPS_CONTROL
Sistema de gestión para un IPS
Manual para desplegar: Instala las dependencias listadas en package.json:
**npm install**
Esto instalará:

@prisma/client
express
express-joi-validation
cors
bcrypt
jsonwebtoken
dotenv
dayjs
node-cron (para tareas programadas, útil para la Fase de Pagos)

4. Configurar el Entorno


Crea un archivo .env en la raíz del proyecto (backend/.env):
bashtouch .env


Copia el contenido de .env.example (si existe) o usa el siguiente template:
plaintextDATABASE_URL="postgresql://<user>:<password>@localhost:5432/<database>?schema=public"
JWT_SECRET="tu_secreto_jwt_aqui"
PORT=5001

DATABASE_URL: Configura el usuario, contraseña, y nombre de la base de datos de PostgreSQL.

Ejemplo: postgresql://postgres:123456@localhost:5432/internet_service?schema=public
Asegúrate de que PostgreSQL esté corriendo y la base de datos exista:
bashpsql -U postgres -c "CREATE DATABASE internet_service;"



JWT_SECRET: Usa un secreto único (por ejemplo, genera uno con openssl rand -base64 32).
PORT: Por defecto, 5001.



Verifica que PostgreSQL esté corriendo:
bashpsql -U <user> -d <database>

. Probar los Endpoints de Clientes
Usa el accessToken de tu última llamada a /api/auth/login. Si está expirado, genera uno nuevo:
bashcurl -X POST http://localhost:5001/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"admin@test.com","password":"admin123"}'
Crear un cliente:
bashcurl -X POST http://localhost:5001/api/customers \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <access-token>" \
-d '{
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "phone": "+51987654321",
  "address": "Av. Principal 123",
  "district": "San Isidro",
  "province": "Lima",
  "department": "Lima",
  "documentNumber": "12345678",
  "documentType": "DNI",
  "customerType": "INDIVIDUAL",
  "priority": "MEDIA"
}'
Respuesta esperada:
json{
  "message": "Cliente creado",
  "customer": {
    "id": "<uuid>",
    "code": "CLT-0001",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+51987654321",
    "district": "San Isidro",
    "technicianId": "<technician-uuid-or-null>",
    "createdAt": "<timestamp>"
  }
}
Obtener clientes:
bashcurl -X GET http://localhost:5001/api/customers \
-H "Authorization: Bearer <access-token>"
Respuesta esperada:
json[
  {
    "id": "<uuid>",
    "code": "CLT-0001",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+51987654321",
    "address": "Av. Principal 123",
    "district": "San Isidro",
    "technicianId": "<technician-uuid-or-null>",
    "createdAt": "<timestamp>"
  }
]
Obtener un cliente:
bashcurl -X GET http://localhost:5001/api/customers/<customer-id> \
-H "Authorization: Bearer <access-token>"
Actualizar un cliente:
bashcurl -X PUT http://localhost:5001/api/customers/<customer-id> \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <access-token>" \
-d '{"name":"Juan Pérez Actualizado","phone":"+51987654322"}'
Eliminar un cliente (soft delete):
bashcurl -X DELETE http://localhost:5001/api/customers/<customer-id> \
-H "Authorization: Bearer <access-token>"
9. Verificar la Base de Datos
Confirma que los datos se guardaron correctamente:
bashnpx prisma studio