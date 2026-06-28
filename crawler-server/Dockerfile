FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

# xvfb: 가상 디스플레이 (headless:false 지원)
RUN apt-get update && apt-get install -y --no-install-recommends xvfb && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# patchright용 실제 Google Chrome 설치 (channel:'chrome' — Akamai 통과율 핵심)
RUN npx patchright install chrome || npx playwright install chrome

COPY src ./src
COPY start.sh ./start.sh
RUN chmod +x start.sh

ENV NODE_ENV=production
ENV PORT=3010
CMD ["/bin/sh", "start.sh"]
