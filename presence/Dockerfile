# Presence service for kzhqin.com. Node stdlib only: no npm install, no build step.
FROM node:22-alpine
WORKDIR /app
COPY state.mjs app.mjs server.mjs ./
USER node
ENV PORT=8090
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --start-interval=2s \
  CMD wget -qO- http://127.0.0.1:8090/presence/healthz >/dev/null || exit 1
CMD ["node", "server.mjs"]
