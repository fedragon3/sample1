/*
 * 기질 및 성격 자가탐색 문항 (TCI 7차원 · 28개 하위척도 이론 기반)
 *
 * 주의: 본 문항은 Cloninger의 TCI(Temperament and Character Inventory)에서
 * 공개된 "차원·하위척도 이론 구조"에 근거하여 독자적으로 작성한 자가탐색용
 * 문항입니다. 정식 TCI 검사 문항이 아니며, 임상적 진단 목적으로 사용할 수 없습니다.
 *
 * 차원(dimension)
 *  - NS 자극추구 / HA 위험회피 / RD 사회적 민감성 / PS 인내력
 *  - SD 자율성 / CO 연대감 / ST 자기초월
 * 각 차원은 4개 하위척도(facet)로 구성되며, 하위척도별 5문항(총 140문항).
 *
 * 응답(묵종) 편향 보정:
 *  - 각 차원은 정방향 10문항 / 역방향(reverse) 10문항으로 균형을 맞췄고,
 *  - 간단 테스트(short:true, 하위척도별 1문항·총 28문항)도 정방향 14 / 역방향 14로
 *    구성해, 무조건 한쪽으로만 응답하면 모든 점수가 50%로 수렴하도록 설계했습니다.
 *  - reverse:true 문항은 역채점(동의할수록 점수가 낮아짐)합니다.
 */

const DIMENSIONS = {
  NS: { name: "자극추구", en: "Novelty Seeking", color: "#e05a47", type: "기질",
    high: "새로운 경험과 자극을 적극적으로 찾고 호기심이 많으며, 즉흥적이고 변화를 즐깁니다.",
    low: "익숙하고 안정된 환경을 선호하며, 신중하고 절제된 태도로 계획에 따라 행동합니다." },
  HA: { name: "위험회피", en: "Harm Avoidance", color: "#4a7bb5", type: "기질",
    high: "위험과 실패 가능성에 민감해 조심스럽고, 걱정이 많으며 낯선 상황에서 긴장합니다.",
    low: "낙천적이고 대담하며 불확실함에도 위축되지 않고, 활력이 넘치고 사교적입니다." },
  RD: { name: "사회적 민감성", en: "Reward Dependence", color: "#5aa17a", type: "기질",
    high: "타인의 정서와 인정에 민감하고 정이 많으며, 관계와 유대를 소중히 여깁니다.",
    low: "타인의 평가에 덜 좌우되고 독립적이며, 실용적이고 현실적인 태도를 유지합니다." },
  PS: { name: "인내력", en: "Persistence", color: "#d69a2d", type: "기질",
    high: "좌절과 피로에도 끈기 있게 노력하며, 성실하고 성취와 완성도를 추구합니다.",
    low: "상황에 유연하게 대응하며, 성과가 더디거나 보상이 적으면 방향을 쉽게 바꿉니다." },
  SD: { name: "자율성", en: "Self-Directedness", color: "#8a63c4", type: "성격",
    high: "자신의 목표와 가치에 따라 책임감 있게 행동하고, 자기수용적이며 주도적입니다.",
    low: "목표 설정이나 자기 통제가 어렵게 느껴질 수 있고, 외부 요인에 영향을 많이 받습니다." },
  CO: { name: "연대감", en: "Cooperativeness", color: "#3d9ba3", type: "성격",
    high: "타인을 존중·공감하며 협력적이고, 관용적이며 돕는 것을 소중히 여깁니다.",
    low: "자신의 관점과 이익을 우선하는 편이며, 협력보다 독자적 판단을 선호합니다." },
  ST: { name: "자기초월", en: "Self-Transcendence", color: "#c45d8f", type: "성격",
    high: "자신을 더 큰 전체의 일부로 느끼고 영적·이상적 가치에 개방적이며 몰입을 중시합니다.",
    low: "현실적·논리적이며 통제 가능하고 구체적인 것에 집중하는 실용주의적 태도를 지닙니다." },
};

