import path from 'node:path';
import { fileURLToPath } from 'node:url';

const nextConfig = {
  devIndicators: false,
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
};

export default nextConfig;
