# Exile Tree — Path of Exile 2 Passive & Ascendancy Tree

[한국어 설명]

PoE2의 **실제 패시브 트리 데이터**를 브라우저에서 확인하고 계획할 수 있는 정적 웹사이트입니다. PoE2DB처럼 패시브 노드의 위치·연결선·툴팁·직업 및 전직·아틀라스·제네시스 트리 전환을 지원합니다. 개발 과정에서 임의의 패시브를 만들지 않으며, 게임 데이터 추출본을 저장소에 포함합니다.

## 바로 사용하기

- **웹사이트:** https://p-jsl.github.io/Path-of-Exile2-passive-tree/ (저장소의 GitHub Pages를 활성화한 후)
- **소스:** https://github.com/P-JSL/Path-of-Exile2-passive-tree
- 로컬: `python3 -m http.server 8000` 후 `http://localhost:8000`으로 접속 (단순히 HTML 파일을 `file://`로 열면 데이터 읽기가 차단됩니다).

### 기능

- 8개 기본 직업과 공개 추출 데이터에 존재하는 22개 전직의 노드/연결선/효과 전체 표시
- 독립된 **아틀라스 트리**와 **제네시스 트리**도 원본 추출 데이터로 제공
- 일반 패시브와 전직 패시브 트리 탭, 각 기본 직업 및 전직 변경
- 실제 스킬 ID를 이용한 노드 검색, 효과 설명, 자동 연결 경로 계획 및 회수
- 오라클의 `The Unseen Path` 선행 조건과 전용 197개 패시브 노드 표시
- PC 마우스휠·드래그, iPhone Safari 한 손가락 이동·두 손가락 핀치 확대·축소
- 로컬 저장, 링크 공유, 모바일 전용 메뉴 및 노드 상세 패널
- GitHub Pages용 정적 사이트, 별도 프레임워크·CDN 런타임 의존성 없음

### 데이터 출처 및 범위

- `data/tree.json`: [Path of Building Community for PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/dev/src/TreeData/0_5/tree.json)의 **0_5** 버전 노드·연결 데이터, GGG [PoE2 공식 패시브 트리 내보내기](https://github.com/grindinggear/poe2-skilltree-export) 기반.
- `data/atlas.json` 및 `data/genesis.json`: [RePoE PoE2 추출 데이터](https://github.com/repoe-fork/poe2/tree/master/data/passive_skill_trees)의 `Atlas.json` / `BrequelTree.json` 게임 데이터 스냅샷. 전용 adapter로 원본 좌표와 그래프 링크를 렌더링합니다.
- 패시브 좌표는 그룹 좌표와 공식 orbit 반경·각도 데이터로 정확히 계산합니다. 노드 이름과 효과는 원본 텍스트 그대로입니다.
- 화면 디자인과 Canvas 구현은 이 저장소의 자체 구현이며 PoE2DB 웹페이지 소스·디자인 에셋을 복제하지 않습니다. GGG의 게임 아이콘 원본은 포함되지 않으며 패시브 외곽 프레임은 자체 제작한 도형입니다.
- 전직 목록에는 데이터에 실제 노드가 있는 전직만 표시합니다. 원본 데이터에 메타데이터만 있는 `Abyssal Lich`는 잘못된 빈 트리를 보여주지 않도록 제외됩니다.
- **아틀라스·제네시스**는 별도 추출본에서 제공하며, 시각화와 연결형 계획은 지원합니다. 다른 시즌의 모든 특수·과거 트리까지 포함하는 것은 아닙니다.
- 일부 제네시스 노드는 원본에 사람이 읽는 효과 문구가 없어 원본 내부 스탯 키/수치가 대신 표시됩니다.
- GGG의 실제 DDS 노드 아이콘/배경 아트는 포함하지 않으며 자체 벡터 도형을 사용합니다.
- 전직/패시브 계획은 설명용이며 실제 게임에 자동 적용되지 않습니다. 무기 세트별 포인트, 전직 전용 선택 제약, 다중 선택 등 모든 게임 내 배분 규칙의 완전한 시뮬레이터는 아닙니다.

### 검증

```sh
node --test tests/*.test.mjs
node scripts/validate.mjs
```

검증은 데이터의 전체 노드 수, 전직/클래스 존재 여부, 노드 ID 연결의 무결성, 오라클 데이터 존재 여부와 경로 탐색/회수 로직을 확인합니다.

### GitHub Pages 배포

기본 브랜치 `main`에 커밋하면 `.github/workflows/pages.yml`이 정적 사이트를 검증하고 배포합니다. **최초에는** GitHub 저장소의 `Settings → Pages → Build and deployment → Source`를 **GitHub Actions**로 설정해야 합니다. 배포가 완료되면 위 웹사이트 URL로 접속할 수 있습니다.

### 업데이트

패치 후 `data/tree.json`을 검증된 PoB 2 게임 버전의 JSON으로 교체하고 `scripts/validate.mjs`를 실행하세요. 원본 노드 ID·스탯·링크를 임의로 편집하지 않습니다. 업데이트 전후 실제 최신 버전과 모델 호환을 별도로 확인해야 합니다.

### 참고 및 권리

Path of Exile 2 © Grinding Gear Games. 이 사이트는 비공식 팬 제작 도구이며 GGG 및 PoE2DB와 제휴 관계가 없습니다. GGG와 원본 데이터 제공자의 사용 조건을 준수하세요. 사이트 자체 구현 코드는 게임 원본 리소스와 별개입니다.
