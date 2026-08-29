import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  cacheLife: {
    hourly: {
      stale: 300, // 5 minutos en cache de cliente
      revalidate: 3600, // 1 hora (3600 segundos) para volver a revalidar la request
      expire: 86400, // 1 día de expiración
    },
    default: {
      stale: 300,
      revalidate: 3600, // 1 hora por defecto
      expire: 86400,
    },
  },
};

export default nextConfig;