// 하위척도(facet) 정의: 코드 -> { dim, name, desc(높을 때 의미) }
const FACETS = {
  NS1: { dim: "NS", name: "탐색적 흥분", desc: "새롭고 낯선 것에 이끌려 적극적으로 탐색함" },
  NS2: { dim: "NS", name: "충동성", desc: "깊이 따지기보다 순간의 끌림에 따라 결정함" },
  NS3: { dim: "NS", name: "열정적 몰두", desc: "좋아하는 것에 시간·자원을 아낌없이 쏟음" },
  NS4: { dim: "NS", name: "자유분방", desc: "규칙과 틀보다 자유로운 방식을 선호함" },

  HA1: { dim: "HA", name: "예기불안", desc: "앞일을 미리 걱정하고 긴장함" },
  HA2: { dim: "HA", name: "불확실성 회피", desc: "예측 어려운 상황을 불편해하고 피함" },
  HA3: { dim: "HA", name: "수줍음", desc: "낯선 사람·상황에서 위축됨" },
  HA4: { dim: "HA", name: "쉽게 지침", desc: "스트레스에 쉽게 소진되고 회복이 더딤" },

  RD1: { dim: "RD", name: "정서적 감수성", desc: "감정에 예민하게 반응하고 쉽게 뭉클해함" },
  RD2: { dim: "RD", name: "온정·개방성", desc: "따뜻하게 마음을 나누는 관계를 추구함" },
  RD3: { dim: "RD", name: "애착", desc: "소중한 사람과의 유대를 깊이 중시함" },
  RD4: { dim: "RD", name: "인정 추구", desc: "타인의 인정과 좋은 평가에서 힘을 얻음" },

  PS1: { dim: "PS", name: "근면", desc: "미루지 않고 부지런히 노력함" },
  PS2: { dim: "PS", name: "끈기", desc: "어려움에도 포기하지 않고 지속함" },
  PS3: { dim: "PS", name: "성취야망", desc: "더 나은 성과와 높은 목표를 추구함" },
  PS4: { dim: "PS", name: "완벽주의", desc: "흠 없는 결과를 위해 끝까지 다듬음" },

  SD1: { dim: "SD", name: "책임감", desc: "자기 선택의 결과를 스스로 책임짐" },
  SD2: { dim: "SD", name: "목적의식", desc: "삶의 뚜렷한 목표와 방향을 지님" },
  SD3: { dim: "SD", name: "유능감", desc: "문제를 스스로 해결할 수 있다는 믿음" },
  SD4: { dim: "SD", name: "자기수용", desc: "있는 그대로의 자신을 받아들임" },

  CO1: { dim: "CO", name: "타인수용", desc: "나와 다른 사람을 존중하고 받아들임" },
  CO2: { dim: "CO", name: "공감", desc: "타인의 감정을 함께 느끼고 헤아림" },
  CO3: { dim: "CO", name: "이타성", desc: "기꺼이 남을 돕고 베풂" },
  CO4: { dim: "CO", name: "연민·관대함", desc: "용서하고 약한 처지를 배려함" },

  ST1: { dim: "ST", name: "창조적 몰입", desc: "자신을 잊을 만큼 무언가에 몰입함" },
  ST2: { dim: "ST", name: "초월적 일치감", desc: "자신을 더 큰 전체의 일부로 느낌" },
  ST3: { dim: "ST", name: "영적 수용", desc: "설명되지 않는 영적 차원에 열려 있음" },
  ST4: { dim: "ST", name: "이상주의", desc: "물질보다 의미와 이상을 추구함" },
};

