export const minioConfig = { endpoint: process.env.MINIO_ENDPOINT, port: parseInt(process.env.MINIO_PORT || '9000', 10) };
