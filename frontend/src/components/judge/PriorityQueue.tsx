import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, Clock, Scale, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { caseAPI } from '../../services/api';
import { Case, CaseType } from '../../types';
import CaseDetailModal from './CaseDetailModal';
import OverrideModal from './OverrideModal';

interface PriorityQueueProps {
  judgeId: number;
}

const PriorityQueue: React.FC<PriorityQueueProps> = ({ judgeId }) => {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    caseType: '' as CaseType | '',
    minUrgency: 0,
    searchQuery: ''
  });
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideCase, setOverrideCase] = useState<Case | null>(null);

  const queryClient = useQueryClient();

  // Fetch priority queue
  const { data: queueData, isLoading, error } = useQuery({
    queryKey: ['priorityQueue', filters],
    queryFn: () => caseAPI.getPriorityQueue({
      limit: 50,
      minUrgency: filters.minUrgency || undefined,
      caseType: filters.caseType || undefined,
      searchQuery: filters.searchQuery || undefined
    }),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Override priority mutation
  const overrideMutation = useMutation({
    mutationFn: ({ caseId, newScore, reason }: { caseId: number; newScore: number; reason: string }) =>
      caseAPI.overridePriority(caseId, newScore, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priorityQueue'] });
      setShowOverrideModal(false);
      setOverrideCase(null);
    }
  });

  // Handle drag end (manual reordering)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Find the case being moved
      const movedCase = queueData?.cases.find(c => c.id === active.id);
      const targetCase = queueData?.cases.find(c => c.id === over.id);
      
      if (movedCase && targetCase) {
        // Open override modal to get reason
        setOverrideCase(movedCase);
        setShowOverrideModal(true);
      }
    }
  };

  // Get urgency color
  const getUrgencyColor = (case_: Case) => {
    const ageInYears = (new Date().getTime() - new Date(case_.filing_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (case_.urgency_score > 150 && ageInYears > 3) {
      return 'bg-red-50 border-red-300';
    } else if (case_.urgency_score > 100) {
      return 'bg-yellow-50 border-yellow-300';
    } else {
      return 'bg-green-50 border-green-300';
    }
  };

  // Get merit badge color
  const getMeritBadge = (score: number) => {
    if (score >= 85) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">HIGH</span>;
    } else if (score >= 50) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">MEDIUM</span>;
    } else {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">LOW</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading priority queue: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Scale className="mr-2 h-6 w-6 text-blue-600" />
            Priority Queue
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-semibold">Total Pending</p>
            <p className="text-3xl font-bold text-blue-900">{queueData?.total_count || 0}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-semibold">High Urgency</p>
            <p className="text-3xl font-bold text-red-900">{queueData?.high_urgency_count || 0}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-semibold">Low Merit (Frivolous)</p>
            <p className="text-3xl font-bold text-yellow-900">{queueData?.low_merit_count || 0}</p>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Case Type</label>
              <select
                value={filters.caseType}
                onChange={(e) => setFilters({ ...filters, caseType: e.target.value as CaseType | '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="criminal">Criminal</option>
                <option value="civil">Civil</option>
                <option value="family">Family</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Urgency Score</label>
              <input
                type="number"
                value={filters.minUrgency}
                onChange={(e) => setFilters({ ...filters, minUrgency: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0-200"
                min="0"
                max="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Case number or party name"
              />
            </div>
          </div>
        )}
      </div>

      {/* Case list with drag-and-drop */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={queueData?.cases.map(c => c.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {queueData?.cases.map((case_, index) => (
              <SortableCaseCard
                key={case_.id}
                case_={case_}
                index={index}
                onViewDetails={setSelectedCase}
                onOverride={(c) => {
                  setOverrideCase(c);
                  setShowOverrideModal(true);
                }}
                getUrgencyColor={getUrgencyColor}
                getMeritBadge={getMeritBadge}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modals */}
      {selectedCase && (
        <CaseDetailModal
          case_={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}

      {showOverrideModal && overrideCase && (
        <OverrideModal
          case_={overrideCase}
          onSubmit={(newScore, reason) => {
            overrideMutation.mutate({
              caseId: overrideCase.id,
              newScore,
              reason
            });
          }}
          onClose={() => {
            setShowOverrideModal(false);
            setOverrideCase(null);
          }}
          isLoading={overrideMutation.isPending}
        />
      )}
    </div>
  );
};

// Sortable case card component
interface SortableCaseCardProps {
  case_: Case;
  index: number;
  onViewDetails: (case_: Case) => void;
  onOverride: (case_: Case) => void;
  getUrgencyColor: (case_: Case) => string;
  getMeritBadge: (score: number) => React.ReactNode;
}

const SortableCaseCard: React.FC<SortableCaseCardProps> = ({
  case_,
  index,
  onViewDetails,
  onOverride,
  getUrgencyColor,
  getMeritBadge
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: case_.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const caseAge = Math.floor(
    (new Date().getTime() - new Date(case_.filing_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border-2 ${getUrgencyColor(case_)} p-4 hover:shadow-lg transition cursor-move`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
            <h3 className="font-semibold text-lg text-gray-900">{case_.case_number}</h3>
            {getMeritBadge(case_.merit_score || 50)}
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded uppercase">
              {case_.case_type}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            <strong>Petitioner:</strong> {case_.petitioner.name} <strong>vs</strong> <strong>Respondent:</strong> {case_.respondent.name}
          </p>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Urgency Score</p>
              <p className="font-bold text-lg text-red-600">{case_.urgency_score?.toFixed(1) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Merit Score</p>
              <p className="font-bold text-lg">{case_.merit_score?.toFixed(0) || 'N/A'}/100</p>
            </div>
            <div>
              <p className="text-gray-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Case Age
              </p>
              <p className="font-bold">{caseAge} days</p>
            </div>
            <div>
              <p className="text-gray-500">Predicted Duration</p>
              <p className="font-bold">{case_.predicted_duration_months || 'N/A'} months</p>
            </div>
          </div>

          {/* Explanation preview */}
          {case_.urgency_explanation && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              {case_.urgency_explanation.substring(0, 100)}...
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(case_);
            }}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            View Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOverride(case_);
            }}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition"
          >
            Override Priority
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriorityQueue;
