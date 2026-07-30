from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from ortools.sat.python import cp_model
import logging

logger = logging.getLogger(__name__)

class SchedulerService:
    """
    Service to optimize court schedules using Google OR-Tools CP-SAT solver.
    """

    def optimize_daily_schedule(
        self,
        cases: List[Any],
        judges: List[int],
        courtrooms: List[str],
        target_date: date,
        work_start_hour: int = 10,  # 10:00 AM
        work_end_hour: int = 17,    # 05:00 PM
    ) -> List[Dict[str, Any]]:
        """
        Assign cases to (judge, courtroom, time_slot) to maximize priority throughput.
        """
        model = cp_model.CpModel()

        # Constants
        START_TIME_MINS = work_start_hour * 60
        END_TIME_MINS = work_end_hour * 60
        TOTAL_MINS = END_TIME_MINS - START_TIME_MINS
        
        # We assume each case takes a fixed amount of time for the purpose of optimization
        # In a real scenario, this would come from the AI timeline predictor
        CASE_DURATION = 45 # minutes

        # Variables: (case, judge, courtroom) assignment
        # x[c, j, r] = 1 if case c is assigned to judge j in courtroom r
        assignments = {}
        for c in range(len(cases)):
            for j in range(len(judges)):
                for r in range(len(courtrooms)):
                    assignments[(c, j, r)] = model.NewBoolVar(f'assign_c{c}_j{j}_r{r}')

        # Start times for each case (if assigned)
        # s[c] is the start time in minutes from the beginning of the workday
        start_times = {}
        for c in range(len(cases)):
            start_times[c] = model.NewIntVar(0, TOTAL_MINS - CASE_DURATION, f'start_c{c}')

        # ─── Constraints ──────────────────────────────────────────────────────
        
        # 1. Each case can be assigned to at most one (judge, courtroom) pair
        for c in range(len(cases)):
            model.AddAtMostOne(assignments[(c, j, r)] for j in range(len(judges)) for r in range(len(courtrooms)))

        # 2. No overlapping cases for the same judge
        for j in range(len(judges)):
            intervals = []
            for c in range(len(cases)):
                for r in range(len(courtrooms)):
                    # Only create interval if case is assigned to this judge
                    is_assigned = assignments[(c, j, r)]
                    
                    # Create an optional interval variable
                    start = start_times[c]
                    duration = CASE_DURATION
                    end = model.NewIntVar(0, TOTAL_MINS, f'end_c{c}_j{j}')
                    model.Add(end == start + duration)
                    
                    interval = model.NewOptionalIntervalVar(
                        start, duration, end, is_assigned, f'interval_c{c}_j{j}'
                    )
                    intervals.append(interval)
            
            if intervals:
                model.AddNoOverlap(intervals)

        # 3. No overlapping cases in the same courtroom
        for r in range(len(courtrooms)):
            intervals = []
            for c in range(len(cases)):
                for j in range(len(judges)):
                    is_assigned = assignments[(c, j, r)]
                    start = start_times[c]
                    duration = CASE_DURATION
                    end = model.NewIntVar(0, TOTAL_MINS, f'end_c{c}_r{r}')
                    model.Add(end == start + duration)
                    
                    interval = model.NewOptionalIntervalVar(
                        start, duration, end, is_assigned, f'interval_c{c}_r{r}'
                    )
                    intervals.append(interval)
            
            if intervals:
                model.AddNoOverlap(intervals)

        # ─── Objective ────────────────────────────────────────────────────────
        
        # Maximize the sum of urgency scores of assigned cases
        # We multiply urgency_score by assignment to prioritize high-urgency cases
        objective_terms = []
        for c in range(len(cases)):
            case_urgency = int(getattr(cases[c], 'urgency_score', 100))
            for j in range(len(judges)):
                for r in range(len(courtrooms)):
                    objective_terms.append(assignments[(c, j, r)] * case_urgency)
        
        model.Maximize(sum(objective_terms))

        # ─── Solver ───────────────────────────────────────────────────────────
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10.0
        status = solver.Solve(model)

        results = []
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            for c in range(len(cases)):
                for j in range(len(judges)):
                    for r in range(len(courtrooms)):
                        if solver.Value(assignments[(c, j, r)]):
                            start_min = solver.Value(start_times[c])
                            start_dt = datetime.combine(target_date, datetime.min.time()) + timedelta(minutes=START_TIME_MINS + start_min)
                            end_dt = start_dt + timedelta(minutes=CASE_DURATION)
                            
                            results.append({
                                "case_id": cases[c].id,
                                "judge_id": judges[j],
                                "courtroom": courtrooms[r],
                                "start_time": start_dt,
                                "end_time": end_dt,
                                "urgency_score": getattr(cases[c], 'urgency_score', 0)
                            })
        
        logger.info(f"Scheduling optimization status: {solver.StatusName(status)}. Scheduled {len(results)} cases.")
        return results
