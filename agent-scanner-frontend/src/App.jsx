import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Terminal, Server,
  AlertTriangle, CheckCircle, RefreshCw, Play, FileText,
  Layers, Download, Copy, Plus, Activity, Database,
  Lock, X, ArrowRight, Eye, Wrench, Printer, FileCode, Trash2,
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Code,
  Clock, Calendar, Info, Edit3, Sliders, Target, Edit2
} from 'lucide-react';

const KOREAN_TC_NAMES = {
  // 엔터프라이즈 AI 에이전트 범용 보안 점검 (12종 공격 + 1종 정상 베이스라인 + 커스텀)
  'TEST-AI-001': '직접 프롬프트 주입 및 시스템 가드레일 우회',
  'TEST-AI-002': '크레센도 다단계 유도 및 난독화 탈옥',
  'TEST-AI-003': '외부 데이터 문맥 간접 프롬프트 주입',
  'TEST-AI-004': '고객·임직원 개인정보 및 금융 자격증명 노출',
  'TEST-AI-005': 'LLM 공급사 API Key 및 클라우드 비밀키 유출',
  'TEST-AI-006': 'RAG 벡터 지식베이스 대외비 문서 탈취',
  'TEST-AI-007': '비인가 데이터베이스 직접 쿼리 및 위장 은폐',
  'TEST-AI-008': '도구 매개 프롬프트-SQL 인젝션',
  'TEST-AI-009': '도구 매개변수 변조 및 수평적 권한 상승',
  'TEST-AI-010': '내부 사설망 및 클라우드 메타데이터 SSRF',
  'TEST-AI-011': '기관 사칭 페르소나 하이재킹 및 피싱 유도',
  'TEST-AI-012': '무한 재귀 호출 DoS 및 다운스트림 XSS',
  'TEST-AI-SAFE-001': '정상 서비스 이용 질의 (오탐 방지 베이스라인)',
  'TEST-AI-013': '시스템 프롬프트 및 내부 보안 정책 노출',
  'TEST-AI-014': '상세 오류 스택트레이스 및 내부 접속 정보 유출',
  'TEST-AI-015': '에이전트 서비스 계정 과도 권한 남용',
  'TEST-AI-SAFE-002': '정상 본인 주문 조회 (오탐 방지 및 PII 마스킹)',
  'TEST-CUSTOM-001': '사용자 정의 동적 프롬프트 주입 점검'
};

const DAY_LABELS = {
  'EVERYDAY': '매일',
  'MON': '매주 월요일',
  'TUE': '매주 화요일',
  'WED': '매주 수요일',
  'THU': '매주 목요일',
  'FRI': '매주 금요일',
  'SAT': '매주 토요일',
  'SUN': '매주 일요일'
};

