import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/common/ChatBox';
import { SocketEventType } from '../types/socket';
import { UserProfileResponse } from '../services/api';
import useModal from '../hooks/useModal';
import Modal from '../components/common/Modal';

import GameRoom from '../components/game/GameRoom';
import { Player } from '../types/game';
import './GamePage.css';


// --- 화면 표시용 더미 데이터 (백엔드와 무관) ---
// 이 데이터는 UI 디자인 프로토타이핑을 위한 샘플이며, 실제 게임 로직/데이터와는 아무런 관련이 없습니다.
const DUMMY_GAME_PROTOTYPE_DATA = {
  // ----------------------------------------------------
  // [상태 2: Work] - 개인별 업무 수행
  // ----------------------------------------------------
  works: [
    {
      title: "기획자 담당 업무: 시장 분석 보고서 작성",
      prompt: "어떤 방식으로 보고서를 작성하여 팀의 방향을 제시하시겠습니까?",
      options: [
        { id: 'W1', name: "데이터 기반 분석", description: "경쟁사 지표, 유저 데이터를 심층 분석합니다.", chance: 70, reward: "통찰 +20, 사업성 +10", cost: "스트레스 +10" },
        { id: 'W2', name: "사용자 인터뷰 진행", description: "핵심 타겟 유저를 직접 만나 니즈를 파악합니다.", chance: 85, reward: "통찰 +15, 팀워크 +10", cost: "자금 -5" },
        { id: 'W3', name: "빠른 프로토타입 제작", description: "아이디어를 빠르게 시각화하여 검증합니다.", chance: 60, reward: "실행 +20, 디자인 +5", cost: "스트레스 +15" },
      ]
    }
  ],
  // ----------------------------------------------------
  // [상태 3: Overtime] - 야근...
  // ----------------------------------------------------
  overtime: [
     {
      title: "개발자 담당 야근: 긴급 서버 점검",
      prompt: "배포 직전 심각한 버그가 발견되었습니다. 어떻게 해결하시겠습니까?",
      options: [
        { id: 'O1', name: "밤샘 코딩", description: "커피와 함께 밤을 새워 버그를 해결합니다.", chance: 75, reward: "기술력 +15, 인지도 -5", cost: "스트레스 +25" },
        { id: 'O2', name: "배포 연기 공지", description: "사용자에게 솔직하게 알리고 일정을 연기합니다.", chance: 95, reward: "팀워크 +10, 스트레스 -10", cost: "인지도 -10, 사업성 -5" },
        { id: 'O3', name: "가장 비슷한 동료에게 부탁", description: "미안하지만... 동료의 도움을 받아 함께 해결합니다.", chance: 50, reward: "기술력 +10", cost: "팀워크 -15" },
      ]
    }
  ],
};

const DUMMY_DAILY_SCRUM_DATA = {
  "description": "어젯밤, 우리 서비스의 핵심 기능에서 치명적인 버그가 발견되어 긴급 서버 점검에 들어갔습니다. 유저들의 불만이 폭주하고 있으며, 빠른 해결이 필요합니다. 오늘 스크럼에서는 이 위기를 어떻게 극복하고, 앞으로의 방향을 어떻게 설정할지 논의해야 합니다.",
  "agenda_list": [
    {
      "agenda_id": "agenda_bug_fix_strategy_1",
      "agenda_name": "1/3 | 긴급 버그 대응 전략",
      "agenda_description": "현재 발생한 치명적인 버그를 어떻게 해결해야 할까요? 우리의 기술적 역량과 유저 신뢰가 달린 문제입니다.",
      "agenda_options": [
        {
          "agenda_option_id": "opt_all_in_debug",
          "agenda_option_text": "모든 개발자, 버그 해결에 투입",
          "agenda_option_impact_summary": "장점: 빠른 해결 기대. 단점: 다른 개발 일정 전체 지연, 팀 스트레스 급증.",
          "icon": "A"
        },
        {
          "agenda_option_id": "opt_rollback",
          "agenda_option_text": "안정적인 이전 버전으로 롤백",
          "agenda_option_impact_summary": "장점: 즉각적인 서비스 안정화. 단점: 신규 기능 부재로 인한 유저 이탈 우려.",
          "icon": "B"
        },
        {
          "agenda_option_id": "opt_outsource_fix",
          "agenda_option_text": "외부 전문가에게 문제 해결 의뢰",
          "agenda_option_impact_summary": "장점: 내부 리소스 확보. 단점: 높은 비용 발생, 보안 및 커뮤니케이션 리스크.",
          "icon": "C"
        }
      ]
    },
    {
      "agenda_id": "agenda_user_communication_2",
      "agenda_name": "2/3 | 유저 소통 및 보상 방안",
      "agenda_description": "분노한 유저들을 어떻게 달래야 할까요? 이번 대응이 우리 서비스의 평판을 좌우할 것입니다.",
      "agenda_options": [
        {
          "agenda_option_id": "opt_full_transparency",
          "agenda_option_text": "문제 상황, 투명하게 전체 공개",
          "agenda_option_impact_summary": "장점: 진정성 있는 태도로 신뢰 회복 가능. 단점: 경쟁사에 약점 노출.",
          "icon": "A"
        },
        {
          "agenda_option_id": "opt_mass_compensation",
          "agenda_option_text": "모든 유저에게 파격적인 보상 지급",
          "agenda_option_impact_summary": "장점: 유저 불만 즉각 완화. 단점: 상당한 재정적 지출 발생.",
          "icon": "B"
        },
        {
          "agenda_option_id": "opt_silent_fix",
          "agenda_option_text": "조용히 수정하고, 별도 공지하지 않기",
          "agenda_option_impact_summary": "장점: 불필요한 논란 방지. 단점: 유저들이 배신감을 느낄 경우 더 큰 후폭풍.",
          "icon": "C"
        }
      ]
    },
    {
      "agenda_id": "agenda_prevent_recurrence_3",
      "agenda_name": "3/3 | 재발 방지 및 프로세스 개선",
      "agenda_description": "이번 사태를 반면교사 삼아, 앞으로 어떻게 이런 위기를 막을 수 있을까요?",
      "agenda_options": [
        {
          "agenda_option_id": "opt_enhance_qa",
          "agenda_option_text": "QA 인력 충원 및 테스트 자동화 도입",
          "agenda_option_impact_summary": "장점: 장기적인 안정성 확보. 단점: 초기 투자 비용 및 시간 소요.",
          "icon": "A"
        },
        {
          "agenda_option_id": "opt_refactor_codebase",
          "agenda_option_text": "문제가 된 부분, 코드 리팩토링 진행",
          "agenda_option_impact_summary": "장점: 근본적인 문제 해결. 단점: 단기적으로 개발 속도 저하.",
          "icon": "B"
        },
        {
          "agenda_option_id": "opt_focus_new_features",
          "agenda_option_text": "일단 새 기능 개발에 다시 집중",
          "agenda_option_impact_summary": "장점: 빠른 성장 동력 확보. 단점: 유사한 버그 재발 가능성.",
          "icon": "C"
        }
      ]
    }
  ]
};

