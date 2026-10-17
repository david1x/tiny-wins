# No dependencies, so no install step — just the runtime and the script.
FROM node:20-alpine

WORKDIR /app
COPY server.js ./

ENV PORT=3000 DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

EXPOSE 3000
USER node
CMD ["node", "server.js"]
