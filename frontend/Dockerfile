FROM nginx:1.27-alpine

# Serve static prototype UI with Nginx.
COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