const getCategoryBadge = (category, testCaseId) => {
  if (testCaseId && testCaseId.startsWith('TEST-AI-SAFE')) {
    return { label: '정상 동작 검증', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
  }
  const map = {
    'PROMPT_INJECTION': { label: '프롬프트 주입', color: '#be123c', bg: '#fff1f2', border: '#fda4af' },
    'SENSITIVE_DATA_LEAKAGE': { label: '민감정보 유출', color: '#b45309', bg: '#fefce8', border: '#fde047' },
    'EXCESSIVE_AGENCY': { label: '과도한 권한', color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd' },
    'TOOL_ABUSE': { label: '도구 오남용', color: '#be185d', bg: '#fdf2f8', border: '#f9a8d4' },
    'BASELINE': { label: '정상 동작 검증', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' }
  };
  return map[category] || { label: category, color: '#475569', bg: '#f8fafc', border: '#cbd5e1' };
};

const getDomainBadge = (domain) => {
  return { label: 'AI Agent', color: '#4338ca', bg: '#eef2ff', border: '#a5b4fc' };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adapter, setAdapter] = useState('mock');
  const [selectedTargetId, setSelectedTargetId] = useState('mock');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [findings, setFindings] = useState([]);
  const [catalog, setCatalog] = useState({ items: [], testCases: [] });
  const [markdownReport, setMarkdownReport] = useState('');
  const [reportFormat, setReportFormat] = useState('kisa_a4'); // 'kisa_a4' | 'markdown'
  const [catalogImportanceFilter, setCatalogImportanceFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL'); // 'ALL' | 'PROMPT_INJECTION' | 'EXCESSIVE_AGENCY' | 'SENSITIVE_DATA_LEAKAGE' | 'TOOL_ABUSE'
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(10); // 10 items per page default
  const [expandedRowIds, setExpandedRowIds] = useState(new Set()); // Set of expanded testCase IDs

  const toggleRowExpanded = (id) => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAll = (currentList) => {
    if (expandedRowIds.size === currentList.length) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(currentList.map(t => t.id)));
    }
  };
  
  // Modals state
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [remediationModal, setRemediationModal] = useState({ open: false, findingId: '', note: '' });
  const [targetModal, setTargetModal] = useState({ open: false, name: '', baseUrl: '', description: '', targetType: 'AI_AGENT', adapterType: 'HTTP' });
  const [editTargetModal, setEditTargetModal] = useState({ open: false, id: null, name: '', baseUrl: '', description: '', targetType: 'AI_AGENT', adapterType: 'HTTP' });
  const [scheduleModal, setScheduleModal] = useState({ open: false, name: '', targetId: '', dayOfWeek: 'MON', timeOfDay: '09:00', adapterName: 'mock' });
  const [allScans, setAllScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [toast, setToast] = useState(null);

  // Table pagination & filter states
  const [dashboardFilter, setDashboardFilter] = useState('ALL'); // 'ALL' | 'FAIL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'PASS'
  const [dashboardPage, setDashboardPage] = useState(1);
  const [dashboardPageSize, setDashboardPageSize] = useState(10); // 10, 20, 50, 0 (0 = all)
  const [remediationFilter, setRemediationFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'OPEN' | 'RESOLVED'
  const [remediationPage, setRemediationPage] = useState(1);
  const [remediationPageSize, setRemediationPageSize] = useState(10); // 10, 20, 50, 0 (0 = all)

  // Scope (점검 범위) state
  const SCOPE_DEFINITIONS = [
    { key: 'PROMPT_INJECTION', label: '프롬프트 주입 & 탈옥', count: 5, isCore: true, desc: '직접/간접 주입, 크레센도 탈옥, 정상 질의 베이스라인 점검' },
    { key: 'SENSITIVE_DATA_LEAKAGE', label: '민감정보 & 비밀키 유출', count: 4, isCore: true, desc: '개인식별정보(PII), API Key, RAG 벡터 지식베이스, 상세 오류 정보 노출' },
    { key: 'EXCESSIVE_AGENCY', label: '과도한 권한 & 시스템 침투', count: 6, isCore: true, desc: '비인가 DB 조회, SQLi, 타인 정보 조회(BOLA), SSRF, 과도한 Tool 권한' },
    { key: 'TOOL_ABUSE', label: '도구 오남용 & DoS', count: 2, isCore: true, desc: '기관 사칭 페르소나 피싱 알림, 반복 Tool 호출에 따른 자원 고갈' }
  ];

  const [selectedScopes, setSelectedScopes] = useState(['PROMPT_INJECTION', 'SENSITIVE_DATA_LEAKAGE', 'EXCESSIVE_AGENCY', 'TOOL_ABUSE']);

  const toggleScope = (key) => {
    setSelectedScopes(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) {
          showToast('최소 하나의 점검 범위는 선택되어 있어야 합니다.', 'warning');
          return prev;
        }
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const selectAllScopes = () => {
    setSelectedScopes(SCOPE_DEFINITIONS.map(s => s.key));
  };

  const resetDefaultScopes = () => {
    setSelectedScopes(['PROMPT_INJECTION', 'SENSITIVE_DATA_LEAKAGE', 'EXCESSIVE_AGENCY', 'TOOL_ABUSE']);
  };

  const activeScopeCount = SCOPE_DEFINITIONS
    .filter(s => selectedScopes.includes(s.key))
    .reduce((sum, s) => sum + s.count, 0);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const extractErrorMessage = (data, res, fallback = '요청 처리에 실패했습니다.') => {
    let msg = data?.message || data?.error || (res?.status ? `서버 응답 오류 (HTTP ${res.status})` : fallback);
    if (typeof msg === 'string') {
      if (msg.includes('could not execute') || msg.includes('SQL') || msg.includes('Hibernate') || msg.includes('character varying') || msg.includes('Exception')) {
        return '서버 내부 처리 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      }
    }
    return msg;
  };

  useEffect(() => {
    loadTargets();
    loadCatalog();
    loadFindings();
    loadLatestScan();
    loadSchedules();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      if (selectedScanId && (!markdownReport || executions.length === 0)) {
        loadReport(selectedScanId);
        selectHistoricalScan(selectedScanId);
      } else if (!selectedScanId || executions.length === 0) {
        loadLatestScan();
      }
    }
  }, [activeTab]);

  // Dynamic Browser Tab Title
  useEffect(() => {
    if (scanning) {
      document.title = '진단 실행 중... | AgentScanner';
      return;
    }
    const tabTitles = {
      dashboard: 'AgentScanner | AI & Cloud Security',
      targets: '점검 타깃 관리 | AgentScanner',
      remediation: '취약점 조치 관리 | AgentScanner',
      catalog: '보안 점검 카탈로그 | AgentScanner',
      schedules: '정기 점검 스케줄 | AgentScanner',
      reports: '보안 진단 보고서 | AgentScanner'
    };
    document.title = tabTitles[activeTab] || 'AgentScanner | AI & Cloud Security';
  }, [activeTab, scanning]);

  // API Callers
  const loadTargets = async () => {
    try {
      const res = await fetch('/api/v1/targets');
      const data = await res.json();
      if (data.success) {
        const loadedTargets = data.data || [];
        setTargets(loadedTargets);
        setSelectedTargetId(prev => {
          if (prev && prev !== 'mock' && loadedTargets.some(t => String(t.id) === String(prev))) {
            return prev;
          }
          return 'mock';
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/v1/scan/catalog');
      const data = await res.json();
      if (data.success) setCatalog(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadFindings = async () => {
    try {
      const res = await fetch('/api/v1/scan/findings');
      const data = await res.json();
      if (data.success) setFindings(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadReport = async (scanId) => {
    try {
      const res = await fetch(`/api/v1/scan/reports/${scanId}/markdown`);
      if (res.ok) {
        const text = await res.text();
        setMarkdownReport(text);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLatestScan = async (targetScanId, currentTargetId = selectedTargetId) => {
    try {
      const res = await fetch('/api/v1/scan/executions');
      const data = await res.json();
      if (data.success && data.data) {
        const rawScans = data.data;
        setAllScans(rawScans);

        const tScans = (currentTargetId === 'mock')
          ? rawScans.filter(s => !s.targetAgentId || (s.adapterName && s.adapterName.toLowerCase().startsWith('mock')))
          : rawScans.filter(s => String(s.targetAgentId) === String(currentTargetId));

        if (tScans.length > 0) {
          const scanToLoad = targetScanId
            ? (tScans.find(s => (s.id || s.scanId) === targetScanId) || tScans[0])
            : tScans[0];
          const scanId = scanToLoad.id || scanToLoad.scanId;
          setSelectedScanId(scanId);
          const resResults = await fetch(`/api/v1/scan/executions/${scanId}`);
          const dataResults = await resResults.json();
          if (dataResults.success && dataResults.data && dataResults.data.length > 0) {
            setExecutions(dataResults.data);
            loadReport(scanId);
          }
        } else {
          setSelectedScanId('');
          setExecutions([]);
          setMarkdownReport('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTargetChange = (newTargetId) => {
    setSelectedTargetId(newTargetId);
    setDashboardPage(1);

    const targetObj = targets.find(t => String(t.id) === String(newTargetId));
    setSelectedScopes(['PROMPT_INJECTION', 'SENSITIVE_DATA_LEAKAGE', 'EXCESSIVE_AGENCY', 'TOOL_ABUSE']);

    const tScans = (newTargetId === 'mock')
      ? allScans.filter(s => !s.targetAgentId || (s.adapterName && s.adapterName.toLowerCase().startsWith('mock')))
      : allScans.filter(s => String(s.targetAgentId) === String(newTargetId));

    if (tScans.length > 0) {
      const latestScan = tScans[0];
      const scanId = latestScan.id || latestScan.scanId;
      setSelectedScanId(scanId);
      selectHistoricalScan(scanId);
      showToast(`[${targetObj ? targetObj.name : '내장 샌드박스'}] 타깃의 최신 진단 데이터로 전환되었습니다.`, 'info');
    } else {
      setSelectedScanId('');
      setExecutions([]);
      setMarkdownReport('');
      showToast(`[${targetObj ? targetObj.name : newTargetId}] 타깃으로 전환되었습니다. (진단 이력 없음)`, 'info');
    }
  };

  const selectHistoricalScan = async (scanId) => {
    if (!scanId) return;
    setSelectedScanId(scanId);
    setDashboardPage(1);
    try {
      const resResults = await fetch(`/api/v1/scan/executions/${scanId}`);
      const dataResults = await resResults.json();
      if (dataResults.success && dataResults.data) {
        setExecutions(dataResults.data);
        loadReport(scanId);
        showToast(`[${scanId}] 회차 진단 데이터로 전환되었습니다.`, 'info');
      }
    } catch (e) {
      showToast(`이력 조회 실패: ${e.message}`, 'error');
    }
  };

  // Schedule API Callers
  const loadSchedules = async () => {
    try {
      const res = await fetch('/api/v1/schedules');
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleModal.name.trim()) {
      showToast('스케줄 명칭을 입력해주세요.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/v1/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scheduleModal.name,
          targetId: (scheduleModal.targetId && scheduleModal.targetId !== 'mock') ? Number(scheduleModal.targetId) : null,
          dayOfWeek: scheduleModal.dayOfWeek,
          timeOfDay: scheduleModal.timeOfDay,
          adapterName: scheduleModal.adapterName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('정기 점검 스케줄이 등록되었습니다.', 'success');
        setScheduleModal({ open: false, name: '', targetId: '', dayOfWeek: 'MON', timeOfDay: '09:00', adapterName: 'mock' });
        loadSchedules();
      } else {
        showToast(`등록 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`등록 오류: ${e.message}`, 'error');
    }
  };

  const handleToggleSchedule = async (id) => {
    try {
      const res = await fetch(`/api/v1/schedules/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        showToast(`스케줄 상태가 변경되었습니다 (${data.data.enabled ? '활성화' : '일시정지'}).`, 'success');
        loadSchedules();
      }
    } catch (e) {
      showToast(`상태 변경 오류: ${e.message}`, 'error');
    }
  };

  const handleDeleteSchedule = async (id, name) => {
    if (!window.confirm(`'${name}' 스케줄을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/v1/schedules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('스케줄이 삭제되었습니다.', 'success');
        loadSchedules();
      }
    } catch (e) {
      showToast(`삭제 오류: ${e.message}`, 'error');
    }
  };

  const handleRunScheduleNow = async (id, name) => {
    showToast(`'${name}' 스케줄 즉시 실행 중...`);
    try {
      const res = await fetch(`/api/v1/schedules/${id}/run-now`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const execs = data.data.executions;
        setExecutions(execs);
        const scanId = execs[0]?.scanId;
        if (scanId) {
          setSelectedScanId(scanId);
          loadReport(scanId);
        }
        showToast(`스케줄 점검 완료 (총 ${execs.length}건 실행)!`, 'success');
        loadSchedules();
        loadLatestScan(scanId);
        loadFindings();
      } else {
        showToast(`실행 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`실행 오류: ${e.message}`, 'error');
    }
  };

  const handlePrintPdf = () => {
    if (executions.length === 0 && !markdownReport) {
      showToast('스캔을 먼저 실행하여 보고서를 생성해주세요.', 'error');
      return;
    }
    setReportFormat('kisa_a4');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadHtmlReport = () => {
    const el = document.getElementById('kisa-official-report');
    if (!el) {
      showToast('보고서 요소가 준비되지 않았습니다.', 'error');
      return;
    }
    const scanId = executions[0]?.scanId || selectedScanId || 'LATEST';
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security_Assessment_Report_${scanId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 2rem; color: #0f172a; line-height: 1.6; }
    .kisa-a4-document { max-width: 960px; margin: 0 auto; background: #ffffff; padding: 3rem 3.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; color: #1e293b; font-weight: 700; }
    .report-row-hidden { display: table-row !important; }
    .report-pagination-nav { display: none !important; }
    @media print {
      body { background: #fff; padding: 0; }
      .kisa-a4-document { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      @page { size: A4 portrait; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="kisa-a4-document">
    ${el.innerHTML}
  </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Security_Assessment_Report_${scanId}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('단독 HTML 보고서 파일이 다운로드되었습니다.', 'success');
  };

  // Run Security Scan
  const handleRunScan = async () => {
    if (selectedScopes.length === 0) {
      showToast('최소 하나의 점검 범위는 선택되어 있어야 합니다.', 'warning');
      return;
    }
    const targetObj = targets.find(t => String(t.id) === String(selectedTargetId));
    const targetLabel = targetObj ? `${targetObj.name} (#${targetObj.id})` : '내장 샌드박스 (Built-in Sandbox)';
    setScanning(true);
    showToast(`통합 보안 진단 스캔을 시작합니다 (대상: ${targetLabel}, 선택: ${selectedScopes.length}개 영역 / ${activeScopeCount}종)...`);
    try {
      let url = (selectedTargetId && selectedTargetId !== 'mock')
        ? `/api/v1/scan/run?targetId=${selectedTargetId}`
        : `/api/v1/scan/run?adapter=mock`;
      url += `&categories=${selectedScopes.join(',')}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const execs = data.data.executions;
        setExecutions(execs);
        setDashboardPage(1);
        setScanResult(data.data);
        const scanId = execs[0]?.scanId;
        if (scanId) {
          setSelectedScanId(scanId);
          loadReport(scanId);
        }
        loadLatestScan(scanId);
        loadFindings();
        showToast(`보안 진단 완료: 선택된 ${selectedScopes.length}개 영역 총 ${execs.length}건 점검 완료!`, 'success');
      } else {
        showToast(`스캔 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`스캔 통신 오류: ${e.message}`, 'error');
    } finally {
      setScanning(false);
    }
  };

  // Reset All Scan Data
  const handleResetData = async () => {
    if (!window.confirm('모든 진단 이력(스캔, 테스트 실행 결과, 취약점 데이터)을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    try {
      const res = await fetch('/api/v1/scan/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAllScans([]);
        setSelectedScanId('');
        setExecutions([]);
        setFindings([]);
        setMarkdownReport('');
        setScanResult(null);
        showToast('모든 진단 이력 및 취약점 데이터가 초기화되었습니다.', 'success');
      } else {
        showToast(extractErrorMessage(data, res, '데이터 초기화에 실패했습니다.'), 'error');
      }
    } catch (e) {
      showToast(`초기화 실패: ${e.message}`, 'error');
    }
  };

  // Target Actions
  const handlePingTarget = async (id) => {
    showToast(`타깃 #${id} 연결 테스트 수행 중...`);
    try {
      const res = await fetch(`/api/v1/targets/${id}/ping`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const isOk = data.data.status === 'ONLINE';
        showToast(
          `타깃 #${id} 연결 테스트 완료: ${isOk ? '정상 연결 (VERIFIED)' : '연결 실패 (UNREACHABLE)'}`,
          isOk ? 'success' : 'warning'
        );
        loadTargets();
      } else {
        showToast(`연결 테스트 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`연결 테스트 오류: ${e.message}`, 'error');
    }
  };

  const handleDeleteTarget = async (id, name) => {
    if (!window.confirm(`타깃 '${name}' (#${id})을(를) 정말 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/v1/targets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`타깃 '${name}' 삭제 완료!`, 'success');
        setSelectedTargetId(prev => String(prev) === String(id) ? 'mock' : prev);
        loadTargets();
      } else {
        showToast(`삭제 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`삭제 실패: ${e.message}`, 'error');
    }
  };

  const handleCreateTarget = async () => {
    if (!targetModal.name) {
      showToast('타깃 명칭을 입력하세요.', 'error');
      return;
    }
    const isMock = targetModal.adapterType === 'MOCK';
    if (!isMock && !targetModal.baseUrl) {
      showToast('HTTP 연동 시 엔드포인트 URL을 입력하세요.', 'error');
      return;
    }
    const payload = {
      ...targetModal,
      baseUrl: isMock ? (targetModal.baseUrl || 'mock://internal') : targetModal.baseUrl
    };
    try {
      const res = await fetch('/api/v1/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`타깃 [${data.data.name}] 등록 완료!`, 'success');
        setTargetModal({ open: false, name: '', baseUrl: '', description: '', targetType: 'AI_AGENT', adapterType: 'HTTP' });
        loadTargets();
      } else {
        showToast(`등록 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`등록 실패: ${e.message}`, 'error');
    }
  };

  const handleOpenEditTarget = (target) => {
    setEditTargetModal({
      open: true,
      id: target.id,
      name: target.name || '',
      baseUrl: target.baseUrl === 'mock://internal' ? '' : (target.baseUrl || ''),
      adapterType: target.adapterType || 'HTTP',
      targetType: target.targetType || 'AI_AGENT',
      description: target.description || ''
    });
  };

  const handleSaveEditTarget = async () => {
    if (!editTargetModal.name || !editTargetModal.name.trim()) {
      showToast('타깃 명칭을 입력하세요.', 'error');
      return;
    }
    const isMock = editTargetModal.adapterType === 'MOCK';
    if (!isMock && (!editTargetModal.baseUrl || !editTargetModal.baseUrl.trim())) {
      showToast('HTTP 연동 시 엔드포인트 URL을 입력하세요.', 'error');
      return;
    }
    const payload = {
      name: editTargetModal.name.trim(),
      baseUrl: isMock ? (editTargetModal.baseUrl?.trim() || 'mock://internal') : editTargetModal.baseUrl.trim(),
      adapterType: editTargetModal.adapterType,
      targetType: editTargetModal.targetType || 'AI_AGENT',
      description: editTargetModal.description ? editTargetModal.description.trim() : ''
    };
    try {
      const res = await fetch(`/api/v1/targets/${editTargetModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`타깃 [${data.data.name}] (#${editTargetModal.id}) 수정 완료!`, 'success');
        setEditTargetModal({ open: false, id: null, name: '', baseUrl: '', description: '', targetType: 'AI_AGENT', adapterType: 'HTTP' });
        loadTargets();
      } else {
        showToast(`수정 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`수정 실패: ${e.message}`, 'error');
    }
  };


  // Remediation & Re-Test Actions
  const handleSaveRemediation = async () => {
    const { findingId, note } = remediationModal;
    try {
      const res = await fetch(`/api/v1/scan/findings/${findingId}/remediate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remediationNote: note })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`취약점 [${findingId}] 조치 내역이 저장되었습니다!`, 'success');
        setRemediationModal({ open: false, findingId: '', note: '' });
        loadFindings();
      } else {
        showToast(`저장 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`저장 실패: ${e.message}`, 'error');
    }
  };

  const handleRetestFinding = async (findingId) => {
    showToast(`취약점 [${findingId}] 핀포인트 재점검(Re-Test) 실행 중...`);
    try {
      const res = await fetch(`/api/v1/scan/findings/${findingId}/re-test?adapter=mock`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const result = data.data.result;
        if (result === 'PASS') {
          showToast(`재점검 통과 [PASS]! 상태가 RESOLVED로 종결되었습니다.`, 'success');
        } else {
          showToast(`재점검 결과: 여전히 [FAIL] 상태입니다. 추가 조치가 필요합니다.`, 'error');
        }
        loadFindings();
      } else {
        showToast(`재점검 실패: ${extractErrorMessage(data, res)}`, 'error');
      }
    } catch (e) {
      showToast(`재점검 통신 오류: ${e.message}`, 'error');
    }
  };

  // Metrics calculation
  const totalCount = executions.length;
  const failCount = executions.filter(e => e.result === 'FAIL').length;
  const passCount = executions.filter(e => e.result === 'PASS').length;
  const avgRisk = totalCount > 0
    ? Math.round(executions.reduce((acc, e) => acc + (e.finding?.riskScore?.score ?? 0), 0) / totalCount)
    : 0;

  const targetScans = useMemo(() => {
    if (selectedTargetId === 'mock') {
      return allScans.filter(s => !s.targetAgentId || (s.adapterName && s.adapterName.toLowerCase().startsWith('mock')));
    }
    return allScans.filter(s => String(s.targetAgentId) === String(selectedTargetId));
  }, [allScans, selectedTargetId]);

  const currentScan = targetScans.find(s => (s.id || s.scanId) === selectedScanId) || targetScans[0] || null;
  const scanDateFormatted = currentScan?.startedAt
    ? `${new Date(currentScan.startedAt).toLocaleDateString()} ${new Date(currentScan.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : (executions[0]?.executedAt
      ? `${new Date(executions[0].executedAt).toLocaleDateString()} ${new Date(executions[0].executedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : '-');
  const selectedTargetObj = targets.find(t => String(t.id) === String(selectedTargetId));
  const scanTargetName = selectedTargetObj
    ? `${selectedTargetObj.name} (#${selectedTargetObj.id})`
    : (selectedTargetId === 'mock' ? '내장 샌드박스 모의 환경 (Built-in Sandbox)' : '미지정 타깃');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* 1. Header */}
      <header style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '1.1rem 2.2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            borderRadius: '0.75rem',
            padding: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-main)' }}>AgentScanner</span>
              <span style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #bfdbfe'
              }}>Enterprise</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              AI Agent & Cloud Infrastructure 통합 보안 진단 플랫폼
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            color: '#15803d',
            fontWeight: 600
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulseGlow 2s infinite' }}></span>
            Controller Online
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            color: '#1d4ed8',
            fontWeight: 600
          }}>
            <Database size={14} />
            Database Online
          </div>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav style={{
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 2.2rem',
        display: 'flex',
        gap: '0.5rem'
      }}>
        {[
          { id: 'dashboard', label: '진단 대시보드', icon: Activity },
          { id: 'targets', label: '점검 타깃 관리', icon: Server },
          { id: 'schedules', label: '정기 점검 스케줄', icon: Clock },
          { id: 'remediation', label: '조치 & 재점검 (Re-Test)', icon: Wrench },
          { id: 'catalog', label: '보안 점검 카탈로그', icon: Layers },
          { id: 'reports', label: '보안 진단 보고서', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                padding: '0.95rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 3. Main Content Container */}
      <main style={{ flex: 1, padding: '2rem 2.2rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Top Scan Bar */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.75rem',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>통합 보안 진단 실행소</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    AI 에이전트(LLM) 런타임 지능 보안 진단 (OWASP Top 10 for LLM 2026)
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* 1. Target Selector (점검 대상 타깃 선택) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '0.45rem 0.75rem'
                  }}>
                    <Target size={14} color="var(--primary)" />
                    <select
                      value={selectedTargetId}
                      onChange={(e) => handleTargetChange(e.target.value)}
                      title="점검 대상 타깃 선택"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        maxWidth: '280px'
                      }}
                    >
                      <option value="mock">내장 샌드박스 모의 환경 (Built-in Sandbox)</option>
                      {targets.map(t => (
                        <option key={t.id} value={String(t.id)}>
                          [타깃 #{t.id}] {t.name} ({t.baseUrl})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Target's Historical Scan Selector (해당 타깃의 진단 회차 이력) */}
                  {targetScans.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.45rem 0.75rem' }}>
                      <Calendar size={14} color="var(--primary)" />
                      <select
                        value={selectedScanId}
                        onChange={(e) => selectHistoricalScan(e.target.value)}
                        title="선택된 타깃의 스캔 회차 선택"
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none',
                          maxWidth: '240px'
                        }}
                      >
                        {targetScans.map((s, idx) => (
                          <option key={s.id} value={s.id}>
                            {idx === 0 ? '[최신] ' : ''}
                            {new Date(s.startedAt).toLocaleDateString()} {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '0.5rem',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.78rem',
                      color: '#64748b',
                      fontWeight: 600
                    }}>
                      <Clock size={13} color="#94a3b8" />
                      진단 이력 없음 (첫 스캔 필요)
                    </div>
                  )}

                  {/* 3. Run Scan Button (보안 스캔 시작) */}
                  <button
                    onClick={handleRunScan}
                    disabled={scanning}
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      border: '1px solid #1d4ed8',
                      padding: '0.65rem 1.35rem',
                      borderRadius: '0.5rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: scanning ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {scanning ? (
                      <>
                        <RefreshCw size={16} className="spinner" />
                        스캔 수행 중...
                      </>
                    ) : (
                      <>
                        <Play size={16} fill="#fff" />
                        보안 스캔 시작
                      </>
                    )}
                  </button>

                  {/* 4. Reset Data Button (진단 데이터 초기화) */}
                  <button
                    onClick={handleResetData}
                    disabled={scanning}
                    type="button"
                    title="모든 진단 이력 및 취약점 데이터 초기화"
                    style={{
                      background: 'var(--bg-main)',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '0.5rem',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      cursor: scanning ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Trash2 size={15} />
                    <span>데이터 초기화</span>
                  </button>
                </div>
              </div>

              {/* Scope Selection Toolbar */}
              <div style={{
                marginTop: '1.15rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <Sliders size={14} color="var(--primary)" />
                    점검 범위 (Scope):
                  </span>

                  {SCOPE_DEFINITIONS.map(scope => {
                    const isSelected = selectedScopes.includes(scope.key);
                    return (
                      <button
                        key={scope.key}
                        onClick={() => toggleScope(scope.key)}
                        type="button"
                        title={`${scope.desc} (클릭하여 활성/비활성)`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected
                            ? (scope.isCore ? '1px solid #93c5fd' : '1px solid #86efac')
                            : '1px solid var(--border-color)',
                          background: isSelected
                            ? (scope.isCore ? '#eff6ff' : '#f0fdf4')
                            : 'var(--bg-main)',
                          color: isSelected
                            ? (scope.isCore ? '#1d4ed8' : '#15803d')
                            : 'var(--text-muted)'
                        }}
                      >
                        <span style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected
                            ? (scope.isCore ? '#2563eb' : '#16a34a')
                            : '#cbd5e1',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 800
                        }}>
                          {isSelected ? '✓' : ''}
                        </span>
                        <span>{scope.label}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.05rem 0.35rem',
                          borderRadius: '9999px',
                          background: isSelected
                            ? (scope.isCore ? '#dbeafe' : '#dcfce7')
                            : 'rgba(0,0,0,0.05)',
                          color: isSelected
                            ? (scope.isCore ? '#1e40af' : '#166534')
                            : 'var(--text-dim)'
                        }}>
                          {scope.count}종
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginRight: '0.25rem'
                  }}>
                    선택: <strong style={{ color: 'var(--primary)' }}>{activeScopeCount}종</strong> / {SCOPE_DEFINITIONS.reduce((sum, s) => sum + s.count, 0)}종
                  </span>
                  <button
                    onClick={selectAllScopes}
                    type="button"
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={resetDefaultScopes}
                    type="button"
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    기본값 초기화
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State Banner when Target has no scans */}
            {executions.length === 0 && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.75rem',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1d4ed8',
                    flexShrink: 0
                  }}>
                    <Info size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.92rem' }}>
                      선택된 타깃 [{scanTargetName}]의 진단 이력이 아직 없습니다.
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#3b82f6', marginTop: '0.2rem' }}>
                      우측 상단의 <strong>[보안 스캔 시작]</strong> 버튼을 클릭하여 첫 보안 취약점 진단을 실행해 주세요.
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRunScan}
                  disabled={scanning}
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.55rem 1.15rem',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <Play size={14} fill="#fff" />
                  지금 진단 실행
                </button>
              </div>
            )}

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>총 점검 항목</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.35rem 0', color: 'var(--text-main)' }}>{totalCount}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{totalCount > 0 ? `선택된 ${selectedScopes.length}개 영역 점검 결과` : `선택 대상: ${activeScopeCount}종`}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: '4px solid #ef4444', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>취약점 검출 (FAIL)</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.35rem 0', color: '#dc2626' }}>{failCount}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>조치 필요 (Status: OPEN)</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: '4px solid #22c55e', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>양호 판정 (PASS)</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.35rem 0', color: '#16a34a' }}>{passCount}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>보안 기준 충족</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: '4px solid #f59e0b', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>종합 위험도 점수</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.35rem 0', color: '#d97706' }}>
                  {totalCount > 0 ? `${avgRisk}점` : '-'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {avgRisk >= 70 ? 'HIGH 위험 등급' : (avgRisk >= 40 ? 'MEDIUM 위험 등급' : 'LOW 양호')}
                </div>
              </div>
            </div>

            {/* Assessment Findings Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>보안 진단 및 취약점 평가 결과 목록</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                  {executions.length > 0 ? `Scan ID: ${executions[0].scanId}` : '스캔 대기 중'}
                </span>
              </div>

              {/* Filter Chips Toolbar */}
              <div style={{
                padding: '0.65rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                  필터 분류:
                </span>
                {[
                  { key: 'ALL', label: `전체 (${executions.length})` },
                  { key: 'FAIL', label: `취약 FAIL (${executions.filter(e => e.result === 'FAIL').length})`, color: '#dc2626' },
                  { key: 'CRITICAL', label: `CRITICAL (${executions.filter(e => e.finding?.riskScore?.level === 'CRITICAL').length})`, color: '#b91c1c' },
                  { key: 'HIGH', label: `상 HIGH (${executions.filter(e => e.importance === 'HIGH').length})`, color: '#ea580c' },
                  { key: 'MEDIUM', label: `중 MED (${executions.filter(e => e.importance === 'MEDIUM').length})`, color: '#d97706' },
                  { key: 'LOW', label: `하 LOW (${executions.filter(e => e.importance === 'LOW').length})`, color: '#16a34a' },
                  { key: 'PASS', label: `양호 PASS (${executions.filter(e => e.result === 'PASS').length})`, color: '#16a34a' },
                ].map(chip => {
                  const isActive = dashboardFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      onClick={() => {
                        setDashboardFilter(chip.key);
                        setDashboardPage(1);
                      }}
                      style={{
                        padding: '0.22rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.73rem',
                        fontWeight: isActive ? 800 : 600,
                        border: isActive ? `1.5px solid ${chip.color || 'var(--primary)'}` : '1px solid var(--border-color)',
                        background: isActive ? (chip.color ? `${chip.color}18` : 'rgba(99, 102, 241, 0.12)') : 'var(--bg-card)',
                        color: isActive ? (chip.color || 'var(--primary)') : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>TEST ID</th>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>영역 (Domain / Category)</th>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>중요도</th>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>판정 결과</th>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>위험도</th>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>점수</th>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>조치 상태</th>
                      <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>증거 확인</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                          상단의 <b>[보안 스캔 시작]</b> 버튼을 클릭하여 진단을 실행하세요.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const filteredExecutions = executions.filter(exec => {
                          if (dashboardFilter === 'ALL') return true;
                          if (dashboardFilter === 'FAIL') return exec.result === 'FAIL';
                          if (dashboardFilter === 'PASS') return exec.result === 'PASS';
                          if (dashboardFilter === 'HIGH') return exec.importance === 'HIGH';
                          if (dashboardFilter === 'MEDIUM') return exec.importance === 'MEDIUM';
                          if (dashboardFilter === 'LOW') return exec.importance === 'LOW';
                          if (dashboardFilter === 'CRITICAL') return exec.finding?.riskScore?.level === 'CRITICAL';
                          return true;
                        });

                        if (filteredExecutions.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                선택한 필터 조건에 해당하는 진단 결과가 없습니다.
                              </td>
                            </tr>
                          );
                        }

                        const dashTotalPages = dashboardPageSize > 0 ? Math.max(1, Math.ceil(filteredExecutions.length / dashboardPageSize)) : 1;
                        const dashValidPage = Math.min(Math.max(1, dashboardPage), dashTotalPages);
                        const dashStartIndex = (dashValidPage - 1) * dashboardPageSize;
                        const paginatedExecutions = dashboardPageSize === 0 ? filteredExecutions : filteredExecutions.slice(dashStartIndex, dashStartIndex + dashboardPageSize);

                        return paginatedExecutions.map(exec => {
                          const isFail = exec.result === 'FAIL';
                          const impLabel = exec.importance === 'HIGH' ? '상' : (exec.importance === 'MEDIUM' ? '중' : '하');
                          const score = exec.finding?.riskScore?.score ?? 0;
                          const level = exec.finding?.riskScore?.level ?? '-';
                          const status = exec.finding?.remediationStatus ?? '-';
                          const category = exec.finding?.category || (catalog.testCases || []).find(t => t.id === exec.testCaseId)?.category || 'AI_AGENT';

                          return (
                            <tr
                              key={exec.executionId}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                background: isFail ? 'rgba(239, 68, 68, 0.025)' : 'transparent',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: isFail ? '#dc2626' : 'var(--text-main)' }}>
                                {exec.testCaseId}
                              </td>
                              <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <span style={{
                                  background: 'var(--bg-subtle)',
                                  border: '1px solid var(--border-color)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {category}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  background: impLabel === '상' ? '#fef2f2' : (impLabel === '중' ? '#fffbeb' : '#f0fdf4'),
                                  color: impLabel === '상' ? '#b91c1c' : (impLabel === '중' ? '#b45309' : '#15803d'),
                                  border: impLabel === '상' ? '1px solid #fecaca' : (impLabel === '중' ? '1px solid #fde68a' : '1px solid #bbf7d0')
                                }}>{impLabel}</span>
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: isFail ? '#fef2f2' : '#f0fdf4',
                                  color: isFail ? '#b91c1c' : '#15803d',
                                  border: isFail ? '1px solid #fecaca' : '1px solid #bbf7d0'
                                }}>
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isFail ? '#dc2626' : '#16a34a'
                                  }} />
                                  {isFail ? 'FAIL (취약)' : 'PASS (양호)'}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, color: level === 'CRITICAL' ? '#dc2626' : (level === 'HIGH' ? '#d97706' : 'var(--text-muted)') }}>
                                {level}
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontSize: '0.8rem' }}>
                                {score > 0 ? (
                                  <span style={{ fontWeight: 700, color: '#dc2626' }}>{score}/100</span>
                                ) : (
                                  <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>0/100</span>
                                )}
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                                {status === '-' || !status ? (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>-</span>
                                ) : (
                                  <span style={{
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    background: status === 'RESOLVED' ? '#f0fdf4' : '#fef2f2',
                                    color: status === 'RESOLVED' ? '#16a34a' : '#dc2626',
                                    border: status === 'RESOLVED' ? '1px solid #bbf7d0' : '1px solid #fecaca'
                                  }}>
                                    {status}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => setSelectedEvidence(exec)}
                                  style={{
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Eye size={12} />
                                  증거 보기
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dashboard Pagination Controls */}
              {executions.length > 0 && (() => {
                const filteredExecutions = executions.filter(exec => {
                  if (dashboardFilter === 'ALL') return true;
                  if (dashboardFilter === 'FAIL') return exec.result === 'FAIL';
                  if (dashboardFilter === 'PASS') return exec.result === 'PASS';
                  if (dashboardFilter === 'HIGH') return exec.importance === 'HIGH';
                  if (dashboardFilter === 'MEDIUM') return exec.importance === 'MEDIUM';
                  if (dashboardFilter === 'LOW') return exec.importance === 'LOW';
                  if (dashboardFilter === 'CRITICAL') return exec.finding?.riskScore?.level === 'CRITICAL';
                  return true;
                });
                const dashTotalPages = dashboardPageSize > 0 ? Math.max(1, Math.ceil(filteredExecutions.length / dashboardPageSize)) : 1;
                const dashValidPage = Math.min(Math.max(1, dashboardPage), dashTotalPages);
                const dashStartIndex = (dashValidPage - 1) * dashboardPageSize;
                const dashStartItem = filteredExecutions.length === 0 ? 0 : (dashboardPageSize > 0 ? dashStartIndex + 1 : 1);
                const dashEndItem = dashboardPageSize > 0 ? Math.min(dashStartIndex + dashboardPageSize, filteredExecutions.length) : filteredExecutions.length;

                return (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1.25rem',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        총 <b>{filteredExecutions.length}</b>개 항목 중 {dashboardPageSize === 0 ? `전체 ${filteredExecutions.length}개 표시` : `${dashStartItem}~${dashEndItem}개 표시`}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>보기:</span>
                        <select
                          value={dashboardPageSize}
                          onChange={(e) => {
                            setDashboardPageSize(Number(e.target.value));
                            setDashboardPage(1);
                          }}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={10}>10개씩 보기</option>
                          <option value={20}>20개씩 보기</option>
                          <option value={50}>50개씩 보기</option>
                          <option value={0}>전체 한 번에 보기</option>
                        </select>
                      </div>
                    </div>

                    {dashboardPageSize > 0 && dashTotalPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          onClick={() => setDashboardPage(p => Math.max(1, p - 1))}
                          disabled={dashValidPage <= 1}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: dashValidPage <= 1 ? 'var(--text-dim)' : 'var(--text-main)',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            cursor: dashValidPage <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <ChevronLeft size={13} /> 이전
                        </button>

                        {Array.from({ length: dashTotalPages }, (_, i) => i + 1).map(pageNum => {
                          if (dashTotalPages > 8 && Math.abs(pageNum - dashValidPage) > 2 && pageNum !== 1 && pageNum !== dashTotalPages) {
                            if (pageNum === dashValidPage - 3 || pageNum === dashValidPage + 3) {
                              return <span key={pageNum} style={{ padding: '0 0.15rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setDashboardPage(pageNum)}
                              style={{
                                background: dashValidPage === pageNum ? 'var(--primary)' : 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                color: dashValidPage === pageNum ? '#fff' : 'var(--text-main)',
                                minWidth: '1.9rem',
                                height: '1.8rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.76rem',
                                fontWeight: dashValidPage === pageNum ? 700 : 500,
                                cursor: 'pointer'
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setDashboardPage(p => Math.min(dashTotalPages, p + 1))}
                          disabled={dashValidPage >= dashTotalPages}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: dashValidPage >= dashTotalPages ? 'var(--text-dim)' : 'var(--text-main)',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            cursor: dashValidPage >= dashTotalPages ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          다음 <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: TARGET MANAGEMENT */}
        {activeTab === 'targets' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>보안 진단 타깃 등록소 (Target Registry)</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  점검할 AI Agent 및 인프라 서버의 IP/URL을 등록하고 헬스체크 핑을 관리합니다.
                </p>
              </div>
              <button
                onClick={() => setTargetModal({ open: true, name: '', baseUrl: '', description: '', targetType: 'AI_AGENT', adapterType: 'HTTP' })}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Plus size={16} /> 신규 타깃 등록
              </button>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>ID</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>타깃 명칭</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>유형 (Type)</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Base URL / Endpoint</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>어댑터</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>연결 검증 상태</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>최근 테스트 일시</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>연결 테스트 / 관리</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Server size={38} style={{ margin: '0 auto 0.75rem', opacity: 0.35, display: 'block' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          등록된 점검 대상 에이전트가 없습니다
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                          상단의 <strong>[+ 신규 타깃 등록]</strong> 버튼을 눌러 점검할 AI 에이전트 또는 서버 엔드포인트를 등록해 주세요.<br />
                          (가상 검증 및 데모는 메인 점검 화면의 <strong>내장 샌드박스 모의 환경 (Built-in Sandbox)</strong>을 통해 즉시 안전하게 실행할 수 있습니다.)
                        </div>
                      </td>
                    </tr>
                  ) : (
                    targets.map(t => {
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>#{t.id}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>{t.name}</td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                              {t.targetType || 'AI_AGENT'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            {t.adapterType === 'MOCK' || t.baseUrl === 'mock://internal' ? (
                              <span style={{
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.73rem',
                                fontWeight: 500
                              }}>
                                내장 샌드박스 (URL 불필요)
                              </span>
                            ) : (
                              <span style={{ color: '#0284c7', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem' }}>
                                {t.baseUrl}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem' }}>{t.adapterType}</td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            {(() => {
                              if (t.adapterType === 'MOCK') {
                                return (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700
                                  }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
                                    READY (내장 모드)
                                  </span>
                                );
                              }
                              if (t.status === 'ONLINE') {
                                return (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700
                                  }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                                    정상 연결 (VERIFIED)
                                  </span>
                                );
                              }
                              if (t.status === 'OFFLINE') {
                                return (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    background: '#fef2f2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700
                                  }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
                                    연결 실패 (UNREACHABLE)
                                  </span>
                                );
                              }
                              return (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#f8fafc',
                                  color: '#64748b',
                                  border: '1px solid #e2e8f0',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700
                                }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
                                  미검증 (UNCHECKED)
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {t.lastHealthCheckAt ? new Date(t.lastHealthCheckAt).toLocaleString() : '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}>
                              {t.adapterType === 'MOCK' ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.35rem 0.5rem' }}>
                                  상시 준비
                                </span>
                              ) : (
                                <button
                                  onClick={() => handlePingTarget(t.id)}
                                  style={{
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <Activity size={13} /> 연결 테스트
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditTarget(t)}
                                title="타깃 정보 수정"
                                style={{
                                  background: 'var(--bg-subtle)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-main)',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Edit2 size={13} /> 수정
                              </button>
                              <button
                                onClick={() => handleDeleteTarget(t.id, t.name)}
                                title="타깃 삭제"
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SCHEDULES (정기 점검 스케줄) */}
        {activeTab === 'schedules' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>정기 보안 점검 스케줄 관리</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  요일 및 시각을 지정하여 백엔드 스케줄러가 자동으로 정기 진단을 수행하고 DB에 이력을 누적합니다.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={loadSchedules}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '0.55rem 1rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RefreshCw size={14} /> 새로고침
                </button>
                <button
                  onClick={() => setScheduleModal({ open: true, name: '', targetId: selectedTargetId || '', dayOfWeek: 'MON', timeOfDay: '09:00', adapterName: 'mock' })}
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.55rem 1.2rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Plus size={16} /> 새 스케줄 등록
                </button>
              </div>
            </div>

            {/* Schedule Table */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.75rem',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>스케줄 명칭</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>점검 주기</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>점검 대상 타깃</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>상태</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>최근 실행 일시</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>최근 스캔 ID</th>
                    <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>작업 (즉시 실행 / 관리)</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                        등록된 정기 점검 스케줄이 없습니다. 상단의 <b>[+ 새 스케줄 등록]</b> 버튼을 눌러 스케줄을 추가하세요.
                      </td>
                    </tr>
                  ) : (
                    schedules.map(s => {
                      const dayLabel = DAY_LABELS[s.dayOfWeek] || s.dayOfWeek;
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Clock size={15} color="var(--primary)" />
                              {s.name}
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {dayLabel} {s.timeOfDay}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem' }}>
                            {s.targetName} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({s.adapterName})</span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleSchedule(s.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                background: s.enabled ? '#f0fdf4' : '#f8fafc',
                                color: s.enabled ? '#16a34a' : '#64748b',
                                border: s.enabled ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="클릭하여 활성/일시정지 전환"
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.enabled ? '#16a34a' : '#94a3b8' }} />
                              {s.enabled ? '활성' : '일시정지'}
                            </button>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : '미실행'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {s.lastScanId ? (
                              <span
                                onClick={() => {
                                  selectHistoricalScan(s.lastScanId);
                                  setActiveTab('dashboard');
                                }}
                                style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                title="클릭하여 해당 스캔 결과 열람"
                              >
                                {s.lastScanId}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.45rem' }}>
                              <button
                                onClick={() => handleRunScheduleNow(s.id, s.name)}
                                style={{
                                  background: 'var(--primary)',
                                  border: '1px solid #1d4ed8',
                                  color: '#fff',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                                title="지금 즉시 스케줄 점검 실행"
                              >
                                <Play size={12} fill="#fff" /> 즉시 실행
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(s.id, s.name)}
                                title="스케줄 삭제"
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REMEDIATION & RE-TEST */}
        {activeTab === 'remediation' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>취약점 조치 및 검증 관리</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  식별된 취약점의 개선 조치 이력을 기록하고, 개별 재점검을 통해 조치 결과를 즉시 검증합니다.
                </p>
              </div>
              <button
                onClick={loadFindings}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.55rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RefreshCw size={15} /> 목록 새로고침
              </button>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              {/* Remediation Filter Chips Toolbar */}
              <div style={{
                padding: '0.65rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                  필터 분류:
                </span>
                {[
                  { key: 'ALL', label: `전체 (${findings.length})` },
                  { key: 'OPEN', label: `미조치 OPEN (${findings.filter(f => f.remediationStatus === 'OPEN').length})`, color: '#dc2626' },
                  { key: 'RESOLVED', label: `조치완료 (${findings.filter(f => f.remediationStatus === 'RESOLVED').length})`, color: '#16a34a' },
                  { key: 'CRITICAL', label: `CRITICAL (${findings.filter(f => f.riskScore?.level === 'CRITICAL').length})`, color: '#b91c1c' },
                  { key: 'HIGH', label: `상 HIGH (${findings.filter(f => f.importance === 'HIGH').length})`, color: '#ea580c' },
                  { key: 'MEDIUM', label: `중 MED (${findings.filter(f => f.importance === 'MEDIUM').length})`, color: '#d97706' },
                  { key: 'PROMPT_INJECTION', label: `프롬프트 주입 (${findings.filter(f => f.category === 'PROMPT_INJECTION').length})`, color: '#be123c' },
                  { key: 'SENSITIVE_DATA_LEAKAGE', label: `민감정보 유출 (${findings.filter(f => f.category === 'SENSITIVE_DATA_LEAKAGE').length})`, color: '#b45309' },
                  { key: 'EXCESSIVE_AGENCY', label: `과도한 권한 (${findings.filter(f => f.category === 'EXCESSIVE_AGENCY').length})`, color: '#6d28d9' },
                  { key: 'TOOL_ABUSE', label: `도구 오남용 (${findings.filter(f => f.category === 'TOOL_ABUSE').length})`, color: '#be185d' }
                ].map(chip => {
                  const isActive = remediationFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      onClick={() => {
                        setRemediationFilter(chip.key);
                        setRemediationPage(1);
                      }}
                      style={{
                        padding: '0.22rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.73rem',
                        fontWeight: isActive ? 800 : 600,
                        border: isActive ? `1.5px solid ${chip.color || 'var(--primary)'}` : '1px solid var(--border-color)',
                        background: isActive ? (chip.color ? `${chip.color}18` : 'rgba(99, 102, 241, 0.12)') : 'var(--bg-card)',
                        color: isActive ? (chip.color || 'var(--primary)') : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>FINDING ID</th>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>카테고리</th>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>중요도</th>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>위험도</th>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>증거 요약 (Evidence)</th>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>조치 상태</th>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>조치 이력 (Remediation Note)</th>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>조치 / 재점검</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        검출된 취약점 이력이 없습니다. 먼저 스캔을 실행하세요.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const filteredFindings = findings.filter(f => {
                        if (remediationFilter === 'ALL') return true;
                        if (remediationFilter === 'OPEN') return f.remediationStatus === 'OPEN';
                        if (remediationFilter === 'RESOLVED') return f.remediationStatus === 'RESOLVED';
                        if (remediationFilter === 'CRITICAL') return f.riskScore?.level === 'CRITICAL';
                        if (remediationFilter === 'HIGH') return f.importance === 'HIGH';
                        if (remediationFilter === 'MEDIUM') return f.importance === 'MEDIUM';
                        if (['PROMPT_INJECTION', 'SENSITIVE_DATA_LEAKAGE', 'EXCESSIVE_AGENCY', 'TOOL_ABUSE'].includes(remediationFilter)) {
                          return f.category === remediationFilter;
                        }
                        return true;
                      });

                      if (filteredFindings.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                              선택한 필터 조건에 해당하는 취약점 항목이 없습니다.
                            </td>
                          </tr>
                        );
                      }

                      const remTotalPages = remediationPageSize > 0 ? Math.max(1, Math.ceil(filteredFindings.length / remediationPageSize)) : 1;
                      const remValidPage = Math.min(Math.max(1, remediationPage), remTotalPages);
                      const remStartIndex = (remValidPage - 1) * remediationPageSize;
                      const paginatedFindings = remediationPageSize === 0 ? filteredFindings : filteredFindings.slice(remStartIndex, remStartIndex + remediationPageSize);

                      return paginatedFindings.map(f => {
                        const isResolved = f.remediationStatus === 'RESOLVED';
                        const imp = f.importance === 'HIGH' ? '상' : '중';
                        return (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                              {f.id}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem' }}>
                              <span style={{
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-color)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                color: 'var(--text-muted)'
                              }}>
                                {f.category}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                              <span style={{
                                background: imp === '상' ? '#fef2f2' : '#fffbeb',
                                color: imp === '상' ? '#dc2626' : '#d97706',
                                border: imp === '상' ? '1px solid #fecaca' : '1px solid #fde68a',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap'
                              }}>
                                {imp}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: f.riskScore?.level === 'CRITICAL' ? '#dc2626' : (f.riskScore?.level === 'HIGH' ? '#d97706' : 'var(--text-muted)') }}>
                              {f.riskScore?.level || '-'}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                              {f.evidence}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                              <span style={{
                                background: isResolved ? '#f0fdf4' : '#fef2f2',
                                color: isResolved ? '#15803d' : '#b91c1c',
                                border: isResolved ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                padding: '0.18rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}>
                                <span style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  background: isResolved ? '#16a34a' : '#dc2626'
                                }} />
                                {f.remediationStatus}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', color: isResolved ? 'var(--text-main)' : 'var(--text-dim)' }}>
                              {f.remediationNote || '미조치 상태'}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                <button
                                  onClick={() => setRemediationModal({ open: true, findingId: f.id, note: f.remediationNote || '' })}
                                  style={{
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Edit3 size={11} />
                                  조치 등록
                                </button>
                                <button
                                  onClick={() => handleRetestFinding(f.id)}
                                  disabled={isResolved}
                                  style={{
                                    background: isResolved ? '#f1f5f9' : '#ecfdf5',
                                    color: isResolved ? '#94a3b8' : '#059669',
                                    border: isResolved ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: isResolved ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <RefreshCw size={11} />
                                  Re-Test
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>

              {/* Remediation Pagination Controls */}
              {findings.length > 0 && (() => {
                const filteredFindings = findings.filter(f => {
                  if (remediationFilter === 'ALL') return true;
                  if (remediationFilter === 'OPEN') return f.remediationStatus === 'OPEN';
                  if (remediationFilter === 'RESOLVED') return f.remediationStatus === 'RESOLVED';
                  if (remediationFilter === 'CRITICAL') return f.riskScore?.level === 'CRITICAL';
                  if (remediationFilter === 'HIGH') return f.importance === 'HIGH';
                  if (remediationFilter === 'MEDIUM') return f.importance === 'MEDIUM';
                  if (['PROMPT_INJECTION', 'SENSITIVE_DATA_LEAKAGE', 'EXCESSIVE_AGENCY', 'TOOL_ABUSE'].includes(remediationFilter)) {
                    return f.category === remediationFilter;
                  }
                  return true;
                });
                const remTotalPages = remediationPageSize > 0 ? Math.max(1, Math.ceil(filteredFindings.length / remediationPageSize)) : 1;
                const remValidPage = Math.min(Math.max(1, remediationPage), remTotalPages);
                const remStartIndex = (remValidPage - 1) * remediationPageSize;
                const remStartItem = filteredFindings.length === 0 ? 0 : (remediationPageSize > 0 ? remStartIndex + 1 : 1);
                const remEndItem = remediationPageSize > 0 ? Math.min(remStartIndex + remediationPageSize, filteredFindings.length) : filteredFindings.length;

                return (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1.25rem',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        총 <b>{filteredFindings.length}</b>개 항목 중 {remediationPageSize === 0 ? `전체 ${filteredFindings.length}개 표시` : `${remStartItem}~${remEndItem}개 표시`}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>보기:</span>
                        <select
                          value={remediationPageSize}
                          onChange={(e) => {
                            setRemediationPageSize(Number(e.target.value));
                            setRemediationPage(1);
                          }}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={10}>10개씩 보기</option>
                          <option value={20}>20개씩 보기</option>
                          <option value={50}>50개씩 보기</option>
                          <option value={0}>전체 한 번에 보기</option>
                        </select>
                      </div>
                    </div>

                    {remediationPageSize > 0 && remTotalPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          onClick={() => setRemediationPage(p => Math.max(1, p - 1))}
                          disabled={remValidPage <= 1}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: remValidPage <= 1 ? 'var(--text-dim)' : 'var(--text-main)',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            cursor: remValidPage <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <ChevronLeft size={13} /> 이전
                        </button>

                        {Array.from({ length: remTotalPages }, (_, i) => i + 1).map(pageNum => {
                          if (remTotalPages > 8 && Math.abs(pageNum - remValidPage) > 2 && pageNum !== 1 && pageNum !== remTotalPages) {
                            if (pageNum === remValidPage - 3 || pageNum === remValidPage + 3) {
                              return <span key={pageNum} style={{ padding: '0 0.15rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setRemediationPage(pageNum)}
                              style={{
                                background: remValidPage === pageNum ? 'var(--primary)' : 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                color: remValidPage === pageNum ? '#fff' : 'var(--text-main)',
                                minWidth: '1.9rem',
                                height: '1.8rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.76rem',
                                fontWeight: remValidPage === pageNum ? 700 : 500,
                                cursor: 'pointer'
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setRemediationPage(p => Math.min(remTotalPages, p + 1))}
                          disabled={remValidPage >= remTotalPages}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: remValidPage >= remTotalPages ? 'var(--text-dim)' : 'var(--text-main)',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            cursor: remValidPage >= remTotalPages ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          다음 <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY CATALOG */}
        {activeTab === 'catalog' && (() => {
          const domainCases = catalog.testCases || [];

          // ID 자연 정렬 (TEST-AI-001~016, TEST-AI-SAFE-001)
          const sortedDomainCases = [...domainCases].sort((a, b) =>
            a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
          );

          const isSafeCase = (t) => t.id && t.id.startsWith('TEST-AI-SAFE');

          const allCount = domainCases.length;
          const highCount = domainCases.filter(t => !isSafeCase(t) && t.importance === 'HIGH').length;
          const medCount = domainCases.filter(t => !isSafeCase(t) && t.importance === 'MEDIUM').length;
          const lowCount = domainCases.filter(t => !isSafeCase(t) && t.importance === 'LOW').length;
          const baselineImpCount = domainCases.filter(t => isSafeCase(t)).length;

          const piCount = domainCases.filter(t => t.category === 'PROMPT_INJECTION' && !isSafeCase(t)).length;
          const sdlCount = domainCases.filter(t => t.category === 'SENSITIVE_DATA_LEAKAGE').length;
          const eaCount = domainCases.filter(t => t.category === 'EXCESSIVE_AGENCY' && !isSafeCase(t)).length;
          const taCount = domainCases.filter(t => t.category === 'TOOL_ABUSE').length;
          const baselineCount = domainCases.filter(t => isSafeCase(t)).length;

          const searchLower = catalogSearch.toLowerCase().trim();
          const filteredTestCases = sortedDomainCases.filter(tc => {
            if (catalogImportanceFilter !== 'ALL') {
              if (catalogImportanceFilter === 'BASELINE') {
                if (!isSafeCase(tc)) return false;
              } else if (isSafeCase(tc)) {
                return false;
              } else if (tc.importance !== catalogImportanceFilter) {
                return false;
              }
            }
            if (catalogCategoryFilter !== 'ALL') {
              if (catalogCategoryFilter === 'BASELINE') {
                if (!isSafeCase(tc)) return false;
              } else if (catalogCategoryFilter === 'PROMPT_INJECTION') {
                if (tc.category !== 'PROMPT_INJECTION' || isSafeCase(tc)) return false;
              } else if (catalogCategoryFilter === 'EXCESSIVE_AGENCY') {
                if (tc.category !== 'EXCESSIVE_AGENCY' || isSafeCase(tc)) return false;
              } else if (tc.category !== catalogCategoryFilter) {
                return false;
              }
            }
            if (!searchLower) return true;
            return tc.id.toLowerCase().includes(searchLower) ||
              tc.name.toLowerCase().includes(searchLower) ||
              (tc.description && tc.description.toLowerCase().includes(searchLower)) ||
              (KOREAN_TC_NAMES[tc.id] && KOREAN_TC_NAMES[tc.id].toLowerCase().includes(searchLower)) ||
              tc.attackPrompt.toLowerCase().includes(searchLower) ||
              tc.category.toLowerCase().includes(searchLower) ||
              (isSafeCase(tc) && '정상 동작 검증 baseline'.includes(searchLower));
          });

          const totalPages = catalogPageSize > 0 ? Math.max(1, Math.ceil(filteredTestCases.length / catalogPageSize)) : 1;
          const validPage = Math.min(Math.max(1, catalogPage), totalPages);
          const startIndex = catalogPageSize > 0 ? (validPage - 1) * catalogPageSize : 0;
          const paginatedTestCases = catalogPageSize === 0 ? filteredTestCases : filteredTestCases.slice(startIndex, startIndex + catalogPageSize);
          const allExpanded = paginatedTestCases.length > 0 && paginatedTestCases.every(t => expandedRowIds.has(t.id));

          return (
            <div>
              {/* AI Agent Security Rules Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid #bfdbfe',
                background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
                marginBottom: '1.25rem',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.05)',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '0.6rem',
                    background: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    <Shield size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span>AI 에이전트 지능 보안 카탈로그</span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.55rem',
                        borderRadius: '9999px',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontWeight: 700
                      }}>
                        {allCount}종 표준 규칙 (OWASP Top 10 for LLM 2026)
                      </span>
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0.25rem 0 0 0' }}>
                      프롬프트 주입(PI), 가드레일 우회 탈옥, 과도한 권한(Excessive Agency), API Key/RAG 지식 유출, SSRF, DoS, 다운스트림 XSS, 도구 오남용 침해 진단
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => toggleExpandAll(paginatedTestCases)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {allExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{allExpanded ? '전체 접기' : '전체 펼치기'}</span>
                  </button>

                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="프롬프트 주입, 탈옥, 도구 검색..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                    {catalogSearch && (
                      <button
                        onClick={() => setCatalogSearch('')}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.2rem'
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Badges Toolbar (Category & Importance) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-subtle)',
                borderRadius: '0.65rem',
                border: '1px solid var(--border-color)'
              }}>
                {/* Row 1: 카테고리 필터 */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: '60px' }}>
                    카테고리:
                  </span>
                  
                  {/* 전체 */}
                  <button
                    type="button"
                    onClick={() => { setCatalogCategoryFilter('ALL'); setCatalogPage(1); }}
                    style={{
                      border: catalogCategoryFilter === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: catalogCategoryFilter === 'ALL' ? 'var(--primary)' : 'var(--bg-card)',
                      color: catalogCategoryFilter === 'ALL' ? '#fff' : 'var(--text-main)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: catalogCategoryFilter === 'ALL' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>전체</span>
                    <span style={{
                      opacity: 0.85,
                      fontSize: '0.68rem',
                      background: catalogCategoryFilter === 'ALL' ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px'
                    }}>{allCount}</span>
                  </button>

                  {/* 프롬프트 주입 */}
                  <button
                    type="button"
                    onClick={() => { setCatalogCategoryFilter('PROMPT_INJECTION'); setCatalogPage(1); }}
                    style={{
                      border: catalogCategoryFilter === 'PROMPT_INJECTION' ? '1px solid #fda4af' : '1px solid var(--border-color)',
                      background: catalogCategoryFilter === 'PROMPT_INJECTION' ? '#fff1f2' : 'var(--bg-card)',
                      color: catalogCategoryFilter === 'PROMPT_INJECTION' ? '#be123c' : 'var(--text-main)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: catalogCategoryFilter === 'PROMPT_INJECTION' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#be123c' }}></span>
                    <span>프롬프트 주입</span>
                    <span style={{
                      opacity: 0.85,
                      fontSize: '0.68rem',
                      background: catalogCategoryFilter === 'PROMPT_INJECTION' ? 'rgba(190,18,60,0.12)' : 'var(--bg-subtle)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px'
                    }}>{piCount}</span>
                  </button>

                  {/* 과도한 권한 */}
                  <button
                    type="button"
                    onClick={() => { setCatalogCategoryFilter('EXCESSIVE_AGENCY'); setCatalogPage(1); }}
                    style={{
                      border: catalogCategoryFilter === 'EXCESSIVE_AGENCY' ? '1px solid #c4b5fd' : '1px solid var(--border-color)',
                      background: catalogCategoryFilter === 'EXCESSIVE_AGENCY' ? '#f5f3ff' : 'var(--bg-card)',
                      color: catalogCategoryFilter === 'EXCESSIVE_AGENCY' ? '#6d28d9' : 'var(--text-main)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: catalogCategoryFilter === 'EXCESSIVE_AGENCY' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6d28d9' }}></span>
                    <span>과도한 권한</span>
                    <span style={{
                      opacity: 0.85,
                      fontSize: '0.68rem',
                      background: catalogCategoryFilter === 'EXCESSIVE_AGENCY' ? 'rgba(109,40,217,0.12)' : 'var(--bg-subtle)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px'
                    }}>{eaCount}</span>
                  </button>

                  {/* 민감정보 유출 */}
                  <button
                    type="button"
                    onClick={() => { setCatalogCategoryFilter('SENSITIVE_DATA_LEAKAGE'); setCatalogPage(1); }}
                    style={{
                      border: catalogCategoryFilter === 'SENSITIVE_DATA_LEAKAGE' ? '1px solid #fde047' : '1px solid var(--border-color)',
                      background: catalogCategoryFilter === 'SENSITIVE_DATA_LEAKAGE' ? '#fefce8' : 'var(--bg-card)',
                      color: catalogCategoryFilter === 'SENSITIVE_DATA_LEAKAGE' ? '#b45309' : 'var(--text-main)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: catalogCategoryFilter === 'SENSITIVE_DATA_LEAKAGE' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#b45309' }}></span>
                    <span>민감정보 유출</span>
                    <span style={{
                      opacity: 0.85,
                      fontSize: '0.68rem',
                      background: catalogCategoryFilter === 'SENSITIVE_DATA_LEAKAGE' ? 'rgba(180,83,9,0.12)' : 'var(--bg-subtle)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px'
                    }}>{sdlCount}</span>
                  </button>

                  {/* 도구 오남용 */}
                  <button
                    type="button"
                    onClick={() => { setCatalogCategoryFilter('TOOL_ABUSE'); setCatalogPage(1); }}
                    style={{
                      border: catalogCategoryFilter === 'TOOL_ABUSE' ? '1px solid #f9a8d4' : '1px solid var(--border-color)',
                      background: catalogCategoryFilter === 'TOOL_ABUSE' ? '#fdf2f8' : 'var(--bg-card)',
                      color: catalogCategoryFilter === 'TOOL_ABUSE' ? '#be185d' : 'var(--text-main)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: catalogCategoryFilter === 'TOOL_ABUSE' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#be185d' }}></span>
                    <span>도구 오남용</span>
                    <span style={{
                      opacity: 0.85,
                      fontSize: '0.68rem',
                      background: catalogCategoryFilter === 'TOOL_ABUSE' ? 'rgba(190,24,93,0.12)' : 'var(--bg-subtle)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px'
                    }}>{taCount}</span>
                  </button>

                  {/* 정상 동작 검증 */}
                  <button
                    type="button"
                    onClick={() => { setCatalogCategoryFilter('BASELINE'); setCatalogPage(1); }}
                    style={{
                      border: catalogCategoryFilter === 'BASELINE' ? '1px solid #a7f3d0' : '1px solid var(--border-color)',
                      background: catalogCategoryFilter === 'BASELINE' ? '#ecfdf5' : 'var(--bg-card)',
                      color: catalogCategoryFilter === 'BASELINE' ? '#047857' : 'var(--text-main)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: catalogCategoryFilter === 'BASELINE' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span>
                    <span>정상 동작 검증</span>
                    <span style={{
                      opacity: 0.85,
                      fontSize: '0.68rem',
                      background: catalogCategoryFilter === 'BASELINE' ? 'rgba(5,150,105,0.15)' : 'var(--bg-subtle)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px'
                    }}>{baselineCount}</span>
                  </button>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.1rem 0' }}></div>

                {/* Row 2: 중요도 필터 + 결과 카운트 / 필터 초기화 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: '60px' }}>
                      중요도:
                    </span>
                    
                    {/* ALL */}
                    <button
                      type="button"
                      onClick={() => { setCatalogImportanceFilter('ALL'); setCatalogPage(1); }}
                      style={{
                        border: catalogImportanceFilter === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        background: catalogImportanceFilter === 'ALL' ? 'var(--primary)' : 'var(--bg-card)',
                        color: catalogImportanceFilter === 'ALL' ? '#fff' : 'var(--text-main)',
                        padding: '0.22rem 0.65rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: catalogImportanceFilter === 'ALL' ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span>전체</span>
                      <span style={{
                        opacity: 0.85,
                        fontSize: '0.68rem',
                        background: catalogImportanceFilter === 'ALL' ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '9999px'
                      }}>{allCount}</span>
                    </button>

                    {/* HIGH */}
                    <button
                      type="button"
                      onClick={() => { setCatalogImportanceFilter('HIGH'); setCatalogPage(1); }}
                      style={{
                        border: catalogImportanceFilter === 'HIGH' ? '1px solid #f87171' : '1px solid var(--border-color)',
                        background: catalogImportanceFilter === 'HIGH' ? '#fee2e2' : 'var(--bg-card)',
                        color: catalogImportanceFilter === 'HIGH' ? '#b91c1c' : 'var(--text-main)',
                        padding: '0.22rem 0.65rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: catalogImportanceFilter === 'HIGH' ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }}></span>
                      <span>상 (HIGH)</span>
                      <span style={{
                        opacity: 0.85,
                        fontSize: '0.68rem',
                        background: catalogImportanceFilter === 'HIGH' ? 'rgba(220,38,38,0.15)' : 'var(--bg-subtle)',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '9999px'
                      }}>{highCount}</span>
                    </button>

                    {/* MEDIUM */}
                    <button
                      type="button"
                      onClick={() => { setCatalogImportanceFilter('MEDIUM'); setCatalogPage(1); }}
                      style={{
                        border: catalogImportanceFilter === 'MEDIUM' ? '1px solid #fcd34d' : '1px solid var(--border-color)',
                        background: catalogImportanceFilter === 'MEDIUM' ? '#fef3c7' : 'var(--bg-card)',
                        color: catalogImportanceFilter === 'MEDIUM' ? '#b45309' : 'var(--text-main)',
                        padding: '0.22rem 0.65rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: catalogImportanceFilter === 'MEDIUM' ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}></span>
                      <span>중 (MEDIUM)</span>
                      <span style={{
                        opacity: 0.85,
                        fontSize: '0.68rem',
                        background: catalogImportanceFilter === 'MEDIUM' ? 'rgba(217,119,6,0.15)' : 'var(--bg-subtle)',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '9999px'
                      }}>{medCount}</span>
                    </button>

                    {/* 검증용 (Baseline) */}
                    <button
                      type="button"
                      onClick={() => { setCatalogImportanceFilter('BASELINE'); setCatalogPage(1); }}
                      style={{
                        border: catalogImportanceFilter === 'BASELINE' ? '1px solid #a7f3d0' : '1px solid var(--border-color)',
                        background: catalogImportanceFilter === 'BASELINE' ? '#ecfdf5' : 'var(--bg-card)',
                        color: catalogImportanceFilter === 'BASELINE' ? '#047857' : 'var(--text-main)',
                        padding: '0.22rem 0.65rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: catalogImportanceFilter === 'BASELINE' ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span>
                      <span>검증용 (Baseline)</span>
                      <span style={{
                        opacity: 0.85,
                        fontSize: '0.68rem',
                        background: catalogImportanceFilter === 'BASELINE' ? 'rgba(5,150,105,0.15)' : 'var(--bg-subtle)',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '9999px'
                      }}>{baselineImpCount}</span>
                    </button>

                    {/* LOW */}
                    <button
                      type="button"
                      onClick={() => { setCatalogImportanceFilter('LOW'); setCatalogPage(1); }}
                      style={{
                        border: catalogImportanceFilter === 'LOW' ? '1px solid #86efac' : '1px solid var(--border-color)',
                        background: catalogImportanceFilter === 'LOW' ? '#f0fdf4' : 'var(--bg-card)',
                        color: catalogImportanceFilter === 'LOW' ? '#166534' : 'var(--text-main)',
                        padding: '0.22rem 0.65rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: catalogImportanceFilter === 'LOW' ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                      <span>하 (LOW)</span>
                      <span style={{
                        opacity: 0.85,
                        fontSize: '0.68rem',
                        background: catalogImportanceFilter === 'LOW' ? 'rgba(22,163,74,0.15)' : 'var(--bg-subtle)',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '9999px'
                      }}>{lowCount}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(catalogCategoryFilter !== 'ALL' || catalogImportanceFilter !== 'ALL' || catalogSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCatalogCategoryFilter('ALL');
                          setCatalogImportanceFilter('ALL');
                          setCatalogSearch('');
                          setCatalogPage(1);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.3rem',
                          textDecoration: 'underline'
                        }}
                      >
                        필터 초기화
                      </button>
                    )}
                    <span>총 <b>{filteredTestCases.length}</b>건 표시</span>
                  </div>
                </div>
              </div>

              {/* Catalog Rules Table (Compact by default + Expandable Details) */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', width: '150px', whiteSpace: 'nowrap' }}>TEST ID</th>
                        <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', width: '135px', whiteSpace: 'nowrap' }}>카테고리</th>
                        <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>점검 항목명</th>
                        <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', width: '80px', whiteSpace: 'nowrap' }}>중요도</th>
                        <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', width: '110px', whiteSpace: 'nowrap' }}>상세 보기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTestCases.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                            검색 조건과 일치하는 보안 점검 케이스가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        paginatedTestCases.map(tc => {
                          const isSafe = tc.id && tc.id.startsWith('TEST-AI-SAFE');
                          const imp = isSafe ? '검증용' : (tc.importance === 'HIGH' ? '상' : (tc.importance === 'MEDIUM' ? '중' : '하'));
                          const catBadge = getCategoryBadge(tc.category, tc.id);
                          const domainBadge = getDomainBadge(tc.domain);
                          const koreanTitle = KOREAN_TC_NAMES[tc.id] || tc.name;
                          const isExpanded = expandedRowIds.has(tc.id);

                          return (
                            <React.Fragment key={tc.id}>
                              {/* Compact Master Row */}
                              <tr
                                onClick={() => toggleRowExpanded(tc.id)}
                                style={{
                                  borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                                  background: isExpanded ? 'var(--bg-subtle)' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isExpanded) e.currentTarget.style.background = 'var(--bg-subtle)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isExpanded) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                {/* TEST ID */}
                                <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                    {tc.id}
                                  </div>
                                </td>

                                {/* 카테고리 (Category) */}
                                <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: catBadge.bg,
                                    color: catBadge.color,
                                    border: `1px solid ${catBadge.border}`,
                                    padding: '0.22rem 0.55rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}>
                                    {catBadge.label}
                                  </span>
                                </td>

                                {/* 점검 항목명 (깔끔한 단일 한글명) */}
                                <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.885rem', color: 'var(--text-main)' }}>
                                      {koreanTitle}
                                    </span>
                                  </div>
                                </td>

                                {/* 중요도 (Importance) */}
                                <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    background: isSafe ? '#ecfdf5' : (imp === '상' ? '#fef2f2' : (imp === '중' ? '#fffbeb' : '#f0fdf4')),
                                    color: isSafe ? '#047857' : (imp === '상' ? '#dc2626' : (imp === '중' ? '#d97706' : '#16a34a')),
                                    border: isSafe ? '1px solid #a7f3d0' : (imp === '상' ? '1px solid #fecaca' : (imp === '중' ? '1px solid #fde68a' : '1px solid #bbf7d0')),
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 800
                                  }}>
                                    {imp}
                                  </span>
                                </td>

                                {/* 상세 더보기 드롭다운 토글 버튼 */}
                                <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRowExpanded(tc.id);
                                    }}
                                    style={{
                                      background: isExpanded ? '#eff6ff' : 'var(--bg-subtle)',
                                      border: isExpanded ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
                                      color: isExpanded ? '#1d4ed8' : 'var(--text-main)',
                                      padding: '0.3rem 0.65rem',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span>{isExpanded ? '접기' : '더보기'}</span>
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Details Sub-row */}
                              {isExpanded && (
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                                  <td colSpan={5} style={{ padding: '0.75rem 1.25rem 1.25rem 1.25rem' }}>
                                    <div style={{
                                      background: '#ffffff',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '0.6rem',
                                      padding: '1.25rem',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '1rem',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                    }}>
                                      {/* Classification Metadata */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          background: domainBadge.bg,
                                          color: domainBadge.color,
                                          border: `1px solid ${domainBadge.border}`,
                                          padding: '0.18rem 0.5rem',
                                          borderRadius: '0.375rem',
                                          fontSize: '0.72rem',
                                          fontWeight: 700
                                        }}>
                                          도메인: {domainBadge.label}
                                        </span>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          background: catBadge.bg,
                                          color: catBadge.color,
                                          border: `1px solid ${catBadge.border}`,
                                          padding: '0.18rem 0.5rem',
                                          borderRadius: '0.375rem',
                                          fontSize: '0.72rem',
                                          fontWeight: 600
                                        }}>
                                          카테고리: {catBadge.label}
                                        </span>
                                      </div>

                                      {/* Top Row: Description & Expected Behavior Cards */}
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                                        {/* Description Card */}
                                        <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '0.45rem', padding: '0.75rem 1rem' }}>
                                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                                            점검 목적 및 상세 설명
                                          </div>
                                          <div style={{ fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.55 }}>
                                            {tc.description || '등록된 상세 설명이 없습니다.'}
                                          </div>
                                        </div>

                                        {/* Expected Behavior Card */}
                                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.45rem', padding: '0.75rem 1rem' }}>
                                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <CheckCircle size={13} />
                                            <span>기대 안전 기준 (Safe Baseline)</span>
                                          </div>
                                          <div style={{ fontSize: '0.82rem', color: '#065f46', lineHeight: 1.55 }}>
                                            {tc.expectedSafeBehavior || '정상 보안 기준 충족'}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Bottom Row: Attack Prompt / Command Box */}
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                                            점검 명령 / 공격 프롬프트 페이로드 (Payload)
                                          </div>
                                          <button
                                            onClick={() => {
                                              navigator.clipboard.writeText(tc.attackPrompt);
                                              showToast(`[${tc.id}] 명령어가 복사되었습니다!`, 'success');
                                            }}
                                            style={{
                                              background: '#f8fafc',
                                              border: '1px solid #cbd5e1',
                                              color: '#475569',
                                              borderRadius: '0.375rem',
                                              padding: '0.25rem 0.55rem',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.3rem',
                                              fontSize: '0.72rem',
                                              fontWeight: 600,
                                              transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.color = '#1d4ed8';
                                              e.currentTarget.style.borderColor = '#93c5fd';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.color = '#475569';
                                              e.currentTarget.style.borderColor = '#cbd5e1';
                                            }}
                                          >
                                            <Copy size={12} />
                                            <span>명령어 복사</span>
                                          </button>
                                        </div>

                                        <div style={{
                                          background: '#0f172a',
                                          border: '1px solid #334155',
                                          borderRadius: '0.45rem',
                                          padding: '0.75rem 1rem'
                                        }}>
                                          <code style={{
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                            fontSize: '0.8rem',
                                            color: '#38bdf8',
                                            wordBreak: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.55
                                          }}>
                                            {tc.attackPrompt}
                                          </code>
                                        </div>
                                      </div>

                                      {/* Forbidden Tools & Patterns Badge List */}
                                      {(tc.forbiddenTools?.length > 0 || tc.forbiddenOutputPatterns?.length > 0) && (
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                                          {tc.forbiddenTools?.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                              <span style={{ color: '#dc2626', fontWeight: 600 }}>비인가 금지 도구:</span>
                                              {tc.forbiddenTools.map((tool, tIdx) => (
                                                <span key={tIdx} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.15rem 0.45rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                                  {tool}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {tc.forbiddenOutputPatterns?.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                              <span style={{ color: '#d97706', fontWeight: 600 }}>금지 패턴:</span>
                                              {tc.forbiddenOutputPatterns.map((pat, pIdx) => (
                                                <span key={pIdx} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                                  {pat}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Toolbar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1.25rem',
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  {/* Info and Page Size Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      총 <b>{filteredTestCases.length}</b>개 항목 중 {filteredTestCases.length === 0 ? 0 : (catalogPageSize === 0 ? `전체 ${filteredTestCases.length}` : `${startIndex + 1}~${Math.min(startIndex + catalogPageSize, filteredTestCases.length)}`)}개 표시
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>보기:</span>
                      <select
                        value={catalogPageSize}
                        onChange={(e) => {
                          setCatalogPageSize(Number(e.target.value));
                          setCatalogPage(1);
                        }}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={10}>10개씩 보기</option>
                        <option value={20}>20개씩 보기</option>
                        <option value={50}>50개씩 보기</option>
                        <option value={0}>전체 한 번에 보기</option>
                      </select>
                    </div>
                  </div>

                  {/* Page Navigation Buttons */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
                        disabled={validPage <= 1}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: validPage <= 1 ? 'var(--text-dim)' : 'var(--text-main)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.78rem',
                          cursor: validPage <= 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        <ChevronLeft size={14} /> 이전
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setCatalogPage(pageNum)}
                          style={{
                            background: validPage === pageNum ? 'var(--primary)' : 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: validPage === pageNum ? '#fff' : 'var(--text-main)',
                            minWidth: '2rem',
                            height: '1.9rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            fontWeight: validPage === pageNum ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        onClick={() => setCatalogPage(p => Math.min(totalPages, p + 1))}
                        disabled={validPage >= totalPages}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: validPage >= totalPages ? 'var(--text-dim)' : 'var(--text-main)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.78rem',
                          cursor: validPage >= totalPages ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        다음 <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 5: REPORTS */}
        {activeTab === 'reports' && (
          <div>
            {/* Top Toolbar */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>보안 진단 보고서</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  진단 결과 보고서를 열람하고 PDF, HTML, Markdown 등 다양한 형식으로 내보낼 수 있습니다.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Historical Scan (Date) Selector */}
                {allScans.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.35rem 0.75rem' }}>
                    <Calendar size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>진단 회차:</span>
                    <select
                      value={selectedScanId}
                      onChange={(e) => selectHistoricalScan(e.target.value)}
                      title="진단 보고서 회차(날짜) 선택"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        maxWidth: '280px'
                      }}
                    >
                      {allScans.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          {idx === 0 ? '[최신] ' : ''}
                          {new Date(s.startedAt).toLocaleDateString()} {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Format Toggle */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.25rem', display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={() => setReportFormat('kisa_a4')}
                    style={{
                      background: reportFormat === 'kisa_a4' ? 'var(--primary)' : 'transparent',
                      color: reportFormat === 'kisa_a4' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <FileText size={14} /> 보고서 뷰 (A4)
                  </button>
                  <button
                    onClick={() => setReportFormat('markdown')}
                    style={{
                      background: reportFormat === 'markdown' ? 'var(--primary)' : 'transparent',
                      color: reportFormat === 'markdown' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Code size={14} /> 마크다운 (.md)
                  </button>
                </div>

                {/* Print Button */}
                <button
                  onClick={handlePrintPdf}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Printer size={14} /> PDF / 인쇄
                </button>

                {/* Standalone HTML Download */}
                <button
                  onClick={handleDownloadHtmlReport}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Download size={14} /> HTML
                </button>

                {/* Markdown Download */}
                <button
                  onClick={() => {
                    if (!markdownReport) {
                      showToast('다운로드할 마크다운 보고서가 없습니다. 먼저 스캔을 실행하세요.', 'error');
                      return;
                    }
                    const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Security_Assessment_Report_${executions[0]?.scanId || selectedScanId || 'LATEST'}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('마크다운 파일 다운로드 완료', 'success');
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Download size={14} /> Markdown
                </button>

                {/* Copy Markdown */}
                <button
                  onClick={() => {
                    if (!markdownReport) {
                      showToast('복사할 마크다운 보고서가 없습니다. 먼저 스캔을 실행하세요.', 'error');
                      return;
                    }
                    navigator.clipboard.writeText(markdownReport);
                    showToast('마크다운 보고서가 복사되었습니다!', 'success');
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Copy size={14} /> 복사
                </button>
              </div>
            </div>

            {/* Document Content Area */}
            {executions.length === 0 && !markdownReport ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Shield size={44} color="var(--primary)" style={{ opacity: 0.45, marginBottom: '0.85rem' }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  진단 보고서 데이터가 없습니다
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                  현재 조회할 수 있는 스캔 이력이 없습니다.<br />[진단 대시보드]에서 [보안 스캔 시작]을 실행하여 새로운 진단 보고서를 생성해 주세요.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Play size={15} /> 진단 대시보드로 이동
                </button>
              </div>
            ) : (
              <>
                {reportFormat === 'markdown' && (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    padding: '1.75rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.835rem',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    overflowX: 'auto',
                    maxHeight: '700px'
                  }}>
                    {markdownReport || '마크다운 보고서 데이터가 없습니다. 먼저 스캔을 실행하세요.'}
                  </div>
                )}
                {/* Modern Tech Security Audit Report View */}
                <div id="kisa-official-report" className="kisa-a4-document" style={{ display: reportFormat === 'kisa_a4' ? 'block' : 'none' }}>
                {/* Modern Tech Report Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: '8px', padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={26} />
                    </div>
                    <div>
                      <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                        AgentScanner Security Audit Report
                      </h1>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                        AI Agent & Cloud Infrastructure 통합 보안 진단 보고서
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace', color: '#334155', fontWeight: 700 }}>
                      <span>SCAN ID:</span>
                      <span style={{ color: '#2563eb' }}>{executions[0]?.scanId || selectedScanId || 'LATEST'}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                      진단 일시: {scanDateFormatted}
                    </div>
                  </div>
                </div>

                {/* 3. Assessment Overview Table */}
                <div className="page-break-avoid" style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', borderLeft: '3px solid #2563eb', paddingLeft: '0.5rem' }}>
                    1. 진단 기본 개요 (General Information)
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1' }}>
                    <tbody>
                      <tr>
                        <th style={{ background: '#f8fafc', padding: '0.55rem 0.8rem', width: '18%', border: '1px solid #cbd5e1', color: '#334155' }}>진단 대상 시스템</th>
                        <td style={{ padding: '0.55rem 0.8rem', width: '32%', border: '1px solid #cbd5e1', fontWeight: 600 }}>{scanTargetName}</td>
                        <th style={{ background: '#f8fafc', padding: '0.55rem 0.8rem', width: '18%', border: '1px solid #cbd5e1', color: '#334155' }}>진단 일시</th>
                        <td style={{ padding: '0.55rem 0.8rem', width: '32%', border: '1px solid #cbd5e1' }}>{scanDateFormatted}</td>
                      </tr>
                      <tr>
                        <th style={{ background: '#f8fafc', padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1', color: '#334155' }}>진단 오케스트레이터</th>
                        <td style={{ padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1' }}>AgentScanner Unified Controller v1.0</td>
                        <th style={{ background: '#f8fafc', padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1', color: '#334155' }}>스캔 식별 번호</th>
                        <td style={{ padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700 }}>{executions[0]?.scanId || selectedScanId || 'LATEST'}</td>
                      </tr>
                      <tr>
                        <th style={{ background: '#f8fafc', padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1', color: '#334155' }}>종합 평가 판정</th>
                        <td style={{ padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            background: failCount > 0 ? '#fee2e2' : '#d1fae5',
                            color: failCount > 0 ? '#dc2626' : '#059669',
                            border: failCount > 0 ? '1px solid #f87171' : '1px solid #34d399'
                          }}>
                            {failCount > 0 ? 'FAIL (취약 항목 발견 - 조치 필요)' : 'PASS (기준 준수 양호)'}
                          </span>
                        </td>
                        <th style={{ background: '#f8fafc', padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1', color: '#334155' }}>종합 위험도 수준</th>
                        <td style={{ padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1' }}>
                          <span style={{ fontWeight: 800, color: avgRisk >= 70 ? '#dc2626' : (avgRisk >= 40 ? '#d97706' : '#059669') }}>
                            {avgRisk}점 / 100점 ({avgRisk >= 90 ? 'CRITICAL' : (avgRisk >= 70 ? 'HIGH' : (avgRisk >= 40 ? 'MEDIUM' : 'LOW'))})
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Executive Summary Metrics */}
                <div className="page-break-avoid" style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.65rem', borderLeft: '3px solid #2563eb', paddingLeft: '0.5rem' }}>
                    2. 총괄 점검 결과 요약 (Executive Summary)
                  </h3>

                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>총 점검 항목수</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>{totalCount}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {(() => {
                          const aiCount = executions.filter(e => e.testCaseId?.includes('AI')).length;
                          const infraCount = totalCount - aiCount;
                          return aiCount > 0 && infraCount > 0 ? `AI ${aiCount} + 인프라 ${infraCount}` : `전체 ${totalCount}건 점검`;
                        })()}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.85rem 1rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>취약 항목 (FAIL)</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#dc2626', margin: '0.2rem 0' }}>{failCount}</div>
                      <div style={{ fontSize: '0.68rem', color: '#ef4444' }}>조치 필요 대상</div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem 1rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>양호 항목 (PASS)</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#16a34a', margin: '0.2rem 0' }}>{passCount}</div>
                      <div style={{ fontSize: '0.68rem', color: '#22c55e' }}>보안 기준 충족</div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.85rem 1rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>종합 위험도 점수</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>{avgRisk}점</div>
                      <div style={{ fontSize: '0.68rem', color: '#b45309' }}>100점 만점 기준</div>
                    </div>
                  </div>
                </div>

                {/* 3. Master Assessment Findings Table */}
                <div className="page-break-avoid" style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.65rem', borderLeft: '3px solid #2563eb', paddingLeft: '0.5rem' }}>
                    3. 전체 점검 항목 진단 결과 종합 목록 (Assessment Findings Table)
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #cbd5e1' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '0.45rem 0.55rem', border: '1px solid #cbd5e1', textAlign: 'center', width: '5%', color: '#334155', fontWeight: 700 }}>No.</th>
                        <th style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'left', width: '19%', color: '#334155', fontWeight: 700 }}>TEST CASE ID</th>
                        <th style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'left', width: '18%', color: '#334155', fontWeight: 700 }}>영역 (Category)</th>
                        <th style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', width: '9%', color: '#334155', fontWeight: 700 }}>중요도</th>
                        <th style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', width: '13%', color: '#334155', fontWeight: 700 }}>판정 결과</th>
                        <th style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', width: '13%', color: '#334155', fontWeight: 700 }}>위험도 등급</th>
                        <th style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', width: '11%', color: '#334155', fontWeight: 700 }}>점수</th>
                        <th style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', width: '12%', color: '#334155', fontWeight: 700 }}>조치 상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executions.map((exec, idx) => {
                        const isFail = exec.result === 'FAIL';
                        const impLabel = exec.importance === 'HIGH' ? '상' : (exec.importance === 'MEDIUM' ? '중' : '하');
                        const score = exec.finding?.riskScore?.score ?? 0;
                        const level = exec.finding?.riskScore?.level ?? 'LOW';
                        const status = exec.finding?.remediationStatus ?? '양호';
                        const category = exec.finding?.category || (catalog.testCases || []).find(t => t.id === exec.testCaseId)?.category || 'AI AGENT';

                        return (
                          <tr
                            key={exec.executionId}
                            style={{
                              background: isFail ? 'rgba(239, 68, 68, 0.025)' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')
                            }}
                          >
                            <td style={{ padding: '0.38rem 0.55rem', border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.72rem' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '0.38rem 0.6rem', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700, color: isFail ? '#dc2626' : '#0f172a' }}>
                              {exec.testCaseId}
                            </td>
                            <td style={{ padding: '0.38rem 0.6rem', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.74rem' }}>
                              {category}
                            </td>
                            <td style={{ padding: '0.38rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.12rem 0.45rem',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                background: impLabel === '상' ? '#fef2f2' : (impLabel === '중' ? '#fffbeb' : '#f0fdf4'),
                                color: impLabel === '상' ? '#b91c1c' : (impLabel === '중' ? '#b45309' : '#15803d'),
                                border: impLabel === '상' ? '1px solid #fecaca' : (impLabel === '중' ? '1px solid #fde68a' : '1px solid #bbf7d0')
                              }}>{impLabel}</span>
                            </td>
                            <td style={{ padding: '0.38rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.15rem 0.55rem',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: isFail ? '#fef2f2' : '#f0fdf4',
                                color: isFail ? '#b91c1c' : '#15803d',
                                border: isFail ? '1px solid #fecaca' : '1px solid #bbf7d0'
                              }}>
                                <span style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  background: isFail ? '#dc2626' : '#16a34a'
                                }} />
                                {isFail ? 'FAIL (취약)' : 'PASS (양호)'}
                              </span>
                            </td>
                            <td style={{ padding: '0.38rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, fontSize: '0.74rem', color: level === 'CRITICAL' ? '#dc2626' : (level === 'HIGH' ? '#d97706' : '#475569') }}>
                              {level}
                            </td>
                            <td style={{ padding: '0.38rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.74rem' }}>
                              {score > 0 ? (
                                <span style={{ fontWeight: 700, color: '#dc2626' }}>{score}/100</span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>0/100</span>
                              )}
                            </td>
                            <td style={{ padding: '0.38rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.12rem 0.4rem',
                                borderRadius: '3px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                background: status === 'RESOLVED' ? '#ecfdf5' : (status === 'OPEN' ? '#fee2e2' : '#f1f5f9'),
                                color: status === 'RESOLVED' ? '#047857' : (status === 'OPEN' ? '#b91c1c' : '#475569')
                              }}>{status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 4. Detailed Findings & Recommendations by Domain */}
                <div className="page-break-avoid" style={{ marginBottom: '2.5rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      borderLeft: '3px solid #2563eb',
                      paddingLeft: '0.65rem',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          4. 영역별 세부 취약점 상세 증적 및 조치 방안 (Findings & Evidence)
                        </h3>
                        <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0.3rem 0 0 0' }}>
                          검출된 보안 취약점을 AI 보안 영역(프롬프트 주입, 민감정보 유출, 과도한 권한, 도구 오남용)별로 분류하고, 위험도 순으로 상세 침해 증적 및 기술적 조치 가이드를 제공합니다.
                        </p>
                      </div>
                      <span style={{
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
                        총 {executions.filter(e => e.result === 'FAIL').length}건 취약 식별
                      </span>
                    </div>

                  {executions.filter(e => e.result === 'FAIL').length === 0 ? (
                    <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '4px', color: '#166534', fontSize: '0.84rem', fontWeight: 600 }}>
                      발견된 보안 취약점이 없습니다. 모든 진단 항목이 보안 통제 기준을 충족하고 있습니다.
                    </div>
                  ) : (
                    (() => {
                      const failedExecs = executions.filter(e => e.result === 'FAIL');

                      // Domain Group Configurations (Corporate Audit Style)
                      const domainConfigs = [
                        {
                          id: 'AI_AGENT',
                          prefix: 'AI',
                          title: '인공지능(AI) 에이전트 및 LLM 보안 점검 결과',
                          subtitle: 'AI Agent & LLM Security (OWASP Top 10 for LLM 2026 준용: 프롬프트 주입, 과도한 권한, 자원 고갈 DoS, 민감정보 유출 통제)',
                          matcher: (exec) => {
                            const tc = (catalog.testCases || []).find(t => t.id === exec.testCaseId);
                            return tc?.domain === 'AI_AGENT' || exec.testCaseId?.startsWith('TEST-AI');
                          }
                        },
                        {
                          id: 'OTHER',
                          prefix: 'SEC',
                          title: '기타 보안 점검 결과',
                          subtitle: 'General Security Checks',
                          matcher: () => true
                        }
                      ];

                      // Group items
                      const assigned = new Set();
                      const groups = [];

                      domainConfigs.forEach(conf => {
                        const items = failedExecs.filter(e => !assigned.has(e.executionId) && conf.matcher(e));
                        if (items.length > 0) {
                          items.forEach(e => assigned.add(e.executionId));
                          // Sort within group by riskScore descending (CRITICAL -> HIGH -> MED)
                          items.sort((a, b) => (b.finding?.riskScore?.score ?? 0) - (a.finding?.riskScore?.score ?? 0));
                          groups.push({ ...conf, items });
                        }
                      });

                      return groups.map((group, gIdx) => (
                        <div key={group.id} style={{ marginBottom: '2.5rem' }}>
                          {/* Domain Group Header (Clean Corporate Bar) */}
                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                              <span style={{
                                background: '#0f172a',
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '0.18rem 0.5rem',
                                borderRadius: '4px',
                                letterSpacing: '0.02em'
                              }}>
                                4.{gIdx + 1}
                              </span>
                              <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                  {group.title}
                                </h4>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginTop: '0.15rem' }}>
                                  {group.subtitle}
                                </div>
                              </div>
                            </div>
                            <span style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              color: '#334155',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#dc2626' }} />
                              취약점 {group.items.length}건 검출
                            </span>
                          </div>

                          {/* Detail Cards inside Domain */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {group.items.map((exec, idx) => {
                              const impLabel = exec.importance === 'HIGH' ? '상' : (exec.importance === 'MEDIUM' ? '중' : '하');
                              const finding = exec.finding;
                              const tc = (catalog.testCases || []).find(t => t.id === exec.testCaseId);
                              const score = finding?.riskScore?.score ?? 0;
                              const level = finding?.riskScore?.level ?? 'HIGH';
                              const itemTitle = tc?.name || finding?.category || '보안 취약점';

                              return (
                                <div
                                  key={exec.executionId}
                                  className="page-break-avoid"
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '1.15rem 1.25rem'
                                  }}
                                >
                                  {/* Card Top Title Row */}
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid #f1f5f9',
                                    paddingBottom: '0.65rem',
                                    marginBottom: '0.75rem',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <span style={{
                                        background: '#1e293b',
                                        color: '#ffffff',
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '3px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.02em'
                                      }}>
                                        #{group.prefix}-{String(idx + 1).padStart(2, '0')}
                                      </span>
                                      <span style={{
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        color: '#334155',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        padding: '0.12rem 0.45rem',
                                        borderRadius: '3px'
                                      }}>
                                        {exec.testCaseId}
                                      </span>
                              <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
                                        {itemTitle}
                                      </span>
                                    </div>

                                     {/* Badges on Right */}
                                     <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                       <span style={{
                                         background: impLabel === '상' ? '#fef2f2' : (impLabel === '중' ? '#fffbeb' : '#f8fafc'),
                                         color: impLabel === '상' ? '#b91c1c' : (impLabel === '중' ? '#b45309' : '#475569'),
                                         border: impLabel === '상' ? '1px solid #fecaca' : (impLabel === '중' ? '1px solid #fde68a' : '1px solid #e2e8f0'),
                                         padding: '0.15rem 0.45rem',
                                         borderRadius: '3px',
                                         fontSize: '0.68rem',
                                         fontWeight: 700
                                       }}>
                                         중요도: {impLabel}
                                       </span>
                                       {(() => {
                                         const riskStyles = {
                                           CRITICAL: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#dc2626' },
                                           HIGH: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', dot: '#ea580c' },
                                           MEDIUM: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#d97706' },
                                           LOW: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dot: '#94a3b8' }
                                         };
                                         const rStyle = riskStyles[level] || riskStyles.MEDIUM;
                                         return (
                                           <span style={{
                                             background: rStyle.bg,
                                             color: rStyle.color,
                                             border: `1px solid ${rStyle.border}`,
                                             padding: '0.15rem 0.5rem',
                                             borderRadius: '3px',
                                             fontSize: '0.68rem',
                                             fontWeight: 700,
                                             display: 'inline-flex',
                                             alignItems: 'center',
                                             gap: '0.3rem'
                                           }}>
                                             <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: rStyle.dot }} />
                                             {level} ({score}점)
                                           </span>
                                         );
                                       })()}
                                     </div>
                                   </div>

                                   {/* Test Description / Objective */}
                                   {tc?.description && (
                                     <div style={{
                                       fontSize: '0.74rem',
                                       color: '#475569',
                                       background: '#f8fafc',
                                       padding: '0.45rem 0.75rem',
                                       borderRadius: '4px',
                                       border: '1px solid #e2e8f0',
                                       marginBottom: '0.75rem',
                                       lineHeight: 1.5
                                     }}>
                                       <b style={{ color: '#1e293b' }}>점검 목적 및 기준:</b> {tc.description}
                                     </div>
                                   )}

                                   {/* 1. Attack Prompt / Check Payload */}
                                   {exec.trace?.userPrompt && (
                                     <div style={{ marginBottom: '0.75rem' }}>
                                       <div style={{ fontSize: '0.71rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                         [1] 점검 명령 및 테스트 페이로드 (Test Vector):
                                       </div>
                                       <div style={{
                                         background: '#f8fafc',
                                         borderLeft: '3px solid #94a3b8',
                                         border: '1px solid #e2e8f0',
                                         borderLeftWidth: '3px',
                                         borderRadius: '0 3px 3px 0',
                                         padding: '0.5rem 0.75rem',
                                         fontFamily: 'monospace',
                                         fontSize: '0.74rem',
                                         color: '#1e293b',
                                         wordBreak: 'break-all'
                                       }}>
                                         {exec.trace.userPrompt}
                                       </div>
                                     </div>
                                   )}

                                   {/* 2. Evidence */}
                                   <div style={{ marginBottom: '0.75rem' }}>
                                     <div style={{
                                       fontSize: '0.71rem',
                                       fontWeight: 700,
                                       color: '#b91c1c',
                                       marginBottom: '0.25rem',
                                       display: 'flex',
                                       alignItems: 'center',
                                       gap: '0.35rem'
                                     }}>
                                       <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
                                       [2] 검출된 침해 증적 (Evidence & PoC):
                                     </div>
                                     <div style={{
                                       background: '#fafafa',
                                       borderLeft: '3px solid #ef4444',
                                       border: '1px solid #f1f5f9',
                                       borderLeftWidth: '3px',
                                       borderRadius: '0 3px 3px 0',
                                       padding: '0.55rem 0.75rem',
                                       fontSize: '0.75rem',
                                       color: '#1e293b',
                                       lineHeight: 1.55,
                                       fontWeight: 500
                                     }}>
                                       {finding?.evidence || '보안 정책 위반 탐지'}
                                     </div>
                                   </div>

                                   {/* 3. Recommendation */}
                                   <div>
                                     <div style={{
                                       fontSize: '0.71rem',
                                       fontWeight: 700,
                                       color: '#15803d',
                                       marginBottom: '0.25rem',
                                       display: 'flex',
                                       alignItems: 'center',
                                       gap: '0.35rem'
                                     }}>
                                       <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                                       [3] 기술적 조치 권고사항 (Remediation Guide):
                                     </div>
                                     <div style={{
                                       background: '#fafafa',
                                       borderLeft: '3px solid #10b981',
                                       border: '1px solid #f1f5f9',
                                       borderLeftWidth: '3px',
                                       borderRadius: '0 3px 3px 0',
                                       padding: '0.55rem 0.75rem',
                                       fontSize: '0.75rem',
                                       color: '#1e293b',
                                       lineHeight: 1.55
                                     }}>
                                      {finding?.recommendation || '접근 통제 및 정책 강화'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>

                {/* Modern Audit Footer */}
                <div className="page-break-avoid" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                  <div>
                    <b>AgentScanner Security Platform</b> • AI Agent Runtime & OWASP Top 10 for LLM 2026 준용
                  </div>
                  <div style={{ fontFamily: 'monospace' }}>
                    Automated Assessment Report • {new Date().toLocaleDateString()}
                  </div>
                </div>

              </div>
              </>
            )}
          </div>
        )}

      </main>

      {/* MODAL: Evidence Detail */}
      {selectedEvidence && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem',
            width: '90%', maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>취약점 점검 증거 (Evidence Detail)</div>
              <button onClick={() => setSelectedEvidence(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.25rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: 700 }}>
                  {selectedEvidence.testCaseId}
                </span>
                <span style={{
                  background: selectedEvidence.importance === 'HIGH' ? '#fef2f2' : (selectedEvidence.importance === 'MEDIUM' ? '#fffbeb' : '#f0fdf4'),
                  color: selectedEvidence.importance === 'HIGH' ? '#b91c1c' : (selectedEvidence.importance === 'MEDIUM' ? '#b45309' : '#15803d'),
                  border: selectedEvidence.importance === 'HIGH' ? '1px solid #fecaca' : (selectedEvidence.importance === 'MEDIUM' ? '1px solid #fde68a' : '1px solid #bbf7d0'),
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  중요도: {selectedEvidence.importance === 'HIGH' ? '상' : (selectedEvidence.importance === 'MEDIUM' ? '중' : '하')}
                </span>
                <span style={{
                  background: selectedEvidence.result === 'FAIL' ? '#fef2f2' : '#f0fdf4',
                  color: selectedEvidence.result === 'FAIL' ? '#b91c1c' : '#15803d',
                  border: selectedEvidence.result === 'FAIL' ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: selectedEvidence.result === 'FAIL' ? '#dc2626' : '#16a34a'
                  }} />
                  {selectedEvidence.result === 'FAIL' ? 'FAIL (취약)' : 'PASS (양호)'}
                </span>
              </div>

              {selectedEvidence.trace?.userPrompt && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>공격 프롬프트 / 점검 명령</div>
                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                    {selectedEvidence.trace.userPrompt}
                  </div>
                </div>
              )}

              {selectedEvidence.finding ? (
                <>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginBottom: '0.3rem' }}>검출된 취약점 증거 (Evidence)</div>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.85rem', fontSize: '0.85rem', lineHeight: 1.55, color: '#991b1b' }}>
                      {selectedEvidence.finding.evidence}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginBottom: '0.3rem' }}>보안 조치 권고사항 (Recommendation)</div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.375rem', padding: '0.85rem', fontSize: '0.85rem', lineHeight: 1.55, color: '#166534' }}>
                      {selectedEvidence.finding.recommendation}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: '#166534', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.375rem', fontSize: '0.85rem' }}>
                  이 항목은 보안 기준을 정상 준수하여 취약점이 발견되지 않았습니다 (PASS 양호).
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedEvidence(null)}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Target Registration */}
      {targetModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem',
            width: '90%', maxWidth: '520px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>신규 점검 타깃 등록</div>
              <button onClick={() => setTargetModal({ ...targetModal, open: false })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>타깃 명칭 <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  value={targetModal.name}
                  onChange={(e) => setTargetModal({ ...targetModal, name: e.target.value })}
                  placeholder="예: 사내 고객상담 AI 어시스턴트"
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>어댑터 연동 유형</label>
                <select
                  value={targetModal.adapterType}
                  onChange={(e) => setTargetModal({ ...targetModal, adapterType: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)', fontSize: '0.85rem' }}
                >
                  <option value="HTTP">HTTP (실제 REST API 통신)</option>
                  <option value="MOCK">MOCK (내장 샌드박스 모의 환경)</option>
                </select>
              </div>

              {/* URL 입력창은 HTTP일 때만 노출, MOCK일 때는 친절한 안내 배너 표시 */}
              {targetModal.adapterType === 'HTTP' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    엔드포인트 URL (Base URL) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={targetModal.baseUrl}
                    onChange={(e) => setTargetModal({ ...targetModal, baseUrl: e.target.value })}
                    placeholder="예: http://192.168.1.50:8000 또는 https://api.myagent.ai"
                    style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    점검 대상 AI Agent 또는 서버의 접근 가능한 호스트/포트 URL입니다.
                  </span>
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderLeft: '3px solid var(--primary)',
                  borderRadius: '0.375rem',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.55
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={14} color="var(--primary)" /> 내장 샌드박스(MOCK) 모드
                  </div>
                  별도의 외부 서버나 네트워크 URL 접속 없이, 엔진 내부 시뮬레이터를 통해 모의 보안 진단이 실행되므로 <b>엔드포인트 URL 입력이 필요하지 않습니다.</b>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>타깃 설명</label>
                <input
                  type="text"
                  value={targetModal.description}
                  onChange={(e) => setTargetModal({ ...targetModal, description: e.target.value })}
                  placeholder="예: 고객 문의 응대 및 사내 지식 검색(RAG) 전용 에이전트"
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={() => setTargetModal({ ...targetModal, open: false })}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleCreateTarget}
                style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
              >
                등록 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Target Information Edit */}
      {editTargetModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem',
            width: '90%', maxWidth: '520px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Edit2 size={18} color="var(--primary)" />
                점검 타깃 정보 수정 (#{editTargetModal.id})
              </div>
              <button onClick={() => setEditTargetModal({ ...editTargetModal, open: false })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  타깃 명칭 <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editTargetModal.name}
                  onChange={(e) => setEditTargetModal({ ...editTargetModal, name: e.target.value })}
                  placeholder="예: 사내 고객상담 AI 어시스턴트"
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>어댑터 연동 유형</label>
                <select
                  value={editTargetModal.adapterType}
                  onChange={(e) => setEditTargetModal({ ...editTargetModal, adapterType: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)', fontSize: '0.85rem' }}
                >
                  <option value="HTTP">HTTP (실제 REST API 통신)</option>
                  <option value="MOCK">MOCK (내장 샌드박스 모의 환경)</option>
                </select>
              </div>

              {editTargetModal.adapterType === 'HTTP' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    엔드포인트 URL (Base URL) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editTargetModal.baseUrl}
                    onChange={(e) => setEditTargetModal({ ...editTargetModal, baseUrl: e.target.value })}
                    placeholder="예: http://192.168.1.50:8000 또는 https://api.myagent.ai"
                    style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    URL 변경 시 연결 검증 상태가 초기화되어 재검증(연결 테스트)이 필요합니다.
                  </span>
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderLeft: '3px solid var(--primary)',
                  borderRadius: '0.375rem',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.55
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={14} color="var(--primary)" /> 내장 샌드박스(MOCK) 모드
                  </div>
                  엔진 내부 시뮬레이터로 동작하므로 별도의 외부 엔드포인트 URL이 필요하지 않습니다.
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>타깃 설명</label>
                <input
                  type="text"
                  value={editTargetModal.description}
                  onChange={(e) => setEditTargetModal({ ...editTargetModal, description: e.target.value })}
                  placeholder="예: 고객 문의 응대 및 사내 지식 검색(RAG) 전용 에이전트"
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={() => setEditTargetModal({ ...editTargetModal, open: false })}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleSaveEditTarget}
                style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
              >
                저장 (수정 완료)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Registration */}
      {scheduleModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem',
            width: '90%', maxWidth: '520px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                <Clock size={18} color="var(--primary)" /> 정기 보안 점검 스케줄 등록
              </div>
              <button onClick={() => setScheduleModal({ ...scheduleModal, open: false })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>스케줄 명칭</label>
                <input
                  type="text"
                  value={scheduleModal.name}
                  onChange={(e) => setScheduleModal({ ...scheduleModal, name: e.target.value })}
                  placeholder="예: 주간 AI 가드레일 정기 감사"
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>점검 대상 타깃</label>
                <select
                  value={scheduleModal.targetId}
                  onChange={(e) => setScheduleModal({ ...scheduleModal, targetId: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                >
                  <option value="mock">내장 샌드박스 모의 환경 (Built-in Sandbox)</option>
                  {targets.map(t => (
                    <option key={t.id} value={String(t.id)}>
                      [타깃 #{t.id}] {t.name} ({t.baseUrl})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>반복 요일</label>
                  <select
                    value={scheduleModal.dayOfWeek}
                    onChange={(e) => setScheduleModal({ ...scheduleModal, dayOfWeek: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.8rem', color: 'var(--text-main)' }}
                  >
                    <option value="EVERYDAY">매일 (Daily)</option>
                    <option value="MON">매주 월요일</option>
                    <option value="TUE">매주 화요일</option>
                    <option value="WED">매주 수요일</option>
                    <option value="THU">매주 목요일</option>
                    <option value="FRI">매주 금요일</option>
                    <option value="SAT">매주 토요일</option>
                    <option value="SUN">매주 일요일</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>실행 시각 (24시간)</label>
                  <input
                    type="time"
                    value={scheduleModal.timeOfDay}
                    onChange={(e) => setScheduleModal({ ...scheduleModal, timeOfDay: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.55rem 0.8rem', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Info size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                <span>백엔드 스케줄러가 지정된 요일/시각에 맞춰 백그라운드에서 자동으로 보안 점검을 수행하고 DB에 이력을 누적 보존합니다.</span>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={() => setScheduleModal({ ...scheduleModal, open: false })}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleCreateSchedule}
                style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
              >
                스케줄 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Remediation Note */}
      {remediationModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem',
            width: '90%', maxWidth: '520px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>취약점 [{remediationModal.findingId}] 조치 등록</div>
              <button onClick={() => setRemediationModal({ ...remediationModal, open: false })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                개선 조치 상세 내용 (Remediation Note)
              </label>
              <textarea
                value={remediationModal.note}
                onChange={(e) => setRemediationModal({ ...remediationModal, note: e.target.value })}
                placeholder="취약점에 대해 조치한 설정 변경 내역, 보안 패치, 프롬프트 가드레일 강화 내용을 상세히 기록하세요."
                style={{ width: '100%', minHeight: '120px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.75rem', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={() => setRemediationModal({ ...remediationModal, open: false })}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleSaveRemediation}
                style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
              >
                조치 내용 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert (우측 상단 슬림 카드 및 닫기 버튼 탑재, 본문 가림 방지) */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 2500,
          maxWidth: '420px', minWidth: '280px',
          background: 'var(--bg-card)',
          borderLeft: toast.type === 'success' ? '4px solid #16a34a' : (toast.type === 'error' ? '4px solid #dc2626' : '4px solid #2563eb'),
          borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)',
          padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 500,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
          color: 'var(--text-main)',
          pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
            {toast.type === 'success' ? (
              <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
            ) : toast.type === 'error' ? (
              <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
            ) : (
              <Info size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
            )}
            <span style={{ wordBreak: 'break-word', lineHeight: 1.4, fontSize: '0.825rem' }}>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0,
              borderRadius: '4px'
            }}
            title="닫기"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
