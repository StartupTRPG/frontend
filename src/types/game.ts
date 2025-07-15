// LLM 게임 소켓 메시지 타입 정의

// 기본 플레이어 타입
export interface Player {
  id: string;
  name: string;
}

// 게임 단계 타입
export type GamePhase = 
  | 'waiting'
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
  player_id: string;
  player_name: string;
  player_role: string;
  player_context: Record<string, string>;
}

// 아젠다 관련 타입
export interface AgendaOption {
  agenda_option_id: string;
  agenda_option_text: string;
  agenda_option_impact_summary: string;
}

export interface Agenda {
  agenda_id: string;
  agenda_name: string;
  agenda_description: string;
  agenda_options: AgendaOption[];
}

export interface AgendaSelection {
  agenda_id: string;
  selected_option_id: string;
}

// 태스크 관련 타입
export interface TaskOption {
  task_option_id: string;
  task_option_text: string;
  task_option_impact_summary: string;
}

export interface Task {
  task_id: string;
  task_name: string;
  task_description: string;
  task_options: TaskOption[];
}

export interface TaskSelection {
  task_id: string;
  selected_option_id: string;
}

// 오버타임 관련 타입
export interface OvertimeTaskOption {
  overtime_task_option_id: string;
  overtime_task_option_text: string;
  overtime_task_option_impact_summary: string;
}

export interface OvertimeTask {
  overtime_task_id: string;
  overtime_task_type: 'overtime' | 'rest';
  overtime_task_name: string;
  overtime_task_description: string;
  overtime_task_options: OvertimeTaskOption[];
}

export interface OvertimeSelection {
  task_id: string;
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
  story: string;
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