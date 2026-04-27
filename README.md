# 🕐 Sistema de Inventario de Relojes - Solana

**Backend CRUD completo para gestionar inventario de relojes en Solana**

Desarrollado con **Rust** y **Anchor Framework**

---

## 📋 Descripción del Proyecto

Este proyecto implementa un sistema de inventario descentralizado para relojes en la blockchain de Solana. Permite realizar operaciones CRUD completas (Crear, Leer, Actualizar, Eliminar) sobre un inventario de relojes, almacenando la información de forma segura y permanente en la blockchain.

### Información que se almacena por cada reloj:
- **Marca**: Nombre de la marca (máx. 50 caracteres)
- **Modelo**: Modelo del reloj (máx. 50 caracteres)
- **Piezas**: Número de piezas del reloj
- **Disponible**: Estado de disponibilidad (true/false)
- **Propietario**: Dirección de la wallet propietaria
- **Fecha de creación**: Timestamp automático
- **Fecha de actualización**: Timestamp automático

---

## 🏗️ Arquitectura Técnica

### PDAs (Program Derived Addresses)

Cada reloj se identifica de forma única mediante una PDA generada con las siguientes seeds:

```rust
seeds = [
    b"reloj",              // Prefijo constante
    propietario.key(),     // Dirección del propietario
    marca.as_bytes(),      // Marca del reloj
    modelo.as_bytes()      // Modelo del reloj
]
```

**Ventajas de este diseño:**
- ✅ Cada combinación propietario + marca + modelo es única
- ✅ No se pueden crear relojes duplicados
- ✅ Las direcciones son determinísticas y verificables
- ✅ No se requieren seeds adicionales del usuario

### Estructura de Datos

```rust
pub struct Reloj {
    pub propietario: Pubkey,        // 32 bytes
    pub marca: String,              // 4 + 50 bytes
    pub modelo: String,             // 4 + 50 bytes
    pub piezas: u32,                // 4 bytes
    pub disponible: bool,           // 1 byte
    pub fecha_creacion: i64,        // 8 bytes
    pub fecha_actualizacion: i64,   // 8 bytes
    pub bump: u8,                   // 1 byte
}
// Total: ~162 bytes + discriminador (8 bytes) = 170 bytes
```

---

## 🚀 Operaciones Disponibles

### 1. **CREATE - Crear Reloj** (`crear_reloj`)

Crea un nuevo reloj en el inventario.

**Parámetros:**
- `marca: String` - Marca del reloj
- `modelo: String` - Modelo del reloj
- `piezas: u32` - Número de piezas
- `disponible: bool` - Disponibilidad inicial

**Validaciones:**
- Marca no puede exceder 50 caracteres
- Modelo no puede exceder 50 caracteres
- No puede existir otro reloj con la misma combinación propietario+marca+modelo

**Ejemplo de uso:**
```typescript
await program.methods
  .crearReloj("Rolex", "Submariner", 150, true)
  .accounts({
    reloj: relojPda,
    propietario: wallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
  })
  .rpc();
```

---

### 2. **READ - Leer Reloj**

Obtiene la información completa de un reloj existente.

**Ejemplo de uso:**
```typescript
const reloj = await program.account.reloj.fetch(relojPda);
console.log(reloj.marca, reloj.modelo, reloj.piezas);
```

**Listar todos los relojes de un propietario:**
```typescript
const relojes = await program.account.reloj.all([
  {
    memcmp: {
      offset: 8,
      bytes: wallet.publicKey.toBase58(),
    },
  },
]);
```

---

### 3. **UPDATE - Actualizar Reloj** (`actualizar_reloj`)

Actualiza uno o más campos del reloj. Todos los parámetros son opcionales.

**Parámetros:**
- `marca: Option<String>` - Nueva marca (opcional)
- `modelo: Option<String>` - Nuevo modelo (opcional)
- `piezas: Option<u32>` - Nuevas piezas (opcional)
- `disponible: Option<bool>` - Nueva disponibilidad (opcional)

**Ejemplo de uso:**
```typescript
await program.methods
  .actualizarReloj("Omega", "Speedmaster", 200, false)
  .accounts({
    reloj: relojPda,
    propietario: wallet.publicKey,
  })
  .rpc();
```

---

### 4. **UPDATE - Actualizar Piezas** (`actualizar_piezas`)

Función especializada para actualizar solo el número de piezas.

**Parámetros:**
- `piezas: u32` - Nuevo número de piezas

**Ejemplo de uso:**
```typescript
await program.methods
  .actualizarPiezas(175)
  .accounts({
    reloj: relojPda,
    propietario: wallet.publicKey,
  })
  .rpc();
```

---

### 5. **UPDATE - Cambiar Disponibilidad** (`cambiar_disponibilidad`)

Función especializada para cambiar solo el estado de disponibilidad.

**Parámetros:**
- `disponible: bool` - Nuevo estado de disponibilidad

**Ejemplo de uso:**
```typescript
await program.methods
  .cambiarDisponibilidad(true)
  .accounts({
    reloj: relojPda,
    propietario: wallet.publicKey,
  })
  .rpc();
```

---

### 6. **DELETE - Eliminar Reloj** (`eliminar_reloj`)

Elimina un reloj del inventario y recupera el rent a la wallet del propietario.

**Ejemplo de uso:**
```typescript
await program.methods
  .eliminarReloj()
  .accounts({
    reloj: relojPda,
    propietario: wallet.publicKey,
  })
  .rpc();
```

---

## 🔐 Seguridad

El programa implementa múltiples capas de seguridad:

