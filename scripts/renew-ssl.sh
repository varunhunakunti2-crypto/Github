#!/bin/sh
# SSL cert renewal script for Let's Encrypt / Certbot self-hosted deployments
echo "Running Let's Encrypt Certbot Certificate Renewal Check..."

# Trigger Certbot renewal check.
# If a certificate is renewed, the post-hook reloads Nginx configuration inside the container to apply it.
certbot renew --webroot -w /var/www/certbot --post-hook "docker exec gitforge-nginx nginx -s reload"

echo "Certbot renewal check completed."
