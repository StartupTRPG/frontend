# 베이스 이미지로 공식 Node.js 이미지를 사용합니다.
FROM node:20

# 작업 디렉토리 생성 및 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# 소스 코드 전체 복사
COPY . .

# 빌드 실행
RUN npm run build

# 5173 포트 사용 (Vite 기본 포트)
EXPOSE 5173

# 컨테이너 시작 시 개발 서버 실행
CMD ["npm", "run", "dev"]
