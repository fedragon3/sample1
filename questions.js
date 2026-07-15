/*
 * 기질 및 성격 자가탐색 문항 (TCI 7차원 이론 기반)
 *
 * 주의: 본 문항은 Cloninger의 TCI(Temperament and Character Inventory)에서
 * 공개된 "7가지 차원 이론"에 근거하여 독자적으로 작성한 자가탐색용 문항입니다.
 * 정식 TCI 검사 문항이 아니며, 임상적 진단 목적으로 사용할 수 없습니다.
 *
 * 차원(dimension) 코드
 *  - NS: 자극추구 (Novelty Seeking)
 *  - HA: 위험회피 (Harm Avoidance)
 *  - RD: 사회적 민감성 (Reward Dependence)
 *  - PS: 인내력 (Persistence)
 *  - SD: 자율성 (Self-Directedness)
 *  - CO: 연대감 (Cooperativeness)
 *  - ST: 자기초월 (Self-Transcendence)
 *
 * reverse: true 인 문항은 역채점(동의할수록 점수가 낮아짐)합니다.
 */

const DIMENSIONS = {
  NS: {
    name: "자극추구",
    en: "Novelty Seeking",
    color: "#e05a47",
    type: "기질",
    high: "새로운 경험과 자극을 적극적으로 찾고, 호기심이 많으며 즉흥적으로 행동하는 경향이 있습니다. 변화와 모험을 즐깁니다.",
    low: "익숙하고 안정된 환경을 선호하며, 신중하고 절제된 태도로 행동합니다. 충동보다 계획을 중시합니다.",
  },
  HA: {
    name: "위험회피",
    en: "Harm Avoidance",
    color: "#4a7bb5",
    type: "기질",
    high: "위험이나 실패 가능성에 민감하여 조심스럽게 행동합니다. 걱정이 많고 낯선 상황에서 긴장하는 편입니다.",
    low: "낙천적이고 대담하며, 불확실한 상황에서도 크게 위축되지 않습니다. 에너지가 넘치고 사교적입니다.",
  },
  RD: {
    name: "사회적 민감성",
    en: "Reward Dependence",
    color: "#5aa17a",
    type: "기질",
    high: "타인의 인정과 애정에 민감하고 정이 많으며, 사회적 관계를 소중히 여깁니다. 따뜻하고 공감적입니다.",
    low: "타인의 평가에 크게 좌우되지 않고 독립적이며, 실용적이고 현실적인 태도를 유지합니다.",
  },
  PS: {
    name: "인내력",
    en: "Persistence",
    color: "#d69a2d",
    type: "기질",
    high: "좌절이나 피로에도 목표를 향해 끈기 있게 노력합니다. 성실하고 완벽을 추구하는 경향이 있습니다.",
    low: "상황에 유연하게 대응하며, 성과가 더디거나 보상이 적으면 방향을 쉽게 바꿉니다.",
  },
  SD: {
    name: "자율성",
    en: "Self-Directedness",
    color: "#8a63c4",
    type: "성격",
    high: "자신의 목표와 가치에 따라 책임감 있게 행동합니다. 자기수용적이고 문제 해결에 주도적입니다.",
    low: "목표 설정이나 자기 통제가 어렵게 느껴질 수 있으며, 상황이나 외부 요인에 영향을 많이 받습니다.",
  },
  CO: {
    name: "연대감",
    en: "Cooperativeness",
    color: "#3d9ba3",
    type: "성격",
    high: "타인을 존중하고 공감하며 협력적으로 관계를 맺습니다. 관용적이고 도움을 주는 것을 중요하게 여깁니다.",
    low: "자신의 관점과 이익을 우선하는 편이며, 타인과의 협력보다 독자적인 판단을 선호합니다.",
  },
  ST: {
    name: "자기초월",
    en: "Self-Transcendence",
    color: "#c45d8f",
    type: "성격",
    high: "자신을 더 큰 전체의 일부로 느끼며, 영적·이상적 가치에 개방적입니다. 몰입과 의미를 중시합니다.",
    low: "현실적이고 논리적이며, 통제 가능하고 구체적인 것에 집중합니다. 실용주의적 태도를 지닙니다.",
  },
};