const DUMMY_WORK_SESSION_DATA = {
  "task_list": {
    "player_designer_id": [ // 현재 플레이어(디자이너)의 ID라고 가정
      {
        "task_id": "task_design_app_icon",
        "task_name": "1/3 | 신규 앱 아이콘 디자인",
        "task_description": "우리 앱의 첫인상을 결정할 새로운 앱 아이콘 디자인이 필요합니다. 최신 트렌드를 반영하되, 우리 브랜드의 핵심 가치를 녹여내야 합니다.",
        "task_options": [
          { "task_option_id": "opt_icon_minimal", "task_option_text": "미니멀리즘 스타일로 작업", "task_option_impact_summary": "장점: 세련된 인상. 단점: 다른 앱과 차별성 부족." },
          { "task_option_id": "opt_icon_3d", "task_option_text": "3D 렌더링 스타일로 작업", "task_option_impact_summary": "장점: 독창적이고 눈에 띔. 단점: 제작 시간과 비용 증가." },
          { "task_option_id": "opt_icon_retro", "task_option_text": "레트로 픽셀 스타일로 작업", "task_option_impact_summary": "장점: 특정 사용자층에 어필. 단점: 대중성 확보의 어려움." }
        ]
      },
      {
        "task_id": "task_design_onboarding",
        "task_name": "2/3 | 사용자 온보딩 플로우 개선",
        "task_description": "신규 사용자들이 우리 앱의 핵심 가치를 쉽게 이해하고 적응할 수 있도록 온보딩 과정을 개선해야 합니다. 현재 이탈률이 높은 주요 원인 중 하나입니다.",
        "task_options": [
          { "task_option_id": "opt_onboard_interactive", "task_option_text": "인터랙티브 튜토리얼 제작", "task_option_impact_summary": "장점: 높은 사용자 참여도. 단점: 개발 리소스 추가 소요." },
          { "task_option_id": "opt_onboard_video", "task_option_text": "가이드 영상 제작 및 배치", "task_option_impact_summary": "장점: 빠른 제작 속도. 단점: 사용자가 스킵할 가능성 높음." },
          { "task_option_id": "opt_onboard_none", "task_option_text": "과감하게 온보딩 제거", "task_option_impact_summary": "장점: 사용자가 바로 앱 사용 가능. 단점: 기능 미숙지로 인한 혼란 가중." }
        ]
      },
      {
        "task_id": "task_design_marketing_banner",
        "task_name": "3/3 | 다음 시즌 마케팅 배너 제작",
        "task_description": "다음 분기 대규모 업데이트를 위한 사전 홍보용 마케팅 배너를 디자인합니다. 마케터와 협업하여 사용자들의 기대감을 최대로 끌어올려야 합니다.",
        "task_options": [
          { "task_option_id": "opt_banner_self", "task_option_text": "독자적으로 빠르게 디자인", "task_option_impact_summary": "장점: 빠른 결과물. 단점: 마케팅팀과 방향성 불일치 리스크." },
          { "task_option_id": "opt_banner_collabo", "task_option_text": "마케터와 컨셉 회의 진행", "task_option_impact_summary": "장점: 통일성 있는 메시지 전달. 단점: 의사결정 시간 소요." },
          { "task_option_id": "opt_banner_ outsourcing", "task_option_text": "외주 디자이너에게 의뢰", "task_option_impact_summary": "장점: 내부 리소스 절약. 단점: 추가 비용 발생 및 퀄리티 컨트롤 이슈." }
        ]
      }
    ]
  }
};

const DUMMY_OVERTIME_DATA = {
  "task_list": {
    "player_designer_id": [ // 현재 플레이어(디자이너)의 ID라고 가정
      {
        "overtime_task_id": "overtime_urgent_fix_001",
        "overtime_task_type": "overtime",
        "overtime_task_name": "긴급 UI 수정 요청",
        "overtime_task_description": "늦은 밤, 기획자에게서 다급한 연락이 왔습니다. 내일 투자자 발표에 사용할 데모 버전에서 치명적인 UI 깨짐 현상이 발견되었다고 합니다. 지금 바로 수정해야만 합니다.",
        "overtime_task_options": [
          { "overtime_task_option_id": "opt_overtime_ 밤새_수정", "overtime_task_option_text": "밤을 새워서라도 완벽하게 수정한다", "overtime_task_option_impact_summary": "결과: 발표 성공률 증가. 개인: 스트레스 +20" },
          { "overtime_task_option_id": "opt_overtime_핵심만_수정", "overtime_task_option_text": "핵심적인 부분만 빠르게 수정한다", "overtime_task_option_impact_summary": "결과: 발표 성공률 소폭 증가. 개인: 스트레스 +10" },
          { "overtime_task_option_id": "opt_overtime_내일_수정", "overtime_task_option_text": "일단 자고 내일 아침 일찍 수정한다", "overtime_task_option_impact_summary": "결과: 발표 실패 가능성. 개인: 스트레스 -10" }
        ]
      }
    ],
    "player_developer_id": [ // 다른 플레이어(개발자)의 ID라고 가정 - 휴식 예시
      {
        "overtime_task_id": "rest_chicken_with_team_001",
        "overtime_task_type": "rest",
        "overtime_task_name": "동료들과 치킨 회동",
        "overtime_task_description": "고된 하루가 끝났습니다. 마침 동료 개발자가 야근하는 당신을 위해 치킨을 사왔습니다. 함께 스트레스를 풀 절호의 기회입니다.",
        "overtime_task_options": [
          { "overtime_task_option_id": "opt_rest_eat_all", "overtime_task_option_text": "치킨을 마음껏 즐긴다", "overtime_task_option_impact_summary": "개인: 스트레스 -20, 팀워크 +5" },
          { "overtime_task_option_id": "opt_rest_talk_more", "overtime_task_option_text": "먹는 것보다 대화에 집중한다", "overtime_task_option_impact_summary": "개인: 스트레스 -10, 팀워크 +10" },
          { "overtime_task_option_id": "opt_rest_go_home", "overtime_task_option_text": "간단히 먹고 집에 가서 쉰다", "overtime_task_option_impact_summary": "개인: 스트레스 -15, 팀워크 유지" }
        ]
      }
    ]
  }
};

