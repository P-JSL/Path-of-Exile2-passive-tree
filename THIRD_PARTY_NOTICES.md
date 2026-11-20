# 한국어 게임 용어 데이터 출처

- 패시브 이름의 영한 대조 데이터: [Dev-Jahn/poe2-gpt](https://github.com/Dev-Jahn/poe2-gpt) (2026-09-08 스냅샷; [원본 데이터](https://poe2db.tw/kr/))
- 해당 데이터는 공개 PoE2DB의 영문/한국어 명칭을 대응한 게임 용어 자료이며 게임 저작물의 권리는 각 원권리자에게 있습니다.
- 일부 패시브 이름과 통계 문구는 검증된 한국어 대응이 없어 영문을 유지합니다. 추정 번역을 공식 번역으로 표시하지 않습니다.
- 숫자 또는 패시브 ID, 게임 내 연결/배분 로직은 번역 과정에서 변경하지 않습니다.

## 추가 한국어 게임 번역 데이터

- [PoE2DB 한국어 패시브 트리](https://poe2db.tw/kr/passive-skill-tree/): 배포 시점에 영문/한국어 노드 데이터를 교차 대조하여 같은 스킬 ID 및 원문이 확인되는 항목의 명칭과 효과를 가져옵니다.
- [PoE2DB 한국어 아틀라스 / 제네시스 데이터](https://poe2db.tw/kr/): 동일한 방식으로 아틀라스 및 제네시스 트리 번역을 검증합니다.
- [PobTools-zh 한국어 게임 번역](https://github.com/Hsiung-Shao/PobTools-zh/tree/main/pob-zh-engine/dist/Data/poe2/ko-KR): 한국어 문장 템플릿과 수치 치환의 추가 자료입니다. 이 자료의 한국어 게임 문자열은 Grinding Gear Games의 원저작물에 기반합니다.
- 번역 사전은 GitHub Actions에서 빌드 아티팩트로만 생성하며, 웹 브라우저에서는 제3자 번역 서버와 통신하지 않습니다.
- 영문 원문과 비교하여 ID 또는 수치/효과 대응이 불확실한 항목은 추측해서 번역하지 않습니다. 사용자 지정 능력치 선택은 원본 패시브 수치나 식별자를 변경하지 않습니다.

## 스킬 용어 메모 출처

- [PoE2DB 한국어 용어집](https://poe2db.tw/kr/Keywords) 및 [영어 용어집](https://poe2db.tw/us/Keywords)의 공개 설명을 배포 시 읽어 정적 사전으로 생성합니다. 화면의 메모 하단은 원문 용어 페이지로 연결합니다.
- 게임 용어 및 게임 설명의 지식재산권은 Grinding Gear Games를 비롯한 원권리자에게 있습니다. 게임 내 공식 효과 변경을 의미하거나 공식 서비스임을 주장하지 않습니다.
- 원본 용어의 식별자를 가진 스킬 텍스트만 클릭 가능한 용어로 표시합니다. 메모 본문은 텍스트로만 렌더링하고, HTML 코드로 실행하지 않습니다.
- 용어집 구조 변경이나 외부 제공처 장애로 설명 사전을 만들 수 없는 경우 내장된 간단한 안내문과 출처 링크를 사용합니다.

## 공식 게임 스프라이트 자료

- [Grinding Gear Games / poe2-skilltree-export](https://github.com/grindinggear/poe2-skilltree-export): 고정된 커밋 `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`의 `skills.webp`, `frame.webp`, 클래스 배경 WebP 및 이에 대응하는 JSON 프레임 좌표를 사용합니다.
- 빌드 시 `scripts/bundle-tree-art.mjs`가 해당 원본 파일을 오프라인 배포용 `data/visual`로 복사합니다. 브라우저는 원본 서버에서 실시간으로 이미지를 내려받지 않습니다.
- Path of Exile 2의 게임 아트·아이콘·캐릭터 이미지와 관련 상표의 권리는 Grinding Gear Games 및 해당 원권리자에게 있습니다. 본 도구는 비공식 팬 제작 프로젝트입니다.
- 일부 아이콘의 GGG 원본 버전이 트리 데이터와 일치하지 않거나 스프라이트에 포함되지 않을 경우 벡터 대체 표시를 사용합니다. 게임 아트나 다른 사이트의 화면 디자인을 이 프로젝트 자체 저작물로 주장하지 않습니다.
