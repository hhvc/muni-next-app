

sequenceDiagram
    participant Admin as Administrador
    participant Firestore
    participant Candidato
    participant Auth as Autenticación
    
    Admin->>Firestore: 1. Genera código (DNI + código único)
    Candidato->>Auth: 2. Inicia sesión con Google
    Auth-->>Candidato: 3. Redirige a validación
    Candidato->>Firestore: 4. Envía DNI + código
    Firestore-->>Candidato: 5. Valida coincidencia
    Firestore->>Firestore: 6. Marca código como usado
    Firestore->>Firestore: 7. Crea documento de usuario
    Firestore-->>Candidato: 8. Confirma validación
    Candidato->>Sistema: 9. Accede al formulario

# Este sistema garantiza que:

1. Solo administradores puedan generar códigos
2. Cada código es único y asociado a un DNI
3. Los códigos solo pueden usarse una vez
4. Los candidatos quedan vinculados al código usado
5. Todo queda registrado con timestamps para auditoría