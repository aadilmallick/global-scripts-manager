# Deno 2 Dockerfile for CLI tool
FROM denoland/deno:2.3.5

WORKDIR /app

# Copy project files
COPY . .

# Optionally cache dependencies (uncomment if needed)
RUN deno cache main.ts

# Entrypoint (CMD can be overridden by docker-compose)
CMD ["deno", "run", "start"] 