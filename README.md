# ArchOn API
- 프론트엔드 개발을 위해 만든 간단한 콘텐츠 & 회원 관리 API

## 기능
- 회원 CRUD 
- 토픽 CRUD
- 콘텐츠 기사 CRUD
- 주요 기사 선정 CRUD
- 인증 (이메일 체크, 로그인, 리프레시 토큰 발급)

## 라이브러리 및 기술
- NodeJS & Express
- MariaDB
- 로깅 (pino, pino-http)
- 보안
  - DOS 공격 방지 (express-rate-limit)
  - XSS 대비 (xss)
  - 보안 적용된 HTTP 헤더 (helmet)
  - 파라미터 오염 방지 (hpp)
  - AES256 암호화 for HTTP 통신, bcrypt 암호화
  - 인증/인가 로직 적용
  - JWT 토큰 적용 (access & refresh 토큰)
    - HttpOnly 쿠키로 refresh 토큰 보내기
  - 유효성 체크
- Postman

## 개발 여담
- 프론트 개발을 위해 간단하게 시작한다고 했는데 하다 보니 이것 저것 신경 쓰게 된 프로젝트
- NestJS만 사용하다가 Express로만 개발하려니 프레임워크의 강력함과 기본 라이브러리의 유연함의 상충 관계를 새삼 깨닫는다
  - Express에 대해 더 잘 알게 됐다. 역시 근본을 공부해야.
  - 특히 시간상 모델링 없이 SQL 문장만 써서 다 짰는데 파싱이나 유효성 검사가 까다로워졌다. 끝도 없어서 중요한 것만 했다.
  - 타입스크립트 또한 시간을 늘어지게 하는 결정적 원인이었다. 이정도 사이즈는 JS로도 충분할 듯 하다.
  - 테이블 간 관계나 cascading 설정 등은 SQL만 보면 되니까 훨씬 직관적이고 디버깅이 쉬웠다. 역시 근본을 공부해야2
  - 그래도 백엔드는 무조건 강력한 프레임워크 패키지에 의존해야 한다고 느낌
- 개발하면서 보안 쪽을 많이 찾아보게 됐는데 SQL 인젝션, XSS, CSRF 등에 대해 더 많이 알게 됐다. 간단하게 만들다 보니 요청 날릴 때 데이터 오염으로 인한 피해가 더 체감되는 듯 하다.

## 참고 자료
- Udemy 강의 (Node.js, Express, MongoDB & More: The Complete Bootcamp 2024)의 보안 세팅 및 에러 리팩토링 부분
- email 유효성 체크 (https://regexr.com/3e48o)