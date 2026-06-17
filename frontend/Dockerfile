FROM nginx:1.27-alpine

# Serve static prototype UI with Nginx.
COPY index.html /usr/share/nginx/html/index.html
COPY login.html /usr/share/nginx/html/login.html
COPY api-config.js /usr/share/nginx/html/api-config.js
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY assets /usr/share/nginx/html/assets
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