// 각 차원 5문항. reverse=true 는 역채점.
const QUESTIONS = [
  // NS
  { d: "NS", t: "새로운 곳을 여행하거나 낯선 활동에 도전하는 것이 즐겁다.", reverse: false },
  { d: "NS", t: "떠오르는 대로 즉흥적으로 결정하고 행동할 때가 많다.", reverse: false },
  { d: "NS", t: "지루한 일상보다 예측할 수 없는 변화가 더 흥미롭다.", reverse: false },
  { d: "NS", t: "익숙하고 정해진 방식대로 하는 것이 마음이 편하다.", reverse: true },
  { d: "NS", t: "중요한 일은 충분히 계획을 세운 뒤에야 시작한다.", reverse: true },

  // HA
  { d: "HA", t: "일이 잘못될까 봐 미리 걱정하는 편이다.", reverse: false },
  { d: "HA", t: "낯선 사람들 사이에 있으면 쉽게 긴장하고 위축된다.", reverse: false },
  { d: "HA", t: "위험이 조금이라도 있는 일은 되도록 피하려 한다.", reverse: false },
  { d: "HA", t: "처음 겪는 상황에서도 대체로 편안하고 자신 있다.", reverse: true },
  { d: "HA", t: "웬만한 일에는 크게 불안해하지 않는 낙천적인 편이다.", reverse: true },

  // RD
  { d: "RD", t: "가까운 사람이 힘들어하면 내 일처럼 마음이 쓰인다.", reverse: false },
  { d: "RD", t: "다른 사람에게 인정받고 칭찬받는 것이 나에게 중요하다.", reverse: false },
  { d: "RD", t: "감동적인 이야기에 쉽게 마음이 움직이고 눈물이 난다.", reverse: false },
  { d: "RD", t: "다른 사람의 반응보다 내 판단과 기준이 훨씬 중요하다.", reverse: true },
  { d: "RD", t: "혼자 지내는 것이 사람들과 어울리는 것보다 편하다.", reverse: true },

  // PS
  { d: "PS", t: "한번 시작한 일은 어렵더라도 끝까지 해내려 한다.", reverse: false },
  { d: "PS", t: "성과가 더디게 나와도 포기하지 않고 계속 노력한다.", reverse: false },
  { d: "PS", t: "맡은 일은 완벽하게 해내야 마음이 놓인다.", reverse: false },
  { d: "PS", t: "일이 잘 안 풀리면 금방 흥미를 잃고 그만두는 편이다.", reverse: true },
  { d: "PS", t: "노력에 비해 보상이 적으면 굳이 애쓰지 않는다.", reverse: true },

  // SD
  { d: "SD", t: "나는 내 삶의 목표를 스스로 정하고 그것을 향해 나아간다.", reverse: false },
  { d: "SD", t: "어려운 문제가 생겨도 스스로 해결책을 찾아 행동한다.", reverse: false },
  { d: "SD", t: "지금의 나 자신을 대체로 받아들이고 만족한다.", reverse: false },
  { d: "SD", t: "내 삶이 상황이나 남의 영향에 휘둘린다고 느낄 때가 많다.", reverse: true },
  { d: "SD", t: "결정을 내리고 그 결과에 책임지는 것이 부담스럽다.", reverse: true },

  // CO
  { d: "CO", t: "나와 생각이 다른 사람의 입장도 이해하려고 노력한다.", reverse: false },
  { d: "CO", t: "곤란에 처한 사람을 보면 기꺼이 도와주는 편이다.", reverse: false },
  { d: "CO", t: "함께 일할 때 서로의 의견을 조율하는 것을 중요하게 여긴다.", reverse: false },
  { d: "CO", t: "대체로 내 이익이 다른 사람의 사정보다 우선이다.", reverse: true },
  { d: "CO", t: "사람들은 기본적으로 믿기 어렵다고 생각한다.", reverse: true },

  // ST
  { d: "ST", t: "나는 나 자신이 더 큰 자연이나 세계의 일부라고 느낀다.", reverse: false },
  { d: "ST", t: "무언가에 깊이 몰입해 시간 가는 줄 모른 적이 있다.", reverse: false },
  { d: "ST", t: "말로 설명하기 어려운 영적이거나 신비로운 경험에 열려 있다.", reverse: false },
  { d: "ST", t: "논리적으로 설명되지 않는 것은 잘 믿지 않는다.", reverse: true },
  { d: "ST", t: "눈에 보이고 손에 잡히는 현실적인 것에만 관심이 간다.", reverse: true },
];

if (typeof module !== "undefined") {
  module.exports = { DIMENSIONS, QUESTIONS };
}
