FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# xvfb: 가상 디스플레이 (headless:false 지원)
RUN apt-get update && apt-get install -y --no-install-recommends xvfb && rm -rf /var/lib/apt/lists/*

COPY package.json .
RUN npm install --omit=dev

RUN npx playwright install chromium

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3010
# xvfb-run이 DISPLAY를 설정하면 crawler.js가 headless:false로 동작
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1280x960x24", "node", "src/server.js"]