### 1. **Validación de Propietario**
```rust
#[account(has_one = propietario)]
```
Solo el propietario puede modificar o eliminar sus relojes.

### 2. **Validación de Longitud**
```rust
require!(marca.len() <= 50, ErrorCode::MarcaMuyLarga);
require!(modelo.len() <= 50, ErrorCode::ModeloMuyLargo);
```
Previene ataques de overflow y garantiza límites de datos.

### 3. **Verificación de Seeds**
```rust
seeds = [b"reloj", propietario.key().as_ref(), marca.as_bytes(), modelo.as_bytes()],
bump = reloj.bump
```
Valida que las PDAs sean correctas y no manipuladas.

### 4. **Errores Personalizados**
```rust
#[error_code]
pub enum ErrorCode {
    #[msg("La marca no puede tener más de 50 caracteres")]
    MarcaMuyLarga,
    #[msg("El modelo no puede tener más de 50 caracteres")]
    ModeloMuyLargo,
}
```

---

## 📊 Costos Estimados

- **Crear reloj**: ~0.00124 SOL (rent-exempt) + ~0.000005 SOL (tx fee)
- **Actualizar reloj**: ~0.000005 SOL (tx fee)
- **Eliminar reloj**: Recuperas el rent (~0.00124 SOL) - tx fee

**Nota**: Los costos pueden variar según la congestión de la red.

---

## 🎯 Casos de Uso

### 1. **Tiendas de Relojes**
Gestionar inventario de forma transparente y verificable en blockchain.

### 2. **Talleres de Reparación**
Seguimiento de piezas y disponibilidad de relojes en reparación.

### 3. **Coleccionistas**
Registro inmutable y verificable de colecciones personales.

### 4. **Distribuidores**
Control de stock descentralizado entre múltiples ubicaciones.

### 5. **Casas de Empeño**
Registro de relojes en custodia con timestamps verificables.

---

## 📝 Cómo Usar en Solana Playground

### Paso 1: Importar el Proyecto

1. Ve a [Solana Playground](https://beta.solpg.io)
2. Crea un nuevo proyecto
3. Copia el contenido de `src/lib.rs` al archivo `lib.rs` del playground
4. Copia el contenido de `client/client.ts` al archivo `client.ts` del playground

### Paso 2: Conectar Wallet

1. Click en "Connect Wallet" en la esquina superior derecha
2. Crea una nueva wallet o importa una existente
3. Asegúrate de estar en **Devnet**
4. Solicita SOL de prueba desde el faucet

### Paso 3: Build & Deploy

1. Click en el botón **"Build"** (icono de martillo)
2. Espera a que compile (puede tomar 1-2 minutos)
3. Una vez compilado, click en **"Deploy"**
4. Confirma la transacción en tu wallet
5. Copia el **Program ID** que aparece

### Paso 4: Ejecutar el Cliente

1. Ve a la pestaña `client.ts`
2. Click en el botón **"Run"** (icono de play)
3. Observa la consola para ver todas las operaciones CRUD ejecutándose

### Paso 5: Ver Resultados

La consola mostrará:
- ✅ Creación de relojes
- 📖 Lectura de datos
- 🔧 Actualizaciones de piezas
- 🔄 Cambios de disponibilidad
- ✏️ Actualizaciones completas
- 📦 Creación de múltiples relojes
- 📋 Listado completo del inventario

---

## 🐛 Solución de Problemas

### Error: "Insufficient funds"
**Solución**: Solicita SOL de prueba del faucet de Devnet.

### Error: "Account already exists"
**Solución**: El reloj con esa combinación de marca+modelo ya existe. Usa otra combinación o elimina el existente.

### Error: "You don't have the authority to upgrade this program"
**Solución**: Normal en el primer deploy. Ignora este mensaje.

### Error: "Transaction simulation failed"
**Solución**: Verifica que estés usando la wallet correcta y que tengas suficiente SOL.

---

## 📚 Estructura del Código

### `src/lib.rs` - Programa Principal (Backend)

```
├── declare_id!()                    // Program ID
├── #[program]                       // Módulo del programa
│   ├── crear_reloj()               // CREATE
│   ├── actualizar_reloj()          // UPDATE (múltiple)
│   ├── actualizar_piezas()         // UPDATE (piezas)
│   ├── cambiar_disponibilidad()    // UPDATE (disponibilidad)
│   └── eliminar_reloj()            // DELETE
├── CrearReloj                       // Context para crear
├── ActualizarReloj                  // Context para actualizar
├── EliminarReloj                    // Context para eliminar
├── Reloj                            // Estructura de datos
└── ErrorCode                        // Errores personalizados
```

### `client/client.ts` - Cliente de Prueba

```
├── main()                           // Función principal
│   ├── Crear reloj                 // Test CREATE
│   ├── Leer reloj                  // Test READ
│   ├── Actualizar piezas           // Test UPDATE
│   ├── Cambiar disponibilidad      // Test UPDATE
│   ├── Actualizar múltiple         // Test UPDATE
│   ├── Crear múltiples relojes     // Test CREATE múltiple
│   └── Listar todos los relojes    // Test READ múltiple
```

---

## 🔗 Recursos Adicionales

- [Documentación de Anchor](https://www.anchor-lang.com/)
- [Documentación de Solana](https://docs.solana.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Playground](https://beta.solpg.io)

---

## 👨‍💻 Autor

Proyecto desarrollado como backend CRUD en Solana usando Rust y Anchor Framework.

---

## 📄 Licencia

MIT License - Libre para uso educativo y comercial.

---

**¡Listo para usar en Solana Playground! 🚀**
