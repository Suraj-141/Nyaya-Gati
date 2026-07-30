import React, { createContext, useContext, useState, useEffect } from 'react';
import { Case, CaseStatus, CaseRemark } from '../types';
import { generateMockCases } from '../data/mockCases';

type Role = 'judge' | 'lawyer' | 'litigant' | null;

interface User {
  role: Role;
  email: string;
  name?: string;  // petitioner name for litigant, display name for others
}

interface Stats {
  totalCases: number;
  disposedThisMonth: number;
  avgResolutionTime: number;
  backlogCount: number;
}

interface MockDbContextType {
  cases: Case[];
  currentUser: User | null;
  stats: Stats;
  login: (email: string, role: Role, name?: string) => void;
  logout: () => void;
  submitPetition: (newCase: Partial<Case>) => Promise<boolean>;
  updateCaseStatus: (caseId: number, status: CaseStatus) => void;
  addRemark: (caseId: number, remark: CaseRemark) => void;
  scheduleHearing: (caseId: number, date: string) => void;
  optimizeQueue: () => Promise<void>;
  isOptimizing: boolean;
  lastOptimized: string | null;
}

const MockDbContext = createContext<MockDbContextType | undefined>(undefined);

export const MockDbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>(() => {
    // Version 4.0: wipe old single-judge/lawyer data, seed multi-user cases
    const CACHE_VERSION = '4.0';
    if (localStorage.getItem('nyaya_cache_version') !== CACHE_VERSION) {
      localStorage.removeItem('nyaya_cases');
      localStorage.removeItem('nyaya_stats');
      localStorage.setItem('nyaya_cache_version', CACHE_VERSION);
    }
    const saved = localStorage.getItem('nyaya_cases');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 5) return parsed;
      } catch (e) {
        console.error('Failed to parse saved cases:', e);
      }
    }
    const initial = generateMockCases();
    localStorage.setItem('nyaya_cases', JSON.stringify(initial));
    return initial;
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nyaya_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimized, setLastOptimized] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats>(() => {
    const saved = localStorage.getItem('nyaya_stats');
    return saved ? JSON.parse(saved) : {
      totalCases: 25,
      disposedThisMonth: 12,
      avgResolutionTime: 14.5,
      backlogCount: 13,
    };
  });

  // Safely merge live backend cases into state without deleting existing cases
  useEffect(() => {
    import('../services/api').then(({ caseAPI }) => {
      caseAPI.getPriorityQueue({ limit: 100 }).then((data) => {
        if (data && data.cases && Array.isArray(data.cases) && data.cases.length > 0) {
          setCases(prev => {
            const caseMap = new Map<string | number, Case>();
            // Keep all current local and mock cases
            prev.forEach(c => caseMap.set(c.id || c.case_number, c));
            // Add live backend cases if not already present
            data.cases.forEach((c: Case) => {
              const key = c.id || c.case_number;
              if (!caseMap.has(key)) {
                caseMap.set(key, c);
              }
            });
            return Array.from(caseMap.values());
          });
        }
      }).catch(err => console.warn("Live case sync skipped:", err));
    });
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('nyaya_cases', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nyaya_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('nyaya_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('nyaya_stats', JSON.stringify(stats));
  }, [stats]);

  // Simulate real-time stats updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        disposedThisMonth: prev.disposedThisMonth + (Math.random() > 0.8 ? 1 : 0),
        backlogCount: prev.backlogCount + (Math.random() > 0.8 ? 1 : 0),
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const login = (email: string, role: Role, name?: string) => {
    setCurrentUser({ email, role, name });
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const submitPetition = async (newCase: Partial<Case>): Promise<boolean> => {
    const { assignJudgeByLoadBalancing, generateCaseSummary } = await import('../services/mlEngine');

    return new Promise((resolve) => {
      setTimeout(() => {
        const meritScore = newCase.merit_score ?? 70;
        const isAccepted = meritScore >= 50;

        // Load-balance: assign to the judge with fewest active cases
        const assignedJudge = assignJudgeByLoadBalancing(cases);

        const fullCase: Case = {
          id: Date.now(),
          case_number: newCase.case_number || `NYG/2026/${Math.floor(10000 + Math.random() * 90000)}`,
          case_type: newCase.case_type || 'civil',
          filing_date: new Date().toISOString().split('T')[0],
          petitioner: newCase.petitioner || { name: 'Unknown' },
          respondent: newCase.respondent || { name: 'Unknown' },
          lawyer_name: currentUser?.email || 'adv.priya@nyaya.in',
          judge_name: assignedJudge,  // 🔀 Load-balanced judge assignment
          status: isAccepted ? CaseStatus.ACCEPTED : CaseStatus.PENDING_REVIEW,
          urgency_score: newCase.urgency_score ?? 85,
          urgency_level: newCase.urgency_level || 'Medium',
          merit_score: meritScore,
          predicted_duration_months: newCase.predicted_duration_months || 12,
          predicted_hearings: newCase.predicted_hearings || 8,
          ai_reasoning: newCase.ai_reasoning || (isAccepted ? 'Case accepted following AI triage.' : 'Flagged for judicial review.'),
          ...newCase,
          judge_name: assignedJudge,  // Ensure judge override is applied last
        };

        // Generate a case-specific AI summary
        fullCase.ai_reasoning = generateCaseSummary(fullCase as any);

        setCases(prev => [fullCase, ...prev]);
        setStats(prev => ({ ...prev, totalCases: prev.totalCases + 1, backlogCount: prev.backlogCount + 1 }));
        resolve(isAccepted);
      }, 500);
    });
  };

  const updateCaseStatus = (caseId: number, status: CaseStatus) => {
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, status } : c));
    setTimeout(() => {
      window.alert(`[Mock SMS / Email Trigger]\nNotification sent to Petitioner/Lawyer:\n"Your case status has been updated to: ${status.replace('_', ' ')}"`);
    }, 500);
  };

  const addRemark = (caseId: number, remark: CaseRemark) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return { ...c, remarks: [...(c.remarks || []), remark] };
      }
      return c;
    }));
  };

  const scheduleHearing = (caseId: number, date: string) => {
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, next_hearing_date: date, status: CaseStatus.SCHEDULED } : c));
    setTimeout(() => {
      window.alert(`[Mock SMS / Email Trigger]\nNotification sent to Petitioner/Lawyer:\n"A hearing for your case has been scheduled on ${date}"`);
    }, 500);
  };

  const optimizeQueue = async () => {
    setIsOptimizing(true);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Sort cases logic happens in the UI component, we just trigger the state
        setIsOptimizing(false);
        setLastOptimized(new Date().toLocaleTimeString());
        resolve();
      }, 3000); // 3 second optimization
    });
  };

  return (
    <MockDbContext.Provider value={{
      cases,
      currentUser,
      stats,
      login,
      logout,
      submitPetition,
      updateCaseStatus,
      addRemark,
      scheduleHearing,
      optimizeQueue,
      isOptimizing,
      lastOptimized
    }}>
      {children}
    </MockDbContext.Provider>
  );
};

export const useMockDb = () => {
  const context = useContext(MockDbContext);
  if (context === undefined) {
    throw new Error('useMockDb must be used within a MockDbProvider');
  }
  return context;
};
