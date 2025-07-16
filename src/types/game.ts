// LLM 게임 소켓 메시지 타입 정의

// 기본 플레이어 타입
export interface Player {
  id: string;
  name: string;
}

// 게임 단계 타입
export type GamePhase = 
  | 'waiting'
  | 'story_creation'
  | 'context_creation'
  | 'agenda_creation'
  | 'task_creation'
  | 'overtime_creation'
  | 'playing'
  | 'context_update'
  | 'explanation'
  | 'result'
  | 'finished';

// 플레이어 컨텍스트 타입
export interface PlayerContext {
  id: string;
  name: string;
  role: string;
  context: Record<string, string>;
}

// 아젠다 관련 타입
export interface AgendaOption {
  id: string;
  text: string;
  impact_summary: string;
}

export interface Agenda {
  id: string;
  name: string;
  description: string;
  options: AgendaOption[];
}

export interface AgendaSelection {
  id: string;
  selected_option_id: string;
}

// 태스크 관련 타입
export interface TaskOption {
  id: string;
  text: string;
  impact_summary: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  options: TaskOption[];
}

export interface TaskSelection {
  id: string;
  selected_option_id: string;
}

// 오버타임 관련 타입
export interface OvertimeTaskOption {
  id: string;
  text: string;
  impact_summary: string;
}

export interface OvertimeTask {
  id: string;
  type: string;
  name: string;
  description: string;
  options: OvertimeTaskOption[];
}

export interface OvertimeSelection {
  id: string;
  selected_option_id: string;
}

// 게임 결과 타입
export interface GameResult {
  success: boolean;
  summary: string;
}

export interface PlayerRanking {
  rank: number;
  player_id: string;
  player_name: string;
  player_role: string;
  player_evaluation: string;
}

// 클라이언트 → 서버 요청 타입
export interface CreateGameRequest {
  room_id: string;
  player_list: Player[];
}

export interface CreateContextRequest {
  room_id: string;
  max_turn: number;
  story: string; // story를 입력으로 받음
}

export interface CreateAgendaRequest {
  room_id: string;
}

export interface CreateTaskRequest {
  room_id: string;
}

export interface CreateOvertimeRequest {
  room_id: string;
}

export interface UpdateContextRequest {
  room_id: string;
  agenda_selections: Record<string, AgendaSelection>;
  task_selections: Record<string, TaskSelection[]>;
  overtime_selections: Record<string, OvertimeSelection[]>;
}

export interface CreateExplanationRequest {
  room_id: string;
}

export interface CalculateResultRequest {
  room_id: string;
}

export interface GetGameProgressRequest {
  room_id: string;
}

// 서버 → 클라이언트 응답 타입
export interface GameCreatedResponse {
  room_id: string;
  story: string; // story만 반환
  phase: 'context_creation';
}

export interface ContextCreatedResponse {
  room_id: string;
  company_context: Record<string, string>;
  player_context_list: PlayerContext[];
  phase: 'agenda_creation';
}

export interface AgendaCreatedResponse {
  room_id: string;
  description: string;
  agenda_list: Agenda[];
  phase: 'task_creation';
}

export interface TaskCreatedResponse {
  room_id: string;
  task_list: Record<string, Task[]>;
  phase: 'overtime_creation';
}

export interface OvertimeCreatedResponse {
  room_id: string;
  task_list: Record<string, OvertimeTask[]>;
  phase: 'playing';
}

export interface ContextUpdatedResponse {
  room_id: string;
  company_context: Record<string, string>;
  player_context_list: PlayerContext[];
  phase: 'explanation';
}

export interface ExplanationCreatedResponse {
  room_id: string;
  explanation: string;
  phase: 'result';
}

export interface ResultCalculatedResponse {
  room_id: string;
  game_result: GameResult;
  player_rankings: PlayerRanking[];
  phase: 'finished';
}

export interface GameProgressResponse {
  room_id: string;
  phase: GamePhase;
  current_turn: number;
  max_turn: number;
  story?: string;
  company_context?: Record<string, string>;
  player_context_list?: PlayerContext[];
  agenda_list?: Agenda[];
  task_list?: Record<string, Task[]>;
  overtime_task_list?: Record<string, OvertimeTask[]>;
  explanation?: string;
  game_result?: GameResult;
  player_rankings?: PlayerRanking[];
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  finished_at?: string;
}

export interface ErrorResponse {
  message: string;
} 