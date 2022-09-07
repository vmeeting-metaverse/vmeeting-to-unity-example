# README

## Before run

### Dependencies

- Docker
- Docker Compose
- [Unity] WebGL Build => WebGL Build 시에 에러가 발생하는지 여부를 반드시 확인한다.
- [Unity] Mirror Server => 기본적으로 Unity 내부에서의 멀티플레이어 기능은 Mirror에 기반한다는 가정하에 작업을 한다.
- [Web] React
- [Communication Channel] [React-Unity-WebGL](https://github.com/jeffreylanters/react-unity-webgl)

### docker-compose 설정

1. acme 이메일 설정 => youremail 부분
2. production 시에 CA server, 각 Container의 dockerfile 경로, CHOKIDAR_USEPOLLING 변경

### .env 설정

1. DOMAIN_NAME 설정 => HTTPS가 있어야 Vmeeting 서버와 연결이 가능하기 때문에 실제로 사용이 가능한 DOMAIN_NAME이 필요하다.
2. Target Vmeeting 서비스 재확인

### DUMMY VMEETING TOKEN 설정

vmeeting API는 vmeeting JWT가 있어야 정상작동하기 때문에 해당 token을 만기시에는 재설정해주어야 한다.   
따라서, https://twon.vmeeting.kr에 가입하고 로그인하여 vmeeting jwt를 얻고 그것을 `/front/src/libs/constants.ts`에 DUMMY_JWT에 등록해야한다.

### Unity Build File 적용하기

1. **Server** 폴더와 **Build** 폴더를 각 위치에 둔다. 아래를 참고한다.

```
|-- ...
|-- front
| |-- ...
| `-- public
|   |-- ...
|   `-- Build
|     |-- Client.data.unityweb
|     |-- Client.framework.js.unityweb
|     |-- Client.loader.js
|     `-- Client.wasm.unityweb
`-- mirror
  |-- ...
  `-- Server
      |-- LinuxPlayer_s.debug
      |-- Server.x86_64
      |-- UnityPlayer_s.debug
      |-- UnityPlayer.so
      `-- Server_Data/
        `-- ...
```


### PORT 차단 여부 확인

- 80
- 443
- 8080 (Option)

## RUN

```bash
$ docker-compose up --build -d
```


## 기반한 Unity Project

https://github.com/vmeeting-metaverse/metaverse-unity-2022
