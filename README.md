# SOPHRON — σώφρων
> Mente equilibrada. Tiempo controlado.

## Instalación

### Requisitos
- Node.js 18+
- npm

### Pasos

```bash
# 1. Entrar a la carpeta
cd sophron

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm start

# 4. Generar ejecutable .exe para Windows
npm run build
```

El ejecutable se genera en la carpeta `dist/`.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | Vista general con bento grid |
| Tareas | Checklist con prioridades y categorías |
| Agenda | Calendario mensual con eventos |
| Gastos | Registro de ingresos y egresos |
| Flujo | Diagramas de flujo arrastrables |
| Tablero | Tablero de corcho con fotos e hilo rojo |

## Datos

Los datos se guardan automáticamente en:
- **Windows:** `%APPDATA%\sophron\sophron-data.json`

Puedes exportar un backup desde Ajustes → Exportar JSON.

## Atajos

- **Doble clic** en nodo de flujo → renombrar
- **Clic derecho** en nodo de flujo → eliminar
- **Conectar** → activa modo hilo, clic en origen y luego destino