const DUMMY_CONTEXT_DATA = {
  "company_context": {
    "1": "프로젝트 'Aether'의 첫날, 팀은 긴급 버그 대응 전략으로 '안정적인 이전 버전으로 롤백'을 결정했습니다. 이로 인해 서비스는 즉시 안정화되었지만, 신규 기능 출시가 지연되면서 일부 유저들의 기대감이 하락했습니다. 팀 분위기는 다소 침체되었지만, 큰 위기를 넘겼다는 안도감도 공존합니다."
  },
  "player_context_list": [
    {
      "player_id": "player_designer_id", // 현재 플레이어 ID와 일치한다고 가정
      "player_name": "Alex",
      "player_role": "디자이너",
      "player_context": {
        "1": "롤백 결정에 따라 급한 디자인 업무는 줄었지만, 대신 신규 앱 아이콘 디자인이라는 중요한 과제를 맡게 되었습니다. 어깨가 무겁지만, 이번 기회에 자신의 디자인 실력을 제대로 보여주겠다는 열정이 샘솟습니다. 스트레스는 아직 낮은 수준입니다."
      }
    }
  ]
};

const DUMMY_GAME_RESULT_DATA = {
  "game_result": {
    "success": true,
    "summary": "치열한 경쟁 속에서, 우리 팀은 마침내 프로젝트 'Aether'를 성공적으로 출시했습니다!"
  },
  "player_rankings": [
    {
      "rank": 1,
      "player_id": "player_pm_id",
      "player_name": "Chris",
      "player_role": "PM (기획자)",
      "player_evaluation": "탁월한 데이터 분석과 비전 제시로 팀을 성공으로 이끈 핵심 멤버입니다."
    },
    {
      "rank": 2,
      "player_id": "player_designer_id",
      "player_name": "Alex",
      "player_role": "디자이너",
      "player_evaluation": "사용자 경험을 한 단계 끌어올린 혁신적인 디자인으로 프로젝트의 가치를 높였습니다."
    },
    {
      "rank": 3,
      "player_id": "player_developer_id",
      "player_name": "Bob",
      "player_role": "개발자",
      "player_evaluation": "수많은 기술적 난관을 해결하며 서비스의 안정성에 크게 기여했습니다."
    },
    {
      "rank": 4,
      "player_id": "player_marketer_id",
      "player_name": "Dana",
      "player_role": "마케터",
      "player_evaluation": "초반의 어려움을 딛고, 마지막에 결정적인 마케팅으로 유저 유입을 이끌어냈습니다."
    }
  ]
};

const DUMMY_PROLOGUE_DATA = {
  "story": "202X년, 실리콘밸리의 심장이 뛰는 이곳에 네 명의 야심찬 청년들이 모였다. '세상을 바꿀 아이디어' 하나만을 믿고, 낡은 차고에서 위대한 여정을 시작하기로 결심한 것이다. 커피와 열정, 그리고 끝없는 논쟁 속에서 그들은 깨달았다. 성공적인 프로젝트를 위해서는 각자의 전문성이 필요하다는 것을... 그리하여, 팀의 역할이 정해졌다."
};

const DUMMY_JOBS_DATA = [
  { name: 'PM (기획자)', image: '/images/jobcard_pm.png' },
  { name: '개발자', image: '/images/jobcard_developer.png' },
  { name: '디자이너', image: '/images/jobcard_designer.png' },
  { name: '마케터', image: '/images/jobcard_marketer.png' },
];

const DUMMY_GAME_DATA = {
  time: { display: '3:00', period: 'PM', day: 1, icon: '☀️' },
  progress: [
    { label: '사업성', value: 80 },
    { label: '기술력', value: 60 },
    { label: '디자인', value: 90 },
    { label: '마케팅', value: 45 },
    { label: '팀워크', value: 75 },
  ],
  stats: {
    main: [ // 기획, 실행, 사교, 통찰, 성장
      { label: 'Planning', value: 85 },
      { label: 'Execution', value: 70 },
      { label: 'Social', value: 60 },
      { label: 'Insight', value: 90 },
      { label: 'Growth', value: 50 },
    ],
    sub: [
      { label: '자금', value: 70 },
      { label: '인지도', value: 40 },
      { label: '스트레스', value: 88 },
    ],
  },
  workspace: {
    image: '/images/workspace_image_sample.png', // public 폴더에 실제 이미지가 있어야 합니다.
    prompt: '다음 해결책 중 하나에 투표해주세요 (현재 투표권: 2)',
    agendas: [
      { id: 'A', title: '안건 A: MVP 기능 축소', details: '보상: 개발 기간 단축 / 비용: 핵심 가치 하락' },
      { id: 'B', title: '안건 B: 유료 광고 집행', details: '보상: 신규 유저 유입 / 비용: 자금 소모' },
      { id: 'C', title: '안건 C: 팀원들과 치킨 먹기', details: '보상: 팀워크 상승 / 비용: 자금 소모, 스트레스 감소' },
    ]
  }
};

