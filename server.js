import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Configurar encabezados de seguridad y caché para assets estáticos
app.use((req, res, next) => {
  // WebGPU no requiere COOP/COEP a menos que uses SharedArrayBuffer, pero es buena práctica prepararlo
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Servir la carpeta public con soporte para MIME types WebGPU (.wgsl, .js, etc.)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.wgsl')) {
      res.setHeader('Content-Type', 'text/plain');
    }
  }
}));

// Endpoint de Health Check para Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'worlio-webgpu',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Ruta fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
const server = app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`🎮 Worlio - WebGPU 3D Engine`);
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
  console.log(`📡 Escuchando en ${HOST}:${PORT} (Railway Ready)`);
  console.log(`=========================================`);
});

// Cierre ordenado para contenedores Railway/Docker
const shutdown = () => {
  console.log('\n🛑 Cerrando servidor Worlio...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
