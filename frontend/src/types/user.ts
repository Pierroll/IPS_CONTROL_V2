// src/types/user.ts

export interface User {
  id: string;              // Identificador único (UUID)
  email: string;           // Correo electrónico único
  role: UserRole;          // Rol del usuario (enum definido abajo)
  name: string;            // Nombre completo
  password?: string;       // Contraseña (opcional, manejada en backend)
  active?: boolean;        // Estado activo/inactivo (opcional, para soft delete o estado)
  deletedAt?: Date | null; // Fecha de eliminación lógica (opcional, para soft delete)
  createdAt?: Date;        // Fecha de creación
  updatedAt?: Date;        // Fecha de última actualización
  createdBy?: string;      // ID del usuario que creó este usuario (e.g., para técnicos)
  phone?: string;          // Teléfono (opcional)
  documentNumber?: string; // Número de documento (opcional, e.g., DNI)
}

// Enum para los roles de usuario
export enum UserRole {
  ADMIN = "ADMIN",         // Administrador (crea y gestiona todo)
  SELLER = "SELLER",       // Vendedor
  TECHNICIAN = "TECHNICIAN", // Técnico
  MANAGER = "MANAGER",     // Gerente
  SUPPORT = "SUPPORT"      // Soporte
}

// Payload para crear un nuevo usuario
export interface CreateUserPayload {
  email: string;
  role: UserRole;
  name: string;
  password: string;        // Requiere contraseña al crear
  phone?: string;
  documentNumber?: string;
  createdBy?: string;      // Opcional, para registrar quién creó el usuario
}

// Payload para actualizar un usuario
export interface UpdateUserPayload {
  email?: string;
  role?: UserRole;
  name?: string;
  password?: string;       // Opcional al actualizar
  phone?: string;
  documentNumber?: string;
  active?: boolean;
  deletedAt?: Date | null;
}