// facet별 5문항. 차원마다 정/역방향 10:10, 간단 테스트(short) 정/역 14:14로 균형.
const QUESTIONS = [
  // ===== NS 자극추구 =====
  { f: "NS1", t: "처음 가보는 곳이나 안 해본 활동을 만나면 마음이 설렌다.", reverse: false, short: true },
  { f: "NS1", t: "새로운 것을 배우고 시도하는 과정 자체가 즐겁다.", reverse: false },
  { f: "NS1", t: "호기심이 생기면 직접 해봐야 직성이 풀린다.", reverse: false },
  { f: "NS1", t: "익숙한 방식대로 하는 것이 마음이 편하다.", reverse: true },
  { f: "NS1", t: "새로운 것에는 별로 관심이 가지 않는다.", reverse: true },

  { f: "NS2", t: "마음이 끌리면 오래 고민하지 않고 바로 결정한다.", reverse: false, short: true },
  { f: "NS2", t: "그때그때의 기분에 따라 움직일 때가 많다.", reverse: false },
  { f: "NS2", t: "무언가를 결정하기 전에 충분히 따져보는 편이다.", reverse: true },
  { f: "NS2", t: "하고 싶은 일이 생겨도 한 박자 참고 생각한다.", reverse: true },
  { f: "NS2", t: "감정보다는 이성으로 판단하려고 한다.", reverse: true },

  { f: "NS3", t: "무엇이든 적당한 선에서 절제하는 편이다.", reverse: true, short: true },
  { f: "NS3", t: "갖고 싶은 것이 생기면 돈이나 시간을 아끼지 않는다.", reverse: false },
  { f: "NS3", t: "좋아하는 일에는 에너지를 아낌없이 쏟는다.", reverse: false },
  { f: "NS3", t: "한번 빠지면 지나칠 만큼 몰두하곤 한다.", reverse: false },
  { f: "NS3", t: "늘 계획을 세워 아껴 쓰려고 한다.", reverse: true },

  { f: "NS4", t: "질서와 규칙을 지키는 것이 중요하다고 생각한다.", reverse: true, short: true },
  { f: "NS4", t: "정해진 틀에 얽매이는 것이 답답하게 느껴진다.", reverse: false },
  { f: "NS4", t: "형식이나 절차보다 내 방식대로 하는 편이 좋다.", reverse: false },
  { f: "NS4", t: "누가 정해준 순서를 따르는 편이 마음이 놓인다.", reverse: true },
  { f: "NS4", t: "체계가 잡힌 환경에서 일이 더 잘된다.", reverse: true },

  // ===== HA 위험회피 =====
  { f: "HA1", t: "앞으로 일어날 일을 미리 걱정하며 마음 졸일 때가 많다.", reverse: false, short: true },
  { f: "HA1", t: "나쁜 결과가 자꾸 떠올라 마음을 놓기 어렵다.", reverse: false },
  { f: "HA1", t: "사소한 일에도 최악의 상황을 상상하곤 한다.", reverse: false },
  { f: "HA1", t: "웬만한 일은 잘될 거라고 낙관하는 편이다.", reverse: true },
  { f: "HA1", t: "걱정하기보다 일단 부딪혀 보자는 쪽이다.", reverse: true },

  { f: "HA2", t: "결과를 예측하기 어려운 일은 되도록 피하고 싶다.", reverse: false, short: true },
  { f: "HA2", t: "익숙하지 않은 상황에 놓이면 마음이 불편하다.", reverse: false },
  { f: "HA2", t: "상황이 불확실해도 크게 개의치 않는다.", reverse: true },
  { f: "HA2", t: "확실하지 않은 선택 앞에서도 비교적 쉽게 결정한다.", reverse: true },
  { f: "HA2", t: "예상하지 못한 변화도 흥미롭게 받아들인다.", reverse: true },

  { f: "HA3", t: "누구와도 금방 편하게 어울리는 편이다.", reverse: true, short: true },
  { f: "HA3", t: "낯선 사람들과 있으면 긴장되고 말수가 줄어든다.", reverse: false },
  { f: "HA3", t: "처음 보는 사람에게 먼저 다가가기가 어렵다.", reverse: false },
  { f: "HA3", t: "여러 사람 앞에 나서는 상황이 부담스럽다.", reverse: false },
  { f: "HA3", t: "낯선 자리에서도 자연스럽게 대화를 이끈다.", reverse: true },

  { f: "HA4", t: "웬만한 일에는 지치지 않고 활력이 넘친다.", reverse: true, short: true },
  { f: "HA4", t: "조금만 무리해도 금방 지치고 기운이 빠진다.", reverse: false },
  { f: "HA4", t: "일이 몰리면 쉽게 소진되는 느낌이 든다.", reverse: false },
  { f: "HA4", t: "바쁜 하루를 보내도 금방 기운을 되찾는다.", reverse: true },
  { f: "HA4", t: "스트레스를 받아도 비교적 빨리 회복한다.", reverse: true },

  // ===== RD 사회적 민감성 =====
  { f: "RD1", t: "감동적인 이야기나 장면에 쉽게 마음이 뭉클해진다.", reverse: false, short: true },
  { f: "RD1", t: "다른 사람의 감정 변화를 예민하게 알아차린다.", reverse: false },
  { f: "RD1", t: "슬픈 소식을 들으면 한동안 마음이 쓰인다.", reverse: false },
  { f: "RD1", t: "감정에 크게 휘둘리지 않고 담담한 편이다.", reverse: true },
  { f: "RD1", t: "웬만한 일에는 마음이 잘 흔들리지 않는다.", reverse: true },

  { f: "RD2", t: "따뜻한 정을 나누는 관계를 소중하게 여긴다.", reverse: false, short: true },
  { f: "RD2", t: "가까운 사람에게는 애정 표현을 아끼지 않는다.", reverse: false },
  { f: "RD2", t: "사람들과 어느 정도 거리를 두는 편이 편하다.", reverse: true },
  { f: "RD2", t: "속마음은 좀처럼 잘 드러내지 않는다.", reverse: true },
  { f: "RD2", t: "깊이 얽히기보다 담백한 관계가 편하다.", reverse: true },

  { f: "RD3", t: "혼자 있어도 외로움을 잘 느끼지 않는다.", reverse: true, short: true },
  { f: "RD3", t: "가까운 사람과 오래 떨어져 있으면 몹시 그립다.", reverse: false },
  { f: "RD3", t: "소중한 사람과의 유대가 내 삶에서 매우 중요하다.", reverse: false },
  { f: "RD3", t: "이별이나 헤어짐에 마음이 크게 흔들린다.", reverse: false },
  { f: "RD3", t: "관계가 멀어져도 비교적 담담하게 받아들인다.", reverse: true },

  { f: "RD4", t: "남의 평가와 상관없이 내 기준대로 행동한다.", reverse: true, short: true },
  { f: "RD4", t: "다른 사람에게 인정과 칭찬을 받으면 큰 힘이 난다.", reverse: false },
  { f: "RD4", t: "누군가 나를 알아봐 주기를 바라는 마음이 있다.", reverse: false },
  { f: "RD4", t: "좋은 평가를 받지 못해도 크게 개의치 않는다.", reverse: true },
  { f: "RD4", t: "남들이 어떻게 보든 별로 신경 쓰지 않는다.", reverse: true },

  // ===== PS 인내력 =====
  { f: "PS1", t: "해야 할 일이 있으면 미루지 않고 부지런히 한다.", reverse: false, short: true },
  { f: "PS1", t: "힘든 일도 기꺼이 노력을 들여 해낸다.", reverse: false },
  { f: "PS1", t: "꾸준하고 성실하게 하는 데서 보람을 느낀다.", reverse: false },
  { f: "PS1", t: "하기 싫은 일은 자꾸 미루게 된다.", reverse: true },
  { f: "PS1", t: "되도록 편하게 할 수 있는 방법부터 찾는다.", reverse: true },

  { f: "PS2", t: "한번 시작한 일은 어려워도 끝까지 해낸다.", reverse: false, short: true },
  { f: "PS2", t: "장애물이 생겨도 포기하지 않고 밀고 나간다.", reverse: false },
  { f: "PS2", t: "잘 풀리지 않으면 금방 흥미를 잃고 그만둔다.", reverse: true },
  { f: "PS2", t: "벽에 부딪히면 다른 쉬운 길을 찾는 편이다.", reverse: true },
  { f: "PS2", t: "실패를 겪으면 다시 도전할 마음이 잘 나지 않는다.", reverse: true },

  { f: "PS3", t: "지금 정도 수준이면 충분하다고 여기는 편이다.", reverse: true, short: true },
  { f: "PS3", t: "남보다 더 나은 성과를 내고 싶은 욕심이 있다.", reverse: false },
  { f: "PS3", t: "높은 목표를 세우고 그것을 이루려 애쓴다.", reverse: false },
  { f: "PS3", t: "더 인정받는 성취를 위해 기꺼이 노력한다.", reverse: false },
  { f: "PS3", t: "굳이 남들과 경쟁하고 싶지는 않다.", reverse: true },

  { f: "PS4", t: "완벽하지 않아도 충분히 괜찮다고 여긴다.", reverse: true, short: true },
  { f: "PS4", t: "맡은 일은 흠 없이 완벽하게 마무리하고 싶다.", reverse: false },
  { f: "PS4", t: "작은 실수도 그냥 넘기지 못하고 다시 손본다.", reverse: false },
  { f: "PS4", t: "세세한 부분보다 전체적인 완성을 더 본다.", reverse: true },
  { f: "PS4", t: "기준에 조금 못 미쳐도 크게 신경 쓰지 않는다.", reverse: true },

  // ===== SD 자율성 =====
  { f: "SD1", t: "내 선택의 결과는 내가 책임진다고 생각한다.", reverse: false, short: true },
  { f: "SD1", t: "문제가 생기면 남 탓보다 내가 할 일을 먼저 찾는다.", reverse: false },
  { f: "SD1", t: "맡은 역할에 대한 책임은 끝까지 진다.", reverse: false },
  { f: "SD1", t: "일이 잘못되면 상황이나 남 탓을 하게 된다.", reverse: true },
  { f: "SD1", t: "내 삶이 내 뜻대로 되지 않는다고 느낄 때가 많다.", reverse: true },

  { f: "SD2", t: "나는 삶에서 이루고 싶은 분명한 목표가 있다.", reverse: false, short: true },
  { f: "SD2", t: "무엇을 위해 사는지 방향이 뚜렷한 편이다.", reverse: false },
  { f: "SD2", t: "내가 무엇을 원하는지 잘 모를 때가 많다.", reverse: true },
  { f: "SD2", t: "뚜렷한 목표 없이 그때그때 살아가는 편이다.", reverse: true },
  { f: "SD2", t: "먼 미래의 목표보다 당장의 하루가 우선이다.", reverse: true },

  { f: "SD3", t: "중요한 일 앞에서 자신감이 부족할 때가 많다.", reverse: true, short: true },
  { f: "SD3", t: "어려운 문제도 스스로 해결할 수 있다고 믿는다.", reverse: false },
  { f: "SD3", t: "필요한 일을 해낼 능력이 내게 있다고 느낀다.", reverse: false },
  { f: "SD3", t: "낯선 과제도 방법을 찾아 잘 대처하는 편이다.", reverse: false },
  { f: "SD3", t: "내 힘으로는 어쩔 수 없다고 느낄 때가 많다.", reverse: true },

  { f: "SD4", t: "내 모습이 마음에 들지 않을 때가 잦다.", reverse: true, short: true },
  { f: "SD4", t: "나는 지금의 나를 있는 그대로 받아들인다.", reverse: false },
  { f: "SD4", t: "내 장점도 단점도 인정하며 편안하게 여긴다.", reverse: false },
  { f: "SD4", t: "남과 비교하며 내 부족함이 자주 눈에 띈다.", reverse: true },
  { f: "SD4", t: "다른 사람처럼 되지 못한 것이 아쉽다.", reverse: true },

  // ===== CO 연대감 =====
  { f: "CO1", t: "나와 생각이나 방식이 다른 사람도 존중하려 한다.", reverse: false, short: true },
  { f: "CO1", t: "사람마다 다를 수 있다는 것을 자연스럽게 받아들인다.", reverse: false },
  { f: "CO1", t: "편견 없이 다양한 사람을 대하려고 노력한다.", reverse: false },
  { f: "CO1", t: "나와 다른 사람은 이해하기 어렵게 느껴진다.", reverse: true },
  { f: "CO1", t: "내 기준에 맞지 않는 사람과는 거리를 둔다.", reverse: true },

  { f: "CO2", t: "다른 사람의 처지에서 그 마음을 헤아리려 한다.", reverse: false, short: true },
  { f: "CO2", t: "상대가 느끼는 감정이 내게도 전해지는 편이다.", reverse: false },
  { f: "CO2", t: "남의 감정까지 신경 쓰는 것은 피곤하게 느껴진다.", reverse: true },
  { f: "CO2", t: "다른 사람의 사정에는 별로 관심이 가지 않는다.", reverse: true },
  { f: "CO2", t: "누가 힘들어해도 내 일이 아니면 무덤덤하다.", reverse: true },

  { f: "CO3", t: "내 일이 우선이라 남을 챙길 여유가 별로 없다.", reverse: true, short: true },
  { f: "CO3", t: "도움이 필요한 사람을 보면 기꺼이 나선다.", reverse: false },
  { f: "CO3", t: "내가 조금 손해를 보더라도 남을 돕곤 한다.", reverse: false },
  { f: "CO3", t: "다른 사람에게 베푸는 데서 보람을 느낀다.", reverse: false },
  { f: "CO3", t: "대가 없이 남을 돕는 것은 손해라고 생각한다.", reverse: true },

  { f: "CO4", t: "잘못한 사람은 반드시 대가를 치러야 한다고 본다.", reverse: true, short: true },
  { f: "CO4", t: "잘못한 사람도 사정을 헤아려 용서하려 한다.", reverse: false },
  { f: "CO4", t: "약하거나 어려운 처지의 사람에게 마음이 쓰인다.", reverse: false },
  { f: "CO4", t: "한번 크게 상처받으면 좀처럼 용서하기 어렵다.", reverse: true },
  { f: "CO4", t: "나에게 잘못한 사람에게는 마음을 닫게 된다.", reverse: true },

  // ===== ST 자기초월 =====
  { f: "ST1", t: "무언가에 깊이 빠져 시간 가는 줄 모를 때가 있다.", reverse: false, short: true },
  { f: "ST1", t: "몰입할 때는 나 자신을 잊을 만큼 집중한다.", reverse: false },
  { f: "ST1", t: "상상이나 창작에 잠기는 순간이 좋다.", reverse: false },
  { f: "ST1", t: "늘 현실 감각을 놓치지 않으려고 한다.", reverse: true },
  { f: "ST1", t: "공상에 잠기기보다 실제 일에 집중하는 편이다.", reverse: true },

  { f: "ST2", t: "나는 내가 더 큰 자연·세계의 일부라고 느낀다.", reverse: false, short: true },
  { f: "ST2", t: "모든 존재가 어떤 식으로든 연결되어 있다고 느낀다.", reverse: false },
  { f: "ST2", t: "나는 세상과 분리된 하나의 개인일 뿐이라고 여긴다.", reverse: true },
  { f: "ST2", t: "나를 넘어선 무언가와 하나 되는 느낌은 잘 와닿지 않는다.", reverse: true },
  { f: "ST2", t: "세상은 결국 각자 따로 존재한다고 생각한다.", reverse: true },

  { f: "ST3", t: "증명되지 않은 것은 잘 믿지 않는다.", reverse: true, short: true },
  { f: "ST3", t: "논리로 설명되지 않는 영적 경험에 열려 있다.", reverse: false },
  { f: "ST3", t: "과학으로 다 설명할 수 없는 무언가가 있다고 믿는다.", reverse: false },
  { f: "ST3", t: "직관이나 알 수 없는 이끌림을 신뢰할 때가 있다.", reverse: false },
  { f: "ST3", t: "눈에 보이고 검증된 것만 받아들인다.", reverse: true },

  { f: "ST4", t: "이상보다 현실적이고 실용적인 것이 우선이다.", reverse: true, short: true },
  { f: "ST4", t: "눈앞의 이익보다 더 큰 의미와 가치를 좇는다.", reverse: false },
  { f: "ST4", t: "물질적 성공보다 삶의 의미가 더 중요하다.", reverse: false },
  { f: "ST4", t: "이상은 결국 현실 앞에서 힘을 잃는다고 느낀다.", reverse: true },
  { f: "ST4", t: "당장 도움이 되는 실용적인 것에 더 끌린다.", reverse: true },
];

// 각 문항에 소속 차원(d)을 facet 정보로 채워 넣는다.
QUESTIONS.forEach((q) => { q.d = FACETS[q.f].dim; });

/*
 * 응답 신뢰도(참고용) 확인 문항 — 성격 점수에는 반영하지 않는다(check:true).
 *  - expect: 성의 있게 응답할 때 기대되는 보기 값(1~5)
 *  - |응답 - expect| >= 2 이면 "놓침"으로 간주
 * 간단 테스트는 첫 1개, 심화 테스트는 2개를 섞어 넣는다.
 */
const CHECKS = [
  { check: true, t: "나는 태어나서 지금까지 한 번도 잠을 잔 적이 없다.", expect: 1 },
  { check: true, t: "성의 있게 응답하고 있다면, 이 문항만은 '매우 그렇다'를 선택해 주세요.", expect: 5 },
];

if (typeof module !== "undefined") {
  module.exports = { DIMENSIONS, FACETS, QUESTIONS, CHECKS };
}