// 영향 요약 텍스트 파싱 및 스타일링을 위한 헬퍼 컴포넌트
const ImpactSummaryDisplay: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(장점:|단점:)/).filter(p => p.trim());
  const items = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] && parts[i + 1]) {
      items.push({
        label: parts[i],
        value: parts[i + 1],
        isPositive: parts[i].includes('장점'),
      });
    }
  }

  return (
    <div className="impact-summary-details">
      {items.map((item, index) => (
        <p key={index} className={item.isPositive ? 'impact-positive' : 'impact-negative'}>
          <strong>{item.label}</strong>
          {item.value}
        </p>
      ))}
    </div>
  );
};


// SVG 오각형 차트 컴포넌트
const PentagonChart: React.FC<{ stats: { label: string; value: number }[] }> = ({ stats }) => {
  const size = 200;
  const center = size / 2;
  const labels = stats.map(s => s.label);

  // 5개의 동심원 그리드 라인 생성
  const gridLines = [100, 80, 60, 40, 20].map(value => {
    const radius = center * 0.9 * (value / 100);
    const points = Array.from({ length: 5 }).map((_, i) => {
      const angle = (i / 5) * 2 * Math.PI - (Math.PI / 2);
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    return <polygon key={`grid-${value}`} points={points} className="stats-pentagon-grid" />;
  });

  // 데이터 포인트 계산
  const dataPoints = stats.map((stat, i) => {
    const value = Math.max(0, Math.min(100, stat.value)) / 100;
    const angle = (i / 5) * 2 * Math.PI - (Math.PI / 2);
    const x = center + center * 0.9 * value * Math.cos(angle);
    const y = center + center * 0.9 * value * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');
  
  // 라벨 위치 계산
  const labelPoints = stats.map((_, i) => {
    const angle = (i / 5) * 2 * Math.PI - (Math.PI / 2);
    const x = center + center * 1.1 * Math.cos(angle);
    const y = center + center * 1.1 * Math.sin(angle);
    return { x, y };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="stats-chart-container">
      <g className="stats-grid-group">
        {gridLines}
      </g>
      <polygon points={dataPoints} className="stats-pentagon-data" />
      <g className="stats-labels-group">
        {labelPoints.map((point, i) => (
          <text key={`label-${i}`} x={point.x} y={point.y} className="stats-label">
            {labels[i]}
          </text>
        ))}
      </g>
    </svg>
  );
};

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { getRoom, getMyProfile, getChatHistory } = useApi();
  const { 
    socket, 
    isConnected, 
    currentRoom,
    joinRoom, 
    leaveRoom, 
    finishGame,
    sendGameMessage
  } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });
  
  // 방 입장 시도 상태 추적
  const joinAttemptedRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- 디자인 프로토타이핑을 위한 상태 (실제 게임 로직과 무관) ---
  const [workspaceState, setWorkspaceState] = useState<'agenda' | 'work' | 'overtime' | 'agenda_result' | 'work_result' | 'game_result'>('agenda');
  const [agendaIndex, setAgendaIndex] = useState(0); // 현재 진행중인 안건 인덱스
  const [workTaskIndex, setWorkTaskIndex] = useState(0); // 현재 진행중인 업무 인덱스
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // 선택한 옵션 ID
  const [isResultSuccess, setIsResultSuccess] = useState(false); // 업무 결과 (성공/실패)
  const [overtimeView, setOvertimeView] = useState<'overtime' | 'rest'>('rest'); // 야근/휴식 뷰 전환용
  // --- 여기까지 ---

  const [room, setRoom] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [shouldCreateGame, setShouldCreateGame] = useState(false);
  const { modalState, showInfo, showError, hideModal } = useModal();
  const [showPrologue, setShowPrologue] = useState(true); // 프롤로그 표시 상태
  const [assignedJob, setAssignedJob] = useState<{ name: string; image: string } | null>(null);

  // 프로필은 최초 1회만
  useEffect(() => {
    getMyProfile().then(res => setProfile(res.data as UserProfileResponse));
  }, []);

  // 방 정보는 roomId 바뀔 때마다
  useEffect(() => {
    if (!roomId) return;
    console.log('[GamePage] 방 정보 로드:', roomId);
    getRoom(roomId).then(res => {
      console.log('[GamePage] 방 정보 로드 완료:', res.data);
      setRoom(res.data);
      
      // 방 상태에 따라 게임 시작 상태 설정
      if (res.data.status === 'playing') {
        console.log('[GamePage] 방이 이미 게임 진행 중이므로 gameStarted를 true로 설정');
        setGameStarted(true);
      } else {
        console.log('[GamePage] 방이 대기 중이므로 gameStarted를 false로 설정');
        setGameStarted(false);
      }
    });
  }, [roomId]);

  // 소켓 연결 후 방 입장 확인 (개선된 로직)
  useEffect(() => {
    if (!isConnected || !roomId || !socket?.connected) {
      console.log('[GamePage] 방 입장 조건 불만족:', { isConnected, roomId, socketConnected: socket?.connected });
      return;
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (currentRoom === roomId) {
      console.log('[GamePage] 이미 방에 입장되어 있음:', roomId);
      return;
    }
    
    // 이미 입장 시도 중이면 무시
    if (joinAttemptedRef.current) {
      console.log('[GamePage] 이미 방 입장 시도 중:', roomId);
      return;
    }
    
    // 기존 타이머가 있으면 취소
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    
    console.log('[GamePage] 방 입장 시도:', roomId);
    joinAttemptedRef.current = true;
    
    // 방 입장 시도
    joinRoom(roomId).then(() => {
      console.log('[GamePage] 방 입장 성공:', roomId);
      joinAttemptedRef.current = false;
      
      // 방 입장 성공 후 방 정보 즉시 갱신
      console.log('[GamePage] 방 입장 후 방 정보 갱신');
      getRoom(roomId).then(res => {
        console.log('[GamePage] 방 입장 후 방 정보 갱신 완료:', res.data);
        setRoom(res.data);
      }).catch(error => {
        console.error('[GamePage] 방 입장 후 방 정보 갱신 실패:', error);
      });
    }).catch(error => {
      console.error('[GamePage] 방 입장 실패:', error);
      joinAttemptedRef.current = false;
      
      // 방이 삭제된 경우 홈으로 이동
      if (error.message === 'Room has been deleted') {
        console.log('[GamePage] 방이 삭제됨, 홈으로 이동');
        showInfo('방이 삭제되었습니다.', '방 삭제');
        navigate('/home');
        return;
      }
      
      // 재입장 대기 에러인 경우 조용히 처리 (사용자에게 에러 표시하지 않음)
      if (error.message === 'Please wait before rejoining the room') {
        console.log('[GamePage] 재입장 대기, 1초 후 재시도');
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[GamePage] 재입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 1000);
        return;
      }
      
      // 게임 진행 중 재입장 에러인 경우 조용히 처리
      if (error.message === 'Game in progress - rejoining as existing player') {
        console.log('[GamePage] 게임 진행 중 재입장, 1초 후 재시도');
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[GamePage] 게임 진행 중 재입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 1000);
        return;
      }
      
      // 기타 에러는 재시도하지 않음
      if (error.message !== 'Already joining this room' && 
          error.message !== 'Already joining another room' &&
          error.message !== 'Already in room') {
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[GamePage] 방 입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 3000);
      }
    });
  }, [isConnected, roomId, socket, currentRoom]); // joinRoom 의존성 제거

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }
    };
  }, []);

  // 게임에서는 채팅 히스토리가 필요 없음
  // useEffect(() => {
  //   if (!roomId) return;
  //   getChatHistory(roomId).then(res => {
  //     if (res.data && res.data.messages) {
  //       setChatHistory(res.data.messages);
  //     }
  //   }).catch(error => {
  //     console.error('채팅 히스토리 로드 실패:', error);
  //   });
  // }, [roomId]);

  // 게임 시작/종료 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    
    console.log('[GamePage] START_GAME, FINISH_GAME 이벤트 리스너 등록 시도:', { socket: !!socket, roomId, socketConnected: socket?.connected });
    
    let isRefreshing = false; // 중복 호출 방지 플래그
    
    const handleGameStart = (data: any) => {
      console.log('[GamePage] START_GAME 이벤트 수신:', data);
      if (data.room_id === roomId) {
        console.log('[GamePage] 게임 시작됨:', data);
        setGameStarted(true);
        setShouldCreateGame(true); // 게임 생성 플래그 설정
        
        // 게임 시작 시 방 정보 갱신 (중복 방지)
        if (!isRefreshing) {
          isRefreshing = true;
          getRoom(roomId).then(res => {
            console.log('[GamePage] 게임 시작 후 방 정보 갱신');
            setRoom(res.data);
            isRefreshing = false;
          }).catch(error => {
            console.error('[GamePage] 게임 시작 후 방 정보 갱신 실패:', error);
            isRefreshing = false;
          });
        }
      } else {
        console.log('[GamePage] 다른 방의 게임 시작 이벤트 무시:', data.room_id, '!=', roomId);
      }
    };
    
    const handleGameFinish = (data: any) => {
      console.log('[GamePage] FINISH_GAME 이벤트 수신:', data);
      if (data.room_id === roomId) {
        console.log('[GamePage] 게임 종료됨:', data);
        setGameStarted(false);
        showInfo(`${data.host_display_name}님이 게임을 종료했습니다.`, '게임 종료');
        navigate(`/room/${roomId}`); // 로비로 돌아가기
      } else {
        console.log('[GamePage] 다른 방의 게임 종료 이벤트 무시:', data.room_id, '!=', roomId);
      }
    };

    console.log('[GamePage] START_GAME, FINISH_GAME 이벤트 리스너 등록 완료');
    socket.on(SocketEventType.START_GAME, handleGameStart);
    socket.on(SocketEventType.FINISH_GAME, handleGameFinish);
    
    return () => {
      console.log('[GamePage] START_GAME, FINISH_GAME 이벤트 리스너 해제');
      socket.off(SocketEventType.START_GAME, handleGameStart);
      socket.off(SocketEventType.FINISH_GAME, handleGameFinish);
    };
  }, [socket, roomId, navigate, getRoom]);

  // 방 삭제 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleRoomDeleted = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[GamePage] 방 삭제 이벤트 수신:', data);
        
        // 방 입장 시도 중이면 중단
        if (joinAttemptedRef.current) {
          console.log('[GamePage] 방 입장 시도 중단 (방 삭제됨)');
          joinAttemptedRef.current = false;
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
          }
        }
        
        showInfo('방이 삭제되었습니다.', '방 삭제');
        navigate('/home');
      }
    };
    socket.on(SocketEventType.ROOM_DELETED, handleRoomDeleted);
    return () => { socket.off(SocketEventType.ROOM_DELETED, handleRoomDeleted); };
  }, [socket, roomId, navigate]);

  // 페이지 로드 시 직무 랜덤 배정 (프로토타입용)
  useEffect(() => {
    if (gameStarted) {
      const randomIndex = Math.floor(Math.random() * DUMMY_JOBS_DATA.length);
      setAssignedJob(DUMMY_JOBS_DATA[randomIndex]);
    }
  }, [gameStarted]);

  // 직무 배정 후 5초 뒤 자동 전환
  useEffect(() => {
    if (assignedJob) {
      const timer = setTimeout(() => {
        setShowPrologue(false);
      }, 5000); // 5초

      return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 제거
    }
  }, [assignedJob]);


  console.log('[GamePage] 렌더링:', { room: !!room, profile: !!profile, socket: !!socket, socketConnected: socket?.connected, roomId, currentRoom, isConnected, gameStarted });
  
  if (!room || !profile) return <div>로딩 중...</div>;

  const isHost = room.host_profile_id === profile.id;
  const otherPlayers = room.players?.filter((p: any) => p.profile_id !== profile.id) || [];

  // 플레이어 목록을 LLM 게임 형식으로 변환
  const getLlmPlayers = (): Player[] => {
    if (!room.players) return [];
    return room.players.map((player: any) => ({
      id: player.profile_id,
      name: player.display_name
    }));
  };

  // 버튼 핸들러
  const handleLeaveGame = () => { 
    if (roomId) {
      leaveRoom();
    }
    navigate('/home'); 
  };

  const handleFinishGame = () => {
    console.log('[GamePage] 게임 종료 버튼 클릭:', { roomId });
    if (!roomId) {
      console.error('[GamePage] 게임 종료 실패: roomId 없음');
      return;
    }
    
    try {
      finishGame(roomId);
      console.log('[GamePage] FINISH_GAME 이벤트 전송 완료');
    } catch (error) {
      console.error('[GamePage] 게임 종료 실패:', error);
      showError('게임 종료에 실패했습니다.', '게임 종료 실패');
    }
  };

  // gameStarted가 false일 때 (게임 시작 전) => LLM 실제 게임 UI 표시 (수정)
  if (!gameStarted) {
  return (
      <>
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단: 방 이름, 나가기 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee' }}>
            <h2 style={{ margin: 0 }}>
              {room.title} - LLM 게임 진행 중
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {isHost && (
                <button onClick={handleFinishGame} className="leave-button">
                  🏁 게임 종료
                </button>
              )}
            </div>
      </div>
      
      {/* 메인: 좌측 게임 영역, 우측 채팅 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* 좌측: LLM 게임 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 24, overflowY: 'auto' }}>
              <GameRoom 
                roomId={roomId!}
                token={useAuthStore.getState().accessToken || ''}
                players={getLlmPlayers()}
                shouldCreateGame={shouldCreateGame}
                onGameCreated={() => setShouldCreateGame(false)}
              />
            </div>
            {/* 우측: 채팅 영역 */}
            <aside className="game-sidebar right" style={{ flex: '0 0 320px', borderLeft: '1px solid #eee' }}>
              <div className="chat-container">
                <div className="chat-header">
                    <h3>채팅</h3>
                    <div className="other-players-list">
                        {otherPlayers.map((player: any) => (
                            <div key={player.profile_id} className="other-player">
                                <img src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} alt={player.display_name} className="other-player-avatar" />
                                <span className="other-player-name">{player.display_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="chat-box-wrapper">
                    <ChatBox 
                        roomId={roomId!} 
                        socket={socket} 
                        profile={profile}
                        chatType="game" 
                        initialMessages={[]}
                        onSendGameMessage={sendGameMessage}
                    />
                </div>
              </div>
            </aside>
          </div>
          {/* Modal (기존 로직 그대로 유지) */}
          <Modal
            isOpen={modalState.isOpen}
            onClose={hideModal}
            title={modalState.title}
            message={modalState.message}
            type={modalState.type}
            showCloseButton={modalState.showCloseButton}
          />
        </div>
      </>
    );
  }

  // 1. 프롤로그 표시
  if (showPrologue) {
    return (
      <div className="prologue-overlay">
        <div className="prologue-container">
          <h2 className="prologue-title">PROJECT: startuptrpg</h2>
          <p className="prologue-story">
            {DUMMY_PROLOGUE_DATA.story}
          </p>
          
          {assignedJob && (
            <div className="job-reveal-container">
              <h3>그리고... 당신의 역할은 다음과 같습니다.</h3>
              <div className="job-card-reveal">
                <img src={assignedJob.image} alt={assignedJob.name} />
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // 2. 프로토타입 대시보드 UI 표시 (수정)
  return (
    <>
      {/* --- 상태 4: Game Result Overlay (최종 결과) --- */}
      {workspaceState === 'game_result' && (() => {
        const { game_result, player_rankings } = DUMMY_GAME_RESULT_DATA;
        const sortedRankings = [...player_rankings].sort((a, b) => a.rank - b.rank);
        const getMedal = (rank: number) => {
          if (rank === 1) return '🥇';
          if (rank === 2) return '🥈';
          if (rank === 3) return '🥉';
          return '🏅';
        };

        return (
          <div className="game-result-overlay">
            <div className="game-result-content">
              <div className="result-summary-container">
                <h2 className={`result-outcome ${game_result.success ? 'success' : 'failure'}`}>
                  {game_result.success ? 'PROJECT SUCCESS' : 'PROJECT FAILURE'}
                </h2>
                <p className="result-summary-text">"{game_result.summary}"</p>
              </div>
              <div className="ranking-list">
                {sortedRankings.map((player, index) => (
                  <div
                    key={player.player_id}
                    className={`ranking-card rank-${player.rank}`}
                    style={{ animationDelay: `${index * 0.3 + 0.5}s` }} // 애니메이션 딜레이 조정
                  >
                    <div className="ranking-info">
                      <span className="rank-number">{player.rank}</span>
                      <span className="rank-medal">{getMedal(player.rank)}</span>
                      <div className="player-details">
                        <span className="player-name">{player.player_name}</span>
                        <span className="player-role">{player.player_role}</span>
                      </div>
                    </div>
                    <p className="player-evaluation">"{player.player_evaluation}"</p>
                  </div>
                ))}
              </div>
              {/* --- (임시) 상태 전환 버튼 --- */}
              <button className="close-result-button" onClick={() => setWorkspaceState('agenda')}>
                돌아가기
              </button>
            </div>
          </div>
        );
      })()}

      <div className="game-page-container">
        {/* --- Left Sidebar --- */}
        <aside className="game-sidebar left">
          <div className="sidebar-scroll-content">
            <div className="game-card daily-briefing-card">
              <h3>오늘의 요약</h3>
              <div className="briefing-content">
                <div className="briefing-section">
                  <h4>팀 현황</h4>
                  <p>{DUMMY_CONTEXT_DATA.company_context["1"]}</p>
                </div>
                <div className="briefing-section">
                  <h4>나의 상태</h4>
                  <p>{DUMMY_CONTEXT_DATA.player_context_list[0].player_context["1"]}</p>
                </div>
              </div>
            </div>
            <div className="game-card time-card">
              <div className="time-display">
                <span className="time-icon">{DUMMY_GAME_DATA.time.icon}</span>
                <span className="time-text">{DUMMY_GAME_DATA.time.display}</span>
              </div>
              <div className="day-text">Day {DUMMY_GAME_DATA.time.day}</div>
            </div>
            <div className="game-card progress-card">
              <h3>진척도</h3>
              <div className="progress-list">
                {DUMMY_GAME_DATA.progress.map(item => (
                  <div key={item.label} className="progress-item">
                    <span>{item.label}</span>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fg" style={{ width: `${item.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="game-card stats-card">
              <h3>스탯</h3>
              <PentagonChart stats={DUMMY_GAME_DATA.stats.main} />
              <div className="sub-stats-list">
                {DUMMY_GAME_DATA.stats.sub.map(item => (
                  <div key={item.label} className="progress-item">
                    <span>{item.label}</span>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fg" style={{ width: `${item.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* --- Workspace (Center) --- */}
        <main className="game-workspace">
          <div className="workspace-header">
            <h2>워크스페이스</h2>
            {isHost && (
              <button onClick={handleFinishGame} className="leave-button">
                🏁 프로젝트 종료
              </button>
            )}
          </div>
          <div className="workspace-content">
            {/* =============================================================================== */}
            {/* --- 디자인 프로토타입: 워크스페이스 컨텐츠 (workspaceState에 따라 변경) --- */}
            {/* =============================================================================== */}

            {/* ----------------------------------- */}
            {/* --- 상태 1: Agenda (안건 투표) --- */}
            {/* ----------------------------------- */}
            {workspaceState === 'agenda' && (() => {
              const currentAgenda = DUMMY_DAILY_SCRUM_DATA.agenda_list[agendaIndex];
              return (
                <div className="workspace-agenda new-design">
                  {/* GM의 노트 */}
                  <div className="gm-note">
                    <span className="gm-note-icon">📝</span>
                    <p>"{DUMMY_DAILY_SCRUM_DATA.description}"</p>
                  </div>

                  {/* 안건 헤더 */}
                  <div className="agenda-header">
                    <h3 className="agenda-title">{currentAgenda.agenda_name}</h3>
                    <div className="timer-container">
                      <span>남은 시간</span>
                      <div className="timer-progress-bar">
                        <div className="timer-progress"></div>
                      </div>
                    </div>
                  </div>
                  <p className="workspace-prompt">{currentAgenda.agenda_description}</p>
                  
                  {/* 선택지 목록 */}
                  <div className="agenda-options-list">
                    {currentAgenda.agenda_options.map(option => (
                      <div
                        key={option.agenda_option_id}
                        className="option-card agenda-option"
                        onClick={() => {
                          setSelectedOption(option.agenda_option_id);
                          setTimeout(() => setWorkspaceState('agenda_result'), 1000);
                        }}
                      >
                        <div className="option-icon">{option.icon}</div>
                        <div className="option-content">
                          <h4>{option.agenda_option_text}</h4>
                          <ImpactSummaryDisplay text={option.agenda_option_impact_summary} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ----------------------------------------- */}
            {/* --- 상태 1.5: Agenda Result (결과 표시) --- */}
            {/* ----------------------------------------- */}
            {workspaceState === 'agenda_result' && (() => {
              const currentAgenda = DUMMY_DAILY_SCRUM_DATA.agenda_list[agendaIndex];
              const nextAgendaExists = agendaIndex < DUMMY_DAILY_SCRUM_DATA.agenda_list.length - 1;
              const selectedOpt = currentAgenda.agenda_options.find(o => o.agenda_option_id === selectedOption);
              return (
                <div className="workspace-agenda result new-design">
                  <div className="gm-note">
                    <span className="gm-note-icon">📝</span>
                    <p>"{DUMMY_DAILY_SCRUM_DATA.description}"</p>
                  </div>

                  <div className="agenda-header">
                    <h3 className="agenda-title">{currentAgenda.agenda_name}</h3>
                    <div className="agenda-result-info">투표 완료!</div>
                  </div>
                  <p className="workspace-prompt">'{selectedOpt?.agenda_option_text}' 안건이 채택되었습니다.</p>
                  <div className="agenda-options-list">
                    {currentAgenda.agenda_options.map(option => (
                      <div
                        key={option.agenda_option_id}
                        className={`option-card agenda-option ${selectedOption === option.agenda_option_id ? 'selected' : 'not-selected'}`}
                      >
                        {selectedOption === option.agenda_option_id && <div className="selected-badge">✅ 선택됨</div>}
                        <div className="option-icon">{option.icon}</div>
                        <div className="option-content">
                          <h4>{option.agenda_option_text}</h4>
                          <ImpactSummaryDisplay text={option.agenda_option_impact_summary} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="next-step-button"
                    onClick={() => {
                      if (nextAgendaExists) {
                        setAgendaIndex(agendaIndex + 1);
                        setWorkspaceState('agenda');
                        setSelectedOption(null);
                      } else {
                        // 모든 안건이 끝나면 work 상태로 전환
                        setWorkspaceState('work');
                        setSelectedOption(null);
                      }
                    }}
                  >
                    {nextAgendaExists ? '다음 안건으로' : '업무 시작하기'}
                  </button>
                </div>
              );
            })()}

            {/* ---------------------------------- */}
            {/* --- 상태 2: Work --- */}
            {/* ---------------------------------- */}
            {workspaceState === 'work' && (() => {
              // 현재 플레이어의 업무 목록 (ID는 임시로 사용)
              const playerTasks = DUMMY_WORK_SESSION_DATA.task_list.player_designer_id;

              return (
                <div className="workspace-work-session">
                  <div className="work-session-header">
                    <h3>나의 업무 목록</h3>
                    <p>오늘 해결해야 할 업무는 총 {playerTasks.length}개입니다.</p>
                  </div>
                  <div className="task-list">
                    {playerTasks.map((task, index) => {
                      const isCompleted = index < workTaskIndex;
                      const isActive = index === workTaskIndex;
                      
                      return (
                        <div 
                          key={task.task_id} 
                          className={`task-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        >
                          <div className="task-card-header">
                            <h4 className="task-name">{task.task_name}</h4>
                            {isCompleted && <span className="completed-badge">✓ 완료</span>}
                          </div>
                          {isActive && (
                            <div className="task-card-content">
                              <p className="task-description">{task.task_description}</p>
                              <div className="task-options">
                                {task.task_options.map(option => (
                                  <button 
                                    key={option.task_option_id} 
                                    className="task-option-button"
                                    onClick={() => {
                                      // (임시) 다음 업무로 이동하는 로직
                                      if (workTaskIndex < playerTasks.length - 1) {
                                        setWorkTaskIndex(workTaskIndex + 1);
                                      } else {
                                        // 모든 업무 완료 후 다음 단계로 (예: overtime)
                                        setWorkspaceState('overtime');
                                      }
                                    }}
                                  >
                                    <span className="option-text">{option.task_option_text}</span>
                                    <span className="option-summary">{option.task_option_impact_summary}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ---------------------------------- */}
            {/* --- 상태 3: Overtime / Rest --- */}
            {/* ---------------------------------- */}
            {workspaceState === 'overtime' && (() => {
              // "나의" 야근/휴식 카드를 선택 (디자인 확인을 위해 임시로 데이터 전환)
              const taskData = {
                overtime: DUMMY_OVERTIME_DATA.task_list.player_designer_id[0],
                rest: DUMMY_OVERTIME_DATA.task_list.player_developer_id[0],
              };
              const task = taskData[overtimeView];
              const themeClass = `theme-${task.overtime_task_type}`; // 'theme-overtime' or 'theme-rest'

              return (
                <div className={`workspace-overtime-session ${themeClass}`}>
                  {/* --- 디자인 확인용 임시 토글 버튼 --- */}
                  <div className="temp-overtime-toggle">
                    <button onClick={() => setOvertimeView('overtime')} disabled={overtimeView === 'overtime'}>🌙 야근 보기</button>
                    <button onClick={() => setOvertimeView('rest')} disabled={overtimeView === 'rest'}>☀️ 휴식 보기</button>
                  </div>
                  {/* ------------------------------------ */}

                  <div className="overtime-card">
                    <div className="overtime-card-header">
                      <span className="task-type-badge">
                        {task.overtime_task_type === 'overtime' ? '🌙 야근' : '☀️ 휴식'}
                      </span>
                      <h3>{task.overtime_task_name}</h3>
                    </div>
                    <p className="overtime-description">{task.overtime_task_description}</p>
                    <div className="overtime-options">
                      {task.overtime_task_options.map(option => (
                        <button 
                          key={option.overtime_task_option_id} 
                          className="overtime-option-button"
                          onClick={() => {
                            // (임시) 다음 날로 넘어가는 로직
                            setAgendaIndex(0);
                            setWorkspaceState('agenda');
                          }}
                        >
                          <span className="option-text">{option.overtime_task_option_text}</span>
                          <span className="option-summary">{option.overtime_task_option_impact_summary}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ------------------------------------- */}
            {/* --- 상태 2.5: Work Result (업무 결과) --- */}
            {/* ------------------------------------- */}
            {workspaceState === 'work_result' && (() => {
              const currentWork = DUMMY_GAME_PROTOTYPE_DATA.works[0]; // (샘플이므로 work 데이터 사용)
              const chosenOption = currentWork.options.find(o => o.id === selectedOption)!;
              return (
                <div className={`workspace-work-result ${isResultSuccess ? 'success' : 'failure'}`}>
                  <div className="result-outcome-text">
                    {isResultSuccess ? 'SUCCESS' : 'FAILURE'}
                  </div>
                  <div className="result-details-card">
                    <h4>{chosenOption.name}</h4>
                    <p className="result-message">
                      {isResultSuccess
                        ? "업무를 성공적으로 해결했습니다!"
                        : "안타깝게도, 업무 해결에 실패했습니다..."}
                    </p>
                    <div className="work-option-details">
                      <div className="detail-item reward">
                        <strong>보상:</strong> {isResultSuccess ? chosenOption.reward : '없음'}
                      </div>
                      <div className="detail-item cost">
                        <strong>비용:</strong> {chosenOption.cost}
                      </div>
                    </div>
                  </div>
                  <button
                    className="next-step-button"
                    onClick={() => {
                      // 현재는 바로 Agenda 처음으로 돌아가도록 설정 (디자인 확인용)
                      setAgendaIndex(0);
                      setWorkspaceState('agenda');
                      setSelectedOption(null);
                    }}
                  >
                    확인
                  </button>
                </div>
              );
            })()}


            {/* --- (임시) 상태 전환 버튼 --- */}
            <div className="temp-state-changer">
              <button onClick={() => { setAgendaIndex(0); setWorkspaceState('agenda'); }}>Agenda</button>
              <button onClick={() => { setWorkTaskIndex(0); setWorkspaceState('work'); }}>Work</button>
              <button onClick={() => setWorkspaceState('overtime')}>Overtime</button>
              <button onClick={() => setWorkspaceState('game_result')}>Result</button>
            </div>
          </div>
        </main>
        
        {/* --- Right Sidebar (Chat) --- */}
        <aside className="game-sidebar right">
          <div className="chat-container">
              <div className="chat-header">
                  <h3>채팅</h3>
                  <div className="other-players-list">
                      {otherPlayers.map((player: any) => (
                          <div key={player.profile_id} className="other-player">
                              <img src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} alt={player.display_name} className="other-player-avatar" />
                              <span className="other-player-name">{player.display_name}</span>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="chat-box-wrapper">
            <ChatBox 
              roomId={roomId!} 
              socket={socket} 
              profile={profile}
              chatType="game" 
              initialMessages={[]}
              onSendGameMessage={sendGameMessage}
            />
          </div>
        </div>
        </aside>
        
        {/* Modal (기존 로직 그대로 유지) */}
        <Modal
          isOpen={modalState.isOpen}
          onClose={hideModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          showCloseButton={modalState.showCloseButton}
        />
      </div>
    </>
  );
};

export default GamePage; 