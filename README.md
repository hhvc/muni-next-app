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

# Estructura de las carpetas y archivos
Estructura de las carpetas:
.firebase
.next
node_modules
public
src/app
src/app/favicon.ico
src/app/globals.css
src/app/layout.tsx
src/app/page.module.css
src/app/page.tsx
src/components
src/components/admin
src/components/invitations/page.tsx
src/components/admin/ InvitationGenerator.tsx
src/components/admin/InvitationsList
src/components/AdminDashboard.tsx
src/components/AuthProvider.tsx
src/components/EmploeeForm.tsx
src/components/ErrorMessage.tsx
src/components/FirestoreTest.txs
src/components/GoogleSignInPage.tsx
src/components/HomePageContent.tsx
src/components/LoadingSpinner.tsx
src/components/Login.tsx
src/components/Unauthorized.tsx
firebase
firebase/ clienApp.ts
firebase/ serverApp.ts
hooks
hooks/useFirebase.ts
pages\api
page/api/hello.ts
types
types/ firebase-admin.d.ts
.env.local
.firebaseserc
.gitignore
eslint.config.mjs
firebase.json
next-env.d.ts
next.config.ts
package-lock.json
package.json
README.md
tsconfig.json