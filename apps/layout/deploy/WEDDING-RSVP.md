# layout.dae-da.com 배포 (통합됨)

Bonelli Layout은 wedding_rsvp 모노레포 `apps/layout` 으로 이동했습니다.

배포는 repo root의 `deploy/` 를 사용하세요:

```bash
cd ../../deploy
./deploy.sh --build layout
```

nginx: `deploy/nginx/layout.dae-da.com.conf` → `layout:80`

자세히: `deploy/README.md` §2b
